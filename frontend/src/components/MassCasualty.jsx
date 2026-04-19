import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const BLANK = { name:"", age:30, heart_rate:90, systolic_bp:110, diastolic_bp:75, temperature:37.5, oxygen_saturation:95, respiratory_rate:18, pain_score:5, conscious_level:1, arrival_mode:1, chief_complaint:2 };

export default function MassCasualty({ API, onDone }) {
  const [patients, setPatients] = useState([{ ...BLANK, name: "Victim 1" }]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const addPatient = () => setPatients(p => [...p, { ...BLANK, name: `Victim ${p.length + 1}` }]);
  const removePatient = (i) => setPatients(p => p.filter((_, idx) => idx !== i));
  const updatePatient = (i, key, val) => setPatients(p => p.map((pt, idx) => idx === i ? { ...pt, [key]: isNaN(val) ? val : Number(val) } : pt));

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const r = await axios.post(`${API}/api/mass-casualty`, { patients });
      if (r.data.success) {
        setResults(r.data);
        toast.success(`MCI processed: ${r.data.processed} patients triaged`);
        onDone();
      }
    } catch { toast.error("Backend not connected"); }
    setLoading(false);
  };

  const PILL_COLORS = [
    { bg: "var(--red-bg)", color: "#fca5a5", border: "var(--red-border)" },
    { bg: "var(--orange-bg)", color: "#fdba74", border: "var(--orange-border)" },
    { bg: "var(--yellow-bg)", color: "#fde047", border: "var(--yellow-border)" },
    { bg: "var(--green-bg)", color: "#86efac", border: "var(--green-border)" },
  ];

  return (
    <div>
      <div style={{ background: "var(--red-bg)", border: "1px solid var(--red-border)", borderRadius: "var(--radius)", padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 20 }}>🚨</span>
        <div>
          <div style={{ fontWeight: 600, color: "#fca5a5", marginBottom: 2 }}>Mass Casualty Incident Mode</div>
          <div style={{ fontSize: 12, color: "var(--text2)" }}>Process multiple patients simultaneously using START triage protocol. All patients added to queue instantly.</div>
        </div>
        <button className="btn btn-red" style={{ marginLeft: "auto", whiteSpace: "nowrap" }} onClick={handleSubmit} disabled={loading}>
          {loading ? "Processing..." : `⚡ Triage All ${patients.length} Patients`}
        </button>
      </div>

      {!results ? (
        <>
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <button className="btn" onClick={addPatient}>+ Add Victim</button>
            <span style={{ fontSize: 12, color: "var(--text2)", display: "flex", alignItems: "center" }}>{patients.length} patient{patients.length !== 1 ? "s" : ""} queued for triage</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: "calc(100vh - 280px)", overflowY: "auto" }}>
            {patients.map((p, i) => (
              <div key={i} className="card">
                <div className="card-head">
                  <span className="card-title">Victim {i + 1}</span>
                  <button className="btn btn-sm" onClick={() => removePatient(i)} style={{ color: "var(--red)" }}>Remove</button>
                </div>
                <div className="card-body">
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Name / Tag</label><input className="form-input" value={p.name} onChange={e => updatePatient(i, "name", e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Age (approx)</label><input className="form-input" type="number" value={p.age} onChange={e => updatePatient(i, "age", e.target.value)} /></div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                    {[
                      { k: "heart_rate", l: "HR" }, { k: "oxygen_saturation", l: "SpO2" },
                      { k: "systolic_bp", l: "BP" }, { k: "respiratory_rate", l: "RR" },
                    ].map(f => (
                      <div key={f.k} className="form-group">
                        <label className="form-label">{f.l}</label>
                        <input className="form-input" type="number" value={p[f.k]} onChange={e => updatePatient(i, f.k, e.target.value)} />
                      </div>
                    ))}
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Conscious Level</label>
                      <select className="form-select" value={p.conscious_level} onChange={e => updatePatient(i, "conscious_level", e.target.value)}>
                        <option value={0}>Alert</option><option value={1}>Voice</option>
                        <option value={2}>Pain</option><option value={3}>Unresponsive</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Chief Complaint</label>
                      <select className="form-select" value={p.chief_complaint} onChange={e => updatePatient(i, "chief_complaint", e.target.value)}>
                        {["Chest Pain","Breathlessness","Trauma","Fever","Abdominal","Headache","Fracture","Minor"].map((c,idx) => <option key={idx} value={idx}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: "var(--text2)" }}>MCI processed in &lt; 2 seconds</div>
            <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>{results.processed} patients triaged</div>
          </div>

          <div className="mc-summary">
            {[["Immediate","mc-box-0"],[" Urgent","mc-box-1"],["Less Urgent","mc-box-2"],["Non-Urgent","mc-box-3"]].map(([label, cls], i) => (
              <div key={i} className={`mc-box ${cls}`}>
                <div className="mc-num">{[results.summary.immediate, results.summary.urgent, results.summary.less_urgent, results.summary.non_urgent][i]}</div>
                <div style={{ fontSize: 11, marginTop: 4, opacity: 0.8 }}>{label}</div>
              </div>
            ))}
          </div>

          <div className="card" style={{ marginTop: 14 }}>
            <div className="card-head"><span className="card-title">Treatment Priority Order</span></div>
            <div className="scroll-list">
              {results.results.sort((a, b) => a.urgency_level - b.urgency_level).map((r, i) => (
                <div key={i} className={`q-item border-${r.urgency_level}`} style={{ marginBottom: 8 }}>
                  <div className="q-item-top">
                    <div className="q-item-left">
                      <span style={{ fontFamily: "IBM Plex Mono", fontSize: 11, color: "var(--text2)", width: 24 }}>#{i+1}</span>
                      <span className={`pill pill-${r.urgency_level}`}>{r.urgency_label}</span>
                      <span className="q-name">{r.name}</span>
                    </div>
                    <span style={{ fontSize: 10, fontFamily: "IBM Plex Mono", color: "var(--text2)" }}>{r.confidence}%</span>
                  </div>
                  <div className="q-chips">
                    {r.resources_needed?.slice(0, 2).map((res, j) => <span key={j} className="chip">{res}</span>)}
                    {r.sepsis_flag && <span className="chip" style={{ background: "var(--red-bg)", color: "#fca5a5" }}>SEPSIS</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button className="btn btn-full" style={{ marginTop: 12 }} onClick={() => setResults(null)}>New MCI Event</button>
        </div>
      )}
    </div>
  );
}
