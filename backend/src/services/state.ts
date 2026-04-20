import { AuditEvent, Patient, UrgencyLevel, Vitals } from "../types";

export const URGENCY_CONFIG: Record<UrgencyLevel, { label: string; color: string; max_wait: string; description: string }> = {
  0: { label: "Immediate", color: "red", max_wait: "0 min", description: "Life threatening" },
  1: { label: "Urgent", color: "orange", max_wait: "10 min", description: "May deteriorate" },
  2: { label: "Less Urgent", color: "yellow", max_wait: "60 min", description: "Stable" },
  3: { label: "Non-Urgent", color: "green", max_wait: "120 min", description: "Minor condition" }
};

export const RESOURCES: Record<UrgencyLevel, string[]> = {
  0: ["ICU Bed", "Crash Cart", "Senior Doctor", "Nurse Immediate"],
  1: ["Monitoring Bed", "IV Access", "Doctor Within 10 min"],
  2: ["Standard Bed", "Nurse Assessment"],
  3: ["Waiting Area", "Junior Doctor"]
};

export const CHIEF_COMPLAINTS = [
  "Chest Pain",
  "Breathlessness",
  "Trauma / Injury",
  "Fever",
  "Abdominal Pain",
  "Headache",
  "Fracture",
  "Minor Injury"
];

export const beds = {
  icu: { total: 6, occupied: 4 },
  emergency: { total: 12, occupied: 7 },
  general: { total: 20, occupied: 15 },
  observation: { total: 8, occupied: 3 }
};

export const patientQueue: Patient[] = [];
export const auditLog: AuditEvent[] = [];
export const vitalsHistory: Record<string, Array<Vitals & { timestamp: string }>> = {};
export const shiftStats = {
  total: 0,
  immediate: 0,
  urgent: 0,
  less_urgent: 0,
  non_urgent: 0,
  overrides: 0,
  sepsis_flags: 0,
  mass_casualty: 0
};

export const getStats = () => ({
  total: patientQueue.length,
  immediate: patientQueue.filter((p) => p.urgency_level === 0).length,
  urgent: patientQueue.filter((p) => p.urgency_level === 1).length,
  less_urgent: patientQueue.filter((p) => p.urgency_level === 2).length,
  non_urgent: patientQueue.filter((p) => p.urgency_level === 3).length,
  ...beds
});
