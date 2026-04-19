import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const URGENCY_LABELS = ["Immediate","Urgent","Less Urgent","Non-Urgent"];

export default function DetailPanel({ patient: p, onDischarge, onOverride, onViewTrend, API }) {
  const [overrideLevel, setOverrideLevel] = useState(p.urgency_level);
  const [overrideReason, setOverrideReason] = useState("");
  const [showOverride, setShowOverride] = useState(false);

  const maxShap = p.explanation?.length
    ? Math.max(...p.explanation.map(e => Math.abs(e.shap_value || 0)))
    : 1;

  const isCriticalVital = (key, val) => {
    if (key === "oxygen_saturation" && val < 92) return true;
    if (key === "heart_rate" && (val > 120 || val < 50)) return true;
    if (key === "systolic_bp" && val < 100) return true;
    if (key === "temperature" && (val > 39.5 || val < 35.5)) return true;
    if (key === "respiratory_rate" && (val > 25 || val < 10)) return true;
    return false;
  };

  const submitOverride = async () => {
    if (!overrideReason.trim()) { toast.error("Please provide a reason for override"); return; }
    await onOverride(p.id, overrideLevel, overrideReason);
    setShowOverride(false);
    setOverrideReason("");
  };

  const updateVitals = async () => {
    const hr = prompt("New Heart Rate (bpm):", p.vitals.heart_rate);
    const spo2 = prompt("New SpO2 (%):", p.vitals.oxygen_saturation);
    if (!hr || !spo2) return;
    try {
      const r = await axios.post(`${API}/api/vitals/update`, {
        patient_id: p.id,
        vitals: { heart_rate: parseInt(hr), oxygen_saturation: parseInt(spo2) }
      });
      if (r.data.upgraded) toast.error(`Patient urgency upgraded due to deteriorating vitals!`);
      else toast.success("Vitals updated");
    } catch { toast.error("Failed to update vitals"); }
  };

  return (
    <div>
      <div className="card">
        <div className="card-head">
          <span className="card-title">Patient Detail</span>
          <span className="card-badge">#{p.id}</span>
        </div>
        <div className="card-body">

          {/* Sepsis Warning */}
          {p.sepsis_flag && (
            <div className="sepsis-flag">
              <span className="dot dot-red" />
              <strong>SEPSIS ALERT</strong> — {p.sepsis?.message}
            </div>
          )}

          {/* Uncertainty Warning */}
          {p.uncertain && (
            <div className="uncertain-flag">
              <span>⚠</span>
              <span>Low confidence ({p.confidence}%) — Escalate to senior doctor for review</span>
            </div>
          )}

          {/* Pain Inconsistency */}
          {p.pain_check?.inconsistency && (
            <div className="pain-flag">
              <span>⚡</span>
              <span>{p.pain_check.message}</span>
            </div>
          )}

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 2 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: "var(--text2)" }}>Age {p.age} · {p.age_group} · {p.chief_complaint}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span className={`pill pill-${p.urgency_level}`}>{p.urgency_label}</span>
              <div style={{ fontSize: 10, color: "var(--text2)", marginTop: 4, fontFamily: "IBM Plex Mono" }}>{p.confidence}% confidence</div>
            </div>
          </div>

          <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 10 }}>
            Arrived: {p.arrival_time} · Max wait: {p.max_wait}
            {p.overridden && <span style={{ color: "var(--yellow)", marginLeft: 8 }}>⚡ Overridden: {p.override_reason}</span>}
          </div>

          {/* Vitals */}
          <div className="sub-head">Vitals</div>
          <div className="vitals-grid">
            {[
              { key: "heart_rate", label: "HR", unit: "bpm" },
              { key: "oxygen_saturation", label: "SpO2", unit: "%" },
              { key: "systolic_bp", label: "BP Sys", unit: "" },
              { key: "temperature", label: "Temp", unit: "°C" },
              { key: "respiratory_rate", label: "RR", unit: "/min" },
              { key: "pain_score", label: "Pain", unit: "/10" },
            ].map(v => (
              <div key={v.key} className="vital-box">
                <div className={`vital-val ${isCriticalVital(v.key, p.vitals[v.key]) ? "danger" : ""}`}>
                  {p.vitals[v.key]}{v.unit}
                </div>
                <div className="vital-lbl">{v.label}</div>
              </div>
            ))}
          </div>

          {/* Resources */}
          <div className="sub-head">Resources Required</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
            {p.resources_needed?.map((r, i) => (
              <span key={i} className="chip">{r}</span>
            ))}
          </div>

          {/* SHAP Explanation */}
          {p.explanation?.length > 0 && (
            <>
              <div className="sub-head">Why this urgency level? (SHAP)</div>
              {p.explanation.map((e, i) => (
                <div key={i} className="shap-row">
                  <span className="shap-lbl">{e.label}</span>
                  <div className="shap-track">
                    <div
                      className={`shap-fill ${e.shap_value > 0 ? "pos" : "neg"}`}
                      style={{ width: `${(Math.abs(e.shap_value) / maxShap) * 100}%` }}
                    />
                  </div>
                  <span className="shap-num">{e.shap_value > 0 ? "↑" : "↓"}{Math.abs(e.shap_value).toFixed(3)}</span>
                </div>
              ))}
              <div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 10 }}>
                🔴 Red = increases urgency · 🟢 Green = decreases urgency
              </div>
            </>
          )}

          {/* Sepsis SIRS Details */}
          {p.sepsis?.sirs_count > 0 && (
            <>
              <div className="sub-head">SIRS Criteria ({p.sepsis.sirs_count}/4 met)</div>
              {p.sepsis.sirs_criteria_met.map((s, i) => (
                <div key={i} className="unit-row">
                  <span className="dot dot-red" />
                  <span className="u-name">{s.criterion}</span>
                  <span className="u-eta">{s.value}</span>
                </div>
              ))}
            </>
          )}

          {/* Actions */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
            <button className="btn btn-sm" onClick={updateVitals}>Update Vitals</button>
            <button className="btn btn-sm" onClick={onViewTrend}>Vitals Trend</button>
            <button className="btn btn-sm btn-orange" onClick={() => setShowOverride(!showOverride)}>Override</button>
            <button className="btn btn-sm btn-green" onClick={() => onDischarge(p.id)}>Discharge</button>
          </div>

          {/* Override Panel */}
          {showOverride && (
            <div style={{ marginTop: 12, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: 12 }}>
              <div className="sub-head" style={{ marginBottom: 8 }}>Clinical Override</div>
              <div className="form-group">
                <label className="form-label">New Urgency Level</label>
                <select className="form-select" value={overrideLevel} onChange={e => setOverrideLevel(parseInt(e.target.value))}>
                  {URGENCY_LABELS.map((l, i) => <option key={i} value={i}>{l}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Clinical Reason (required)</label>
                <input className="form-input" value={overrideReason} onChange={e => setOverrideReason(e.target.value)} placeholder="e.g. Atypical MI presentation in elderly patient" />
              </div>
              <button className="btn btn-red btn-full btn-sm" onClick={submitOverride}>Confirm Override</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
