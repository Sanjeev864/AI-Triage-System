export type UrgencyLevel = 0 | 1 | 2 | 3;

export type Vitals = {
  heart_rate: number;
  systolic_bp: number;
  diastolic_bp: number;
  temperature: number;
  oxygen_saturation: number;
  respiratory_rate: number;
  pain_score: number;
};

export type Patient = {
  id: string;
  name: string;
  age: number;
  age_group: "infant" | "child" | "adult" | "geriatric";
  chief_complaint: string;
  urgency_level: UrgencyLevel;
  urgency_label: string;
  urgency_color: string;
  urgency_description: string;
  max_wait: string;
  confidence: number;
  uncertain: boolean;
  resources_needed: string[];
  explanation: string[];
  sepsis_flag: boolean;
  sepsis: { flag: boolean; reasons: string[] };
  pain_check: { inconsistency: boolean; message: string | null; physiological_score: number };
  vitals: Vitals;
  arrival_time: string;
  arrival_timestamp: string;
  status: "waiting" | "in_progress" | "discharged";
  overridden: boolean;
  override_reason: string | null;
  source: "er" | "ambulance" | "mass_casualty";
};

export type AuditEvent = {
  timestamp: string;
  patient_id: string;
  patient_name: string;
  action: string;
  urgency_level: number | null;
  urgency_label: string | null;
  confidence: number | null;
  overridden: boolean;
  sepsis_flag: boolean;
  note?: string;
};
