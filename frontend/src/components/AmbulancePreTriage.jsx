import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const DEFAULTS = {
  name:"", age:40, heart_rate:90, systolic_bp:110, diastolic_bp:75,
  temperature:37.5, oxygen_saturation:95, respiratory_rate:18,
  pain_score:6, conscious_level:1, chief_complaint:0, eta_minutes:5,
  paramedic_notes:""
};

export default function AmbulancePreTriage({ API }) {
  const [form, setForm] = useState(DEFAULTS);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error("Enter patient name"); return; }
    setLoading(true);
    try {
      const r = await axios.post(`${API}/api/ambulance/pretriage`, form);
      if (r.data.success) {
        setResult(r.data.pre_alert);
        toast.success("Pre-triage alert sent to ER team!");
      }
    } catch { toast.error("Backend not connected"); }
    setLoading(false);
  };

  const COLORS = { Immediate: "var(--red)", Urgent: "var(--orange)", "Less Urgent": "var(--yellow)", "Non-Urgent": "var(--green)" };

  return (
    <div className="grid-2-narrow">
      <div className="card">
        <div className="card-head">
          <span className="card-title">Ambulance Pre-Triage</span>
          <span className="card-badge">Field Submission</span>
        </div>
        <div className="card-body">
          <div style={{ background: "var(--orange-bg)", border: "1px solid var(--orange-border)", borderRadius: "var(--radius-sm)", padding: "8px 10px", fontSize: 11, color: "#fdba74", marginBottom: 12 }}>
            Paramedics submit vitals from field. ER team gets alert before patient arrives.
          </div>

          <div className="form-group">
            <label className="form-label">Patient Name</label>
            <input className="form-input" value={form.name} onChange={e => set("name", e.target.value)} placeholder="Field name / Unknown" />
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Age (approx)</label><input className="form-input" type="number" value={form.age} onChange={e => set("age", parseInt(e.target.value))} /></div>
            <div className="form-group"><label className="form-label">ETA (minutes)</label><input className="form-input" type="number" value={form.eta_minutes} onChange={e => set("eta_minutes", parseInt(e.target.value))} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Heart Rate</label><input className="form-input" type="number" value={form.heart_rate} onChange={e => set("heart_rate", parseInt(e.target.value))} /></div>
            <div className="form-group"><label className="form-label">SpO2 (%)</label><input className="form-input" type="number" value={form.oxygen_saturation} onChange={e => set("oxygen_saturation", parseInt(e.target.value))} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Systolic BP</label><input className="form-input" type="number" value={form.systolic_bp} onChange={e => set("systolic_bp", parseInt(e.target.value))} /></div>
            <div className="form-group"><label className="form-label">Resp. Rate</label><input className="form-input" type="number" value={form.respiratory_rate} onChange={e => set("respiratory_rate", parseInt(e.target.value))} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Temp (°C)</label><input className="form-input" type="number" step="0.1" value={form.temperature} onChange={e => set("temperature", parseFloat(e.target.value))} /></div>
            <div className="form-group"><label className="form-label">Pain Score</label><input className="form-input" type="number" value={form.pain_score} onChange={e => set("pain_score", parseInt(e.target.value))} min="0" max="10" /></div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Conscious Level</label>
              <select className="form-select" value={form.conscious_level} onChange={e => set("conscious_level", parseInt(e.target.value))}>
                <option value={0}>Alert</option><option value={1}>Voice</option>
                <option value={2}>Pain</option><option value={3}>Unresponsive</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Chief Complaint</label>
              <select className="form-select" value={form.chief_complaint} onChange={e => set("chief_complaint", parseInt(e.target.value))}>
                {["Chest Pain","Breathlessness","Trauma","Fever","Abdominal","Headache","Fracture","Minor"].map((c,i) => <option key={i} value={i}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Paramedic Notes</label>
            <textarea className="form-textarea" value={form.paramedic_notes} onChange={e => set("paramedic_notes", e.target.value)} placeholder="Scene description, mechanism of injury, interventions performed..." />
          </div>
          <button className="btn btn-orange btn-full" onClick={handleSubmit} disabled={loading} style={{ padding: 11, fontSize: 14 }}>
            {loading ? "Sending..." : "🚑 Send Pre-Triage Alert to ER"}
          </button>
        </div>
      </div>

      <div>
        {result ? (
          <div className="card">
            <div className="card-head">
              <span className="card-title">Pre-Alert Sent</span>
              <span className="card-badge">{result.id}</span>
            </div>
            <div className="card-body">
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: 48, fontFamily: "IBM Plex Mono", fontWeight: 700, color: COLORS[result.urgency_label] || "var(--text)" }}>
                  {result.urgency_label}
                </div>
                <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 6 }}>
                  ETA: {result.eta_minutes} minutes · {result.confidence}% confidence
                </div>
              </div>

              <div className="sub-head">ER Preparation Required</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                {result.resources_needed?.map((r, i) => <span key={i} className="chip">{r}</span>)}
              </div>

              {result.sepsis_flag && (
                <div className="sepsis-flag">SEPSIS PROTOCOL — Prepare IV access, blood culture trays, antibiotics</div>
              )}

              <div className="sub-head">Patient Vitals (Field)</div>
              <div className="vitals-grid">
                <div className="vital-box"><div className="vital-val">{result.vitals?.heart_rate}</div><div className="vital-lbl">HR bpm</div></div>
                <div className="vital-box"><div className="vital-val">{result.vitals?.oxygen_saturation}%</div><div className="vital-lbl">SpO2</div></div>
                <div className="vital-box"><div className="vital-val">{result.vitals?.systolic_bp}</div><div className="vital-lbl">BP Sys</div></div>
                <div className="vital-box"><div className="vital-val">{result.vitals?.temperature}°C</div><div className="vital-lbl">Temp</div></div>
              </div>

              <button className="btn btn-full btn-sm" style={{ marginTop: 12 }} onClick={() => setResult(null)}>Send Another</button>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="card-head"><span className="card-title">How Pre-Triage Works</span></div>
            <div className="card-body" style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.8 }}>
              <div style={{ marginBottom: 12 }}>1. Paramedic submits vitals from ambulance</div>
              <div style={{ marginBottom: 12 }}>2. AI predicts urgency level instantly</div>
              <div style={{ marginBottom: 12 }}>3. ER team gets WebSocket notification</div>
              <div style={{ marginBottom: 12 }}>4. Resources prepared before patient arrives</div>
              <div>5. Patient added to queue on ER arrival</div>
              <div style={{ marginTop: 14, padding: "10px 12px", background: "var(--orange-bg)", border: "1px solid var(--orange-border)", borderRadius: "var(--radius-sm)", fontSize: 11, color: "#fdba74" }}>
                Preparation time increases from 2 min to 10–15 min before patient arrives
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
