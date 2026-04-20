import axios from "axios";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

type PredictionInput = {
  age: number;
  heart_rate: number;
  systolic_bp: number;
  diastolic_bp: number;
  temperature: number;
  oxygen_saturation: number;
  respiratory_rate: number;
  pain_score: number;
  conscious_level: number;
  arrival_mode: number;
  chief_complaint: number;
};

export const predictUrgency = async (payload: PredictionInput) => {
  try {
    const response = await axios.post(`${ML_SERVICE_URL}/predict`, payload, { timeout: 2000 });
    return response.data as {
      urgency_level: number;
      confidence: number;
      explanation: string[];
    };
  } catch {
    // Graceful fallback if ML service is unavailable.
    const criticalVitals =
      payload.oxygen_saturation < 90 ||
      payload.systolic_bp < 90 ||
      payload.conscious_level >= 2 ||
      payload.respiratory_rate > 30;
    const urgentVitals =
      payload.oxygen_saturation < 94 ||
      payload.systolic_bp < 100 ||
      payload.temperature > 39 ||
      payload.heart_rate > 120;

    if (criticalVitals) {
      return { urgency_level: 0, confidence: 72, explanation: ["Fallback triage: critical vital instability"] };
    }
    if (urgentVitals) {
      return { urgency_level: 1, confidence: 68, explanation: ["Fallback triage: urgent physiological risk"] };
    }
    if (payload.pain_score >= 7) {
      return { urgency_level: 2, confidence: 65, explanation: ["Fallback triage: severe pain reported"] };
    }
    return { urgency_level: 3, confidence: 75, explanation: ["Fallback triage: currently stable presentation"] };
  }
};

export const parseComplaint = async (text: string) => {
  try {
    const response = await axios.post(`${ML_SERVICE_URL}/parse-complaint`, { text }, { timeout: 1500 });
    return response.data as { category_id: number; category_label: string; confidence: number; urgency_hint: "high" | "normal" };
  } catch {
    return { category_id: 7, category_label: "Minor Injury", confidence: 40, urgency_hint: "normal" as const };
  }
};
