import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { parseComplaint, predictUrgency } from "./services/mlClient";
import { CHIEF_COMPLAINTS, RESOURCES, URGENCY_CONFIG, auditLog, beds, getStats, patientQueue, shiftStats, vitalsHistory } from "./services/state";
import { Patient, UrgencyLevel, Vitals } from "./types";

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const users: Array<{ id: string; email: string; name: string; role: string }> = [];
const channels: Array<{ id: string; name: string; members: string[]; messages: Array<{ id: string; user_id: string; text: string; created_at: string }> }> = [];
const incidents: Array<{ id: string; title: string; zone: string; priority: string; status: string; created_at: string }> = [];

const getAgeGroup = (age: number): Patient["age_group"] => {
  if (age <= 1) return "infant";
  if (age <= 12) return "child";
  if (age >= 65) return "geriatric";
  return "adult";
};

const sepsisRisk = (data: any) => {
  const reasons: string[] = [];
  if (data.temperature >= 38.5) reasons.push("Fever");
  if (data.heart_rate >= 110) reasons.push("Tachycardia");
  if (data.respiratory_rate >= 22) reasons.push("Tachypnea");
  if (data.systolic_bp <= 100) reasons.push("Low systolic BP");
  return { flag: reasons.length >= 2, reasons };
};

const painValidator = (painScore: number, vitals: Vitals) => {
  let physiologicalSeverity = 0;
  if (vitals.heart_rate > 120) physiologicalSeverity += 2;
  if (vitals.systolic_bp < 100) physiologicalSeverity += 2;
  if (vitals.oxygen_saturation < 92) physiologicalSeverity += 3;
  if (vitals.heart_rate > 100) physiologicalSeverity += 1;

  let message: string | null = null;
  let inconsistency = false;
  if (painScore <= 3 && physiologicalSeverity >= 4) {
    inconsistency = true;
    message = "Pain appears underreported for current vital-sign severity.";
  } else if (painScore >= 8 && physiologicalSeverity === 0) {
    message = "High pain reported despite stable vitals; reassess clinically.";
  }

  return { inconsistency, message, physiological_score: physiologicalSeverity };
};

const buildPatient = (data: any, urgencyLevel: UrgencyLevel, confidence: number, explanation: string[]) => {
  const sepsis = sepsisRisk(data);
  const urgency = URGENCY_CONFIG[urgencyLevel];
  const vitals: Vitals = {
    heart_rate: data.heart_rate,
    systolic_bp: data.systolic_bp,
    diastolic_bp: data.diastolic_bp,
    temperature: data.temperature,
    oxygen_saturation: data.oxygen_saturation,
    respiratory_rate: data.respiratory_rate,
    pain_score: data.pain_score
  };

  const patient: Patient = {
    id: uuidv4().slice(0, 8).toUpperCase(),
    name: data.name || "Anonymous",
    age: data.age,
    age_group: getAgeGroup(data.age ?? 30),
    chief_complaint: CHIEF_COMPLAINTS[data.chief_complaint] || "Unknown",
    urgency_level: urgencyLevel,
    urgency_label: urgency.label,
    urgency_color: urgency.color,
    urgency_description: urgency.description,
    max_wait: urgency.max_wait,
    confidence,
    uncertain: confidence < 70,
    resources_needed: RESOURCES[urgencyLevel],
    explanation,
    sepsis_flag: sepsis.flag,
    sepsis,
    pain_check: painValidator(data.pain_score ?? 0, vitals),
    vitals,
    arrival_time: new Date().toLocaleTimeString("en-GB", { hour12: false }),
    arrival_timestamp: new Date().toISOString(),
    status: "waiting",
    overridden: false,
    override_reason: null,
    source: data.source || "er"
  };
  return patient;
};

const analyzeTrend = (patientId: string) => {
  const history = vitalsHistory[patientId] || [];
  if (history.length < 2) return { deteriorating: false, signals: [] as string[] };
  const first = history[0];
  const latest = history[history.length - 1];
  const signals: string[] = [];
  if ((latest.oxygen_saturation ?? 100) < (first.oxygen_saturation ?? 100) - 3) signals.push("SpO2 dropping");
  if ((latest.heart_rate ?? 80) > (first.heart_rate ?? 80) + 15) signals.push("Heart rate rising");
  if ((latest.systolic_bp ?? 120) < (first.systolic_bp ?? 120) - 15) signals.push("BP dropping");
  if ((latest.respiratory_rate ?? 16) > (first.respiratory_rate ?? 16) + 5) signals.push("Respiratory rate rising");
  return { deteriorating: signals.length >= 2, signals };
};

const emitQueue = () => io.emit("queue_update", { queue: patientQueue, stats: getStats() });

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "backend" }));

app.post("/api/auth/register", (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const name = String(req.body?.name || "User");
  if (!email) return res.status(400).json({ success: false, error: "email_required" });
  if (users.some((u) => u.email === email)) return res.status(409).json({ success: false, error: "email_exists" });
  const user = { id: uuidv4(), email, name, role: "coordinator" };
  users.push(user);
  res.json({ success: true, user });
});

app.post("/api/auth/login", (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const user = users.find((u) => u.email === email);
  if (!user) return res.status(401).json({ success: false, error: "invalid_credentials" });
  res.json({ success: true, token: `dev-token-${user.id}`, user });
});

app.post("/api/auth/logout", (_req, res) => {
  res.json({ success: true });
});

app.get("/api/patients", (_req, res) => {
  res.json({ success: true, patients: patientQueue });
});

app.get("/api/patients/:id", (req, res) => {
  const patient = patientQueue.find((p) => p.id === req.params.id);
  if (!patient) return res.status(404).json({ success: false, error: "patient_not_found" });
  res.json({ success: true, patient });
});

app.post("/api/parse-complaint", async (req, res) => {
  const text = String(req.body?.text || "");
  const result = await parseComplaint(text);
  res.json({ success: true, result });
});

app.post("/api/triage", async (req, res) => {
  try {
    const data = req.body || {};
    const prediction = await predictUrgency(data);
    const patient = buildPatient(
      data,
      Math.max(0, Math.min(3, prediction.urgency_level)) as UrgencyLevel,
      Math.round(prediction.confidence * 10) / 10,
      prediction.explanation || []
    );

    patientQueue.push(patient);
    patientQueue.sort((a, b) => a.urgency_level - b.urgency_level);
    vitalsHistory[patient.id] = [{ ...patient.vitals, timestamp: new Date().toISOString() }];

    shiftStats.total += 1;
    if (patient.urgency_level === 0) shiftStats.immediate += 1;
    if (patient.urgency_level === 1) shiftStats.urgent += 1;
    if (patient.urgency_level === 2) shiftStats.less_urgent += 1;
    if (patient.urgency_level === 3) shiftStats.non_urgent += 1;
    if (patient.sepsis_flag) shiftStats.sepsis_flags += 1;

    auditLog.push({
      timestamp: new Date().toISOString(),
      patient_id: patient.id,
      patient_name: patient.name,
      action: "triage",
      urgency_level: patient.urgency_level,
      urgency_label: patient.urgency_label,
      confidence: patient.confidence,
      overridden: false,
      sepsis_flag: patient.sepsis_flag
    });

    emitQueue();
    res.json({ success: true, patient });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "triage_failed" });
  }
});

app.post("/api/ambulance/pretriage", async (req, res) => {
  const data = { ...(req.body || {}), source: "ambulance", arrival_mode: 1 };
  const prediction = await predictUrgency(data);
  const urgency = Math.max(0, Math.min(3, prediction.urgency_level)) as UrgencyLevel;
  const preAlert = {
    id: `AMB-${uuidv4().slice(0, 6).toUpperCase()}`,
    patient_name: data.name || "Incoming Patient",
    age: data.age,
    eta_minutes: data.eta_minutes || 5,
    urgency_level: urgency,
    urgency_label: URGENCY_CONFIG[urgency].label,
    urgency_color: URGENCY_CONFIG[urgency].color,
    resources_needed: RESOURCES[urgency],
    sepsis_flag: sepsisRisk(data).flag,
    confidence: prediction.confidence,
    vitals: data,
    timestamp: new Date().toISOString()
  };
  io.emit("ambulance_incoming", preAlert);
  res.json({ success: true, pre_alert: preAlert });
});

app.post("/api/mass-casualty", async (req, res) => {
  const patients = Array.isArray(req.body?.patients) ? req.body.patients : [];
  const results: Patient[] = [];

  for (const record of patients) {
    const prediction = await predictUrgency(record);
    const patient = buildPatient(
      { ...record, source: "mass_casualty" },
      Math.max(0, Math.min(3, prediction.urgency_level)) as UrgencyLevel,
      prediction.confidence,
      prediction.explanation || []
    );
    patientQueue.push(patient);
    vitalsHistory[patient.id] = [{ ...patient.vitals, timestamp: new Date().toISOString() }];
    results.push(patient);
  }

  patientQueue.sort((a, b) => a.urgency_level - b.urgency_level);
  shiftStats.total += results.length;
  shiftStats.mass_casualty += 1;
  emitQueue();

  res.json({
    success: true,
    processed: results.length,
    results,
    summary: {
      immediate: results.filter((r) => r.urgency_level === 0).length,
      urgent: results.filter((r) => r.urgency_level === 1).length,
      less_urgent: results.filter((r) => r.urgency_level === 2).length,
      non_urgent: results.filter((r) => r.urgency_level === 3).length
    }
  });
});

app.get("/api/queue", (_req, res) => res.json({ success: true, queue: patientQueue, stats: getStats() }));
app.get("/api/queue/:id", (req, res) => {
  const patient = patientQueue.find((p) => p.id === req.params.id);
  if (!patient) return res.status(404).json({ success: false, error: "queue_item_not_found" });
  res.json({ success: true, queue_item: patient });
});
app.patch("/api/queue/:id/status", (req, res) => {
  const patient = patientQueue.find((p) => p.id === req.params.id);
  if (!patient) return res.status(404).json({ success: false, error: "queue_item_not_found" });
  const status = String(req.body?.status || "waiting") as Patient["status"];
  patient.status = status;
  emitQueue();
  res.json({ success: true, queue_item: patient });
});

app.get("/api/incidents", (_req, res) => res.json({ success: true, incidents }));
app.post("/api/incidents", (req, res) => {
  const incident = {
    id: uuidv4(),
    title: String(req.body?.title || "Unknown Incident"),
    zone: String(req.body?.zone || "zone-1"),
    priority: String(req.body?.priority || "high"),
    status: "open",
    created_at: new Date().toISOString()
  };
  incidents.push(incident);
  io.emit("incident:dispatch", incident);
  res.json({ success: true, incident });
});
app.get("/api/incidents/:id", (req, res) => {
  const incident = incidents.find((i) => i.id === req.params.id);
  if (!incident) return res.status(404).json({ success: false, error: "incident_not_found" });
  res.json({ success: true, incident });
});

app.post("/api/channels", (req, res) => {
  const channel = {
    id: uuidv4(),
    name: String(req.body?.name || "general"),
    members: [] as string[],
    messages: [] as Array<{ id: string; user_id: string; text: string; created_at: string }>
  };
  channels.push(channel);
  res.json({ success: true, channel });
});
app.get("/api/channels/:id", (req, res) => {
  const channel = channels.find((c) => c.id === req.params.id);
  if (!channel) return res.status(404).json({ success: false, error: "channel_not_found" });
  res.json({ success: true, channel });
});
app.get("/api/channels/:id/messages", (req, res) => {
  const channel = channels.find((c) => c.id === req.params.id);
  if (!channel) return res.status(404).json({ success: false, error: "channel_not_found" });
  res.json({ success: true, messages: channel.messages });
});
app.post("/api/channels/:id/messages", (req, res) => {
  const channel = channels.find((c) => c.id === req.params.id);
  if (!channel) return res.status(404).json({ success: false, error: "channel_not_found" });
  const message = {
    id: uuidv4(),
    user_id: String(req.body?.user_id || "unknown"),
    text: String(req.body?.text || ""),
    created_at: new Date().toISOString()
  };
  channel.messages.push(message);
  io.emit("message:received", { channel_id: channel.id, message });
  res.json({ success: true, message });
});
app.post("/api/channels/:id/members", (req, res) => {
  const channel = channels.find((c) => c.id === req.params.id);
  if (!channel) return res.status(404).json({ success: false, error: "channel_not_found" });
  const userId = String(req.body?.user_id || "");
  if (userId && !channel.members.includes(userId)) channel.members.push(userId);
  io.emit("user:joined-channel", { channel_id: channel.id, user_id: userId });
  res.json({ success: true, members: channel.members });
});
app.get("/api/beds", (_req, res) => res.json({ success: true, beds }));
app.get("/api/audit", (_req, res) => res.json({ success: true, log: [...auditLog].reverse() }));

app.post("/api/beds/update", (req, res) => {
  const bedType = req.body?.type as keyof typeof beds;
  const action = req.body?.action;
  if (bedType in beds) {
    if (action === "occupy" && beds[bedType].occupied < beds[bedType].total) beds[bedType].occupied += 1;
    if (action === "free" && beds[bedType].occupied > 0) beds[bedType].occupied -= 1;
  }
  io.emit("bed_update", beds);
  res.json({ success: true, beds });
});

app.post("/api/override", (req, res) => {
  const pid = String(req.body?.patient_id || "");
  const newLevel = Number(req.body?.new_urgency_level) as UrgencyLevel;
  const reason = String(req.body?.reason || "Clinical judgment");
  const patient = patientQueue.find((p) => p.id === pid);
  if (!patient) return res.status(404).json({ success: false, error: "patient_not_found" });

  patient.urgency_level = newLevel;
  patient.urgency_label = URGENCY_CONFIG[newLevel].label;
  patient.urgency_color = URGENCY_CONFIG[newLevel].color;
  patient.overridden = true;
  patient.override_reason = reason;
  patientQueue.sort((a, b) => a.urgency_level - b.urgency_level);

  shiftStats.overrides += 1;
  auditLog.push({
    timestamp: new Date().toISOString(),
    patient_id: patient.id,
    patient_name: patient.name,
    action: "override",
    urgency_level: patient.urgency_level,
    urgency_label: patient.urgency_label,
    confidence: null,
    overridden: true,
    sepsis_flag: false,
    note: reason
  });
  emitQueue();
  res.json({ success: true });
});

app.post("/api/discharge", (req, res) => {
  const pid = String(req.body?.patient_id || "");
  const index = patientQueue.findIndex((p) => p.id === pid);
  if (index >= 0) patientQueue.splice(index, 1);
  emitQueue();
  res.json({ success: true });
});

app.post("/api/vitals/update", (req, res) => {
  const patientId = String(req.body?.patient_id || "");
  const vitals = req.body?.vitals as Vitals;
  const patient = patientQueue.find((p) => p.id === patientId);
  if (!patient) return res.status(404).json({ success: false, error: "patient_not_found" });

  if (!vitalsHistory[patientId]) vitalsHistory[patientId] = [];
  vitalsHistory[patientId].push({ ...vitals, timestamp: new Date().toISOString() });
  patient.vitals = { ...patient.vitals, ...vitals };
  const trend = analyzeTrend(patientId);

  let upgraded = false;
  if (trend.deteriorating && patient.urgency_level > 0) {
    patient.urgency_level = (patient.urgency_level - 1) as UrgencyLevel;
    patient.urgency_label = URGENCY_CONFIG[patient.urgency_level].label;
    patient.urgency_color = URGENCY_CONFIG[patient.urgency_level].color;
    patientQueue.sort((a, b) => a.urgency_level - b.urgency_level);
    upgraded = true;
    io.emit("patient_upgraded", { patient_id: patientId, new_urgency: patient.urgency_level });
  }

  emitQueue();
  res.json({ success: true, trend, upgraded });
});

app.get("/api/vitals/history/:patientId", (req, res) => {
  const history = vitalsHistory[req.params.patientId] || [];
  const trend = history.length >= 2 ? analyzeTrend(req.params.patientId) : { deteriorating: false, signals: [] };
  res.json({ success: true, history, trend });
});

app.post("/api/handover", (_req, res) => {
  // Kept JSON for now; frontend can still export custom reports if needed.
  res.json({ success: true, queue: patientQueue, shift_stats: shiftStats, generated_at: new Date().toISOString() });
});

const port = Number(process.env.PORT || 3000);
server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${port}`);
});
