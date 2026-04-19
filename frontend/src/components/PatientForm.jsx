import { useState } from "react";
import axios from "axios";

const COMPLAINTS = [
  "Chest Pain","Breathlessness","Trauma / Injury","Fever",
  "Abdominal Pain","Headache","Fracture","Minor Injury"
];

const DEFAULTS = {
  name:"", age:45, heart_rate:80, systolic_bp:120, diastolic_bp:80,
  temperature:37.0, oxygen_saturation:98, respiratory_rate:16,
  pain_score:3, conscious_level:0, arrival_mode:0, chief_complaint:3,
  complaint_text:""
};

const getAgeGroup = (age) => age <= 12 ? "pediatric" : age >= 65 ? "geriatric" : "adult";

export default function PatientForm({ API, onPatientAdded }) {
  const [form, setForm] = useState(DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [nlpResult, setNlpResult] = useState(null);
  const [nlpLoading, setNlpLoading] = useState(false);

  const ageGroup = getAgeGroup(form.age);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const parseComplaint = async (text) => {
    if (!text || text.length < 4) return;
    setNlpLoading(true);
    try {
      const r = await axios.post(`${API}/api/parse-complaint`, { text });
      if (r.data.success) {
        setNlpResult(r.data.result);
        set("chief_complaint", r.data.result.category_id);
      }
    } catch {}
    setNlpLoading(false);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { alert("Enter patient name"); return; }
    setLoading(true);
    try {
      const payload = { ...form };
      delete payload.complaint_text;
      const r = await axios.post(`${API}/api/triage`, payload);
      if (r.data.success) {
        onPatientAdded(r.data.patient);
        setForm({ ...DEFAULTS });
        setNlpResult(null);
      }
    } catch (e) { alert("Backend not connected. Run app.py first."); }
    setLoading(false);
  };

  const inputClass = "form-input";

  return (
    <div className="card">
      <div className="card-head">
        <span className="card-title">Register Patient</span>
        <span className={`age-badge age-${ageGroup}`}>{ageGroup.toUpperCase()}</span>
      </div>
      <div className="card-body" style={{ maxHeight: "calc(100vh - 140px)", overflowY: "auto" }}>

        {/* Name */}
        <div className="form-group">
          <label className="form-label">Patient Name *</label>
          <input className={inputClass} value={form.name} onChange={e => set("name", e.target.value)} placeholder="Full name" />
        </div>

        {/* Chief Complaint NLP */}
        <div className="form-group">
          <label className="form-label">Chief Complaint (type freely)</label>
          <input
            className={inputClass}
            value={form.complaint_text}
            onChange={e => { set("complaint_text", e.target.value); parseComplaint(e.target.value); }}
            placeholder="e.g. severe chest pain with left arm pain"
          />
          {nlpLoading && <div style={{ fontSize: 10, color: "var(--text2)", marginTop: 4 }}>Parsing...</div>}
          {nlpResult && (
            <div className="nlp-suggestion">
              Detected: <strong>{nlpResult.category_label}</strong> ({nlpResult.confidence}% confidence)
              {nlpResult.urgency_hint === "high" && <span style={{ color: "#fca5a5", marginLeft: 8 }}>⚠ HIGH URGENCY LANGUAGE</span>}
            </div>
          )}
        </div>

        {/* Complaint dropdown override */}
        <div className="form-group">
          <label className="form-label">Complaint Category (confirm/override)</label>
          <select className="form-select" value={form.chief_complaint} onChange={e => set("chief_complaint", parseInt(e.target.value))}>
            {COMPLAINTS.map((c, i) => <option key={i} value={i}>{c}</option>)}
          </select>
        </div>

        {/* Age + Pain */}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Age {ageGroup !== "adult" && `(${ageGroup})`}</label>
            <input className={inputClass} type="number" value={form.age} onChange={e => set("age", parseInt(e.target.value))} min="1" max="110" />
          </div>
          <div className="form-group">
            <label className="form-label">Pain Score (0–10)</label>
            <input className={inputClass} type="number" value={form.pain_score} onChange={e => set("pain_score", parseInt(e.target.value))} min="0" max="10" />
          </div>
        </div>

        {ageGroup === "pediatric" && (
          <div style={{ background: "var(--blue-bg)", border: "1px solid var(--blue-border)", borderRadius: "var(--radius-sm)", padding: "8px 10px", fontSize: 11, color: "#93c5fd", marginBottom: 10 }}>
            Pediatric Mode: HR normal range 70–120 bpm for child. Pain assessment uses FLACC scale.
          </div>
        )}
        {ageGroup === "geriatric" && (
          <div style={{ background: "var(--purple-bg)", border: "1px solid var(--purple)", borderRadius: "var(--radius-sm)", padding: "8px 10px", fontSize: 11, color: "#d8b4fe", marginBottom: 10 }}>
            Geriatric Mode: Lower pain threshold. BP &lt;110 systolic flagged. Atypical presentation awareness active.
          </div>
        )}

        {/* Vitals */}
        <div className="form-row">
          <div className="form-group"><label className="form-label">Heart Rate (bpm)</label><input className={inputClass} type="number" value={form.heart_rate} onChange={e => set("heart_rate", parseInt(e.target.value))} /></div>
          <div className="form-group"><label className="form-label">SpO2 (%)</label><input className={inputClass} type="number" value={form.oxygen_saturation} onChange={e => set("oxygen_saturation", parseInt(e.target.value))} min="50" max="100" /></div>
        </div>

        <div className="form-row">
          <div className="form-group"><label className="form-label">Systolic BP</label><input className={inputClass} type="number" value={form.systolic_bp} onChange={e => set("systolic_bp", parseInt(e.target.value))} /></div>
          <div className="form-group"><label className="form-label">Diastolic BP</label><input className={inputClass} type="number" value={form.diastolic_bp} onChange={e => set("diastolic_bp", parseInt(e.target.value))} /></div>
        </div>

        <div className="form-row">
          <div className="form-group"><label className="form-label">Temperature (°C)</label><input className={inputClass} type="number" step="0.1" value={form.temperature} onChange={e => set("temperature", parseFloat(e.target.value))} /></div>
          <div className="form-group"><label className="form-label">Resp. Rate (/min)</label><input className={inputClass} type="number" value={form.respiratory_rate} onChange={e => set("respiratory_rate", parseInt(e.target.value))} /></div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Conscious Level</label>
            <select className="form-select" value={form.conscious_level} onChange={e => set("conscious_level", parseInt(e.target.value))}>
              <option value={0}>Alert</option>
              <option value={1}>Responds to Voice</option>
              <option value={2}>Responds to Pain</option>
              <option value={3}>Unresponsive</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Arrival Mode</label>
            <select className="form-select" value={form.arrival_mode} onChange={e => set("arrival_mode", parseInt(e.target.value))}>
              <option value={0}>Walk-in</option>
              <option value={1}>Ambulance</option>
              <option value={2}>Police</option>
            </select>
          </div>
        </div>

        <button className="btn btn-red btn-full" onClick={handleSubmit} disabled={loading} style={{ marginTop: 6, padding: "11px", fontSize: 14 }}>
          {loading ? "Triaging..." : "⚡ Triage Patient"}
        </button>
      </div>
    </div>
  );
}
