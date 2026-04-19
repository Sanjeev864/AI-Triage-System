import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import PatientForm from "./components/PatientForm";
import PatientQueue from "./components/PatientQueue";
import DetailPanel from "./components/DetailPanel";
import BedManagement from "./components/BedManagement";
import AuditLog from "./components/AuditLog";
import MassCasualty from "./components/MassCasualty";
import AmbulancePreTriage from "./components/AmbulancePreTriage";
import ShiftHandover from "./components/ShiftHandover";
import VitalsTrend from "./components/VitalsTrend";

const API = "http://localhost:5000";
const socket = io(API, { transports: ["websocket"] });

const TABS = [
  { id: "queue",    label: "Live Queue" },
  { id: "ambulance",label: "Ambulance" },
  { id: "mass",     label: "Mass Casualty" },
  { id: "beds",     label: "Beds" },
  { id: "audit",    label: "Audit Log" },
  { id: "handover", label: "Handover" },
];

export default function App() {
  const [tab, setTab] = useState("queue");
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState({ total:0,immediate:0,urgent:0,less_urgent:0,non_urgent:0 });
  const [selected, setSelected] = useState(null);
  const [trendPatient, setTrendPatient] = useState(null);
  const [ambulanceAlert, setAmbulanceAlert] = useState(null);
  const [beds, setBeds] = useState({});

  // WebSocket listeners
  useEffect(() => {
    socket.on("queue_update", ({ queue, stats }) => {
      setQueue(queue);
      setStats(stats);
    });
    socket.on("ambulance_incoming", (alert) => {
      setAmbulanceAlert(alert);
      toast(`🚑 Ambulance incoming: ${alert.patient_name} — ${alert.urgency_label}`, { duration: 8000, style: { background: "#431407", color: "#fdba74", border: "1px solid #ea580c" } });
    });
    socket.on("patient_upgraded", ({ patient_id, new_urgency }) => {
      const labels = ["IMMEDIATE","URGENT","LESS URGENT","NON-URGENT"];
      toast.error(`⚠ Patient auto-upgraded to ${labels[new_urgency]} due to deteriorating vitals`, { duration: 6000 });
    });
    socket.on("retriage_alerts", (alerts) => {
      alerts.forEach(a => toast(`🔄 Re-assess: ${a.name} has waited ${a.waited_minutes}m (limit: ${a.limit}m)`, { duration: 5000, style: { background: "#2e1065", color: "#d8b4fe", border: "1px solid #a855f7" } }));
    });
    socket.on("bed_update", setBeds);

    fetchQueue();
    fetchBeds();
    return () => socket.off();
  }, []);

  const fetchQueue = async () => {
    try {
      const r = await axios.get(`${API}/api/queue`);
      if (r.data.success) { setQueue(r.data.queue); setStats(r.data.stats); }
    } catch {}
  };

  const fetchBeds = async () => {
    try {
      const r = await axios.get(`${API}/api/beds`);
      if (r.data.success) setBeds(r.data.beds);
    } catch {}
  };

  const handleDischarge = async (id) => {
    await axios.post(`${API}/api/discharge`, { patient_id: id });
    if (selected?.id === id) setSelected(null);
    toast.success("Patient discharged");
  };

  const handleOverride = async (id, level, reason) => {
    await axios.post(`${API}/api/override`, { patient_id: id, new_urgency_level: level, reason });
    toast.success("Triage decision overridden");
    fetchQueue();
  };

  const handlePatientAdded = (patient) => {
    setQueue(prev => [...prev, patient].sort((a, b) => a.urgency_level - b.urgency_level));
    setSelected(patient);
    toast.success(`Patient triaged: ${patient.urgency_label}`);
  };

  return (
    <div className="app">
      <Toaster position="top-right" toastOptions={{ style: { background: "#1f2937", color: "#f9fafb", border: "1px solid #374151" } }} />

      <header className="header">
        <div className="logo">
          <div className="logo-icon">AI</div>
          <div>
            <div className="logo-name">AI Triage System</div>
            <div className="logo-sub">Team NETRA · Dr. Kala Chandrashekar</div>
          </div>
        </div>

        <div className="tabs">
          {TABS.map(t => (
            <button key={t.id} className={`tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="live-badge">
          <span className="live-dot" />
          {stats.immediate || 0} critical · {stats.urgent || 0} urgent
        </div>
      </header>

      {ambulanceAlert && (
        <div className="ambu-bar">
          <strong>🚑 INCOMING:</strong>
          {ambulanceAlert.patient_name} · Age {ambulanceAlert.age} · {ambulanceAlert.urgency_label} · ETA {ambulanceAlert.eta_minutes} min
          <button className="btn btn-sm" style={{ marginLeft: "auto" }} onClick={() => setAmbulanceAlert(null)}>Dismiss</button>
        </div>
      )}

      <div className="main">
        {tab === "queue" && (
          <>
            <div className="stats-row">
              <div className="stat"><div className="stat-lbl">Immediate</div><div className="stat-val red">{stats.immediate||0}</div><div className="stat-sub">See now</div></div>
              <div className="stat"><div className="stat-lbl">Urgent</div><div className="stat-val orange">{stats.urgent||0}</div><div className="stat-sub">Within 10 min</div></div>
              <div className="stat"><div className="stat-lbl">Less Urgent</div><div className="stat-val yellow">{stats.less_urgent||0}</div><div className="stat-sub">Within 60 min</div></div>
              <div className="stat"><div className="stat-lbl">Non-Urgent</div><div className="stat-val green">{stats.non_urgent||0}</div><div className="stat-sub">Within 120 min</div></div>
              <div className="stat"><div className="stat-lbl">Total Queue</div><div className="stat-val blue">{stats.total||0}</div><div className="stat-sub">Active patients</div></div>
            </div>

            <div className="grid-3">
              <PatientForm API={API} onPatientAdded={handlePatientAdded} />

              <div>
                <PatientQueue
                  queue={queue}
                  selected={selected}
                  onSelect={setSelected}
                  onDischarge={handleDischarge}
                />
              </div>

              <div>
                {selected ? (
                  <DetailPanel
                    patient={selected}
                    onDischarge={handleDischarge}
                    onOverride={handleOverride}
                    onViewTrend={() => setTrendPatient(selected)}
                    API={API}
                  />
                ) : (
                  <div className="card">
                    <div className="card-head"><span className="card-title">Patient Detail</span></div>
                    <div className="card-body" style={{ color: "var(--text2)", fontSize: 13, textAlign: "center", padding: "40px 20px" }}>
                      Select a patient from the queue to view details
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {tab === "ambulance" && <AmbulancePreTriage API={API} />}
        {tab === "mass"      && <MassCasualty API={API} onDone={fetchQueue} />}
        {tab === "beds"      && <BedManagement beds={beds} API={API} />}
        {tab === "audit"     && <AuditLog API={API} />}
        {tab === "handover"  && <ShiftHandover API={API} queue={queue} />}
      </div>

      {trendPatient && (
        <div className="modal-bg" onClick={() => setTrendPatient(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <span className="modal-close" onClick={() => setTrendPatient(null)}>✕</span>
            <div className="modal-title">Vitals Trend — {trendPatient.name}</div>
            <VitalsTrend patient={trendPatient} API={API} />
          </div>
        </div>
      )}
    </div>
  );
}
