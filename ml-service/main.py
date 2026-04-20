from __future__ import annotations

import os
from pathlib import Path
from typing import List

import joblib
import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="AI Triage ML Service", version="1.0.0")

MODEL_DIR = Path(__file__).resolve().parent / "models"
MODEL_PATH = MODEL_DIR / "triage_model.pkl"
SCALER_PATH = MODEL_DIR / "scaler.pkl"

model = None
scaler = None

if MODEL_PATH.exists() and SCALER_PATH.exists():
    try:
        model = joblib.load(MODEL_PATH)
        scaler = joblib.load(SCALER_PATH)
    except Exception:
        model = None
        scaler = None


class PredictPayload(BaseModel):
    age: int
    heart_rate: int
    systolic_bp: int
    diastolic_bp: int
    temperature: float
    oxygen_saturation: int
    respiratory_rate: int
    pain_score: int = Field(ge=0, le=10)
    conscious_level: int = Field(ge=0, le=3)
    arrival_mode: int = Field(ge=0, le=2)
    chief_complaint: int = Field(ge=0, le=7)


class ComplaintPayload(BaseModel):
    text: str


def fallback_triage(payload: PredictPayload):
    factors: List[str] = []
    if payload.oxygen_saturation < 90:
        factors.append("low oxygen saturation")
    if payload.systolic_bp < 90:
        factors.append("hypotension")
    if payload.conscious_level >= 2:
        factors.append("reduced consciousness")
    if payload.respiratory_rate > 30:
        factors.append("severe tachypnea")
    if factors:
        return 0, 72.0, factors

    factors = []
    if payload.oxygen_saturation < 94:
        factors.append("borderline oxygen saturation")
    if payload.systolic_bp < 100:
        factors.append("low blood pressure")
    if payload.temperature > 39:
        factors.append("high fever")
    if payload.heart_rate > 120:
        factors.append("tachycardia")
    if factors:
        return 1, 68.0, factors

    if payload.pain_score >= 7:
        return 2, 65.0, ["high pain score"]
    return 3, 75.0, ["stable presentation"]


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": bool(model and scaler)}


@app.post("/predict")
def predict(payload: PredictPayload):
    if model is not None and scaler is not None:
        data = np.array(
            [
                [
                    payload.age,
                    payload.heart_rate,
                    payload.systolic_bp,
                    payload.diastolic_bp,
                    payload.temperature,
                    payload.oxygen_saturation,
                    payload.respiratory_rate,
                    payload.pain_score,
                    payload.conscious_level,
                    payload.arrival_mode,
                    payload.chief_complaint,
                ]
            ]
        )
        transformed = scaler.transform(data)
        urgency = int(model.predict(transformed)[0])
        proba = model.predict_proba(transformed)[0]
        confidence = float(proba[urgency] * 100)
        return {
            "urgency_level": urgency,
            "confidence": round(confidence, 1),
            "explanation": ["model prediction", "features normalized using trained scaler"],
        }

    urgency, confidence, factors = fallback_triage(payload)
    return {
        "urgency_level": urgency,
        "confidence": confidence,
        "explanation": [f"fallback: {f}" for f in factors],
    }


@app.post("/parse-complaint")
def parse_complaint(payload: ComplaintPayload):
    text = payload.text.lower()
    if any(k in text for k in ["chest pain", "breathless", "not breathing", "collapse"]):
        return {"category_id": 0, "category_label": "Chest Pain", "confidence": 86, "urgency_hint": "high"}
    if any(k in text for k in ["fracture", "injury", "accident", "bleeding"]):
        return {"category_id": 2, "category_label": "Trauma / Injury", "confidence": 81, "urgency_hint": "high"}
    if "fever" in text:
        return {"category_id": 3, "category_label": "Fever", "confidence": 77, "urgency_hint": "normal"}
    if "abdominal" in text or "stomach" in text:
        return {"category_id": 4, "category_label": "Abdominal Pain", "confidence": 74, "urgency_hint": "normal"}
    return {"category_id": 7, "category_label": "Minor Injury", "confidence": 52, "urgency_hint": "normal"}


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("ML_HOST", "0.0.0.0")
    port = int(os.getenv("ML_PORT", "8000"))
    uvicorn.run("main:app", host=host, port=port, reload=True)
