import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

export default function ShiftHandover({ API, queue }) {
  const [form, setForm] = useState({
    nurse: "",
    period: "Day Shift (08:00–20:00)",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleGenerate = async () => {
    if (!form.nurse.trim()) { toast.error("Enter reporting nurse name"); return; }
    setLoading(true);
    try {
      const r = await axios.post(`${API}/api/handover`, form, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([r.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `shift_handover_${new Date().toISOString().slice(0, 16).replace("T", "_")}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      setGenerated(true);
      toast.success("Shift handover report downloaded!");
    } catch {
      toast.error("Backend not connected — ensure app.py is running");
    }
    setLoading(false);
  };

  // Summary counts from current queue
  const counts = {
    immediate:  queue.filter(p => p.urgency_level === 0).length,
    urgent:     queue.filter(p => p.urgency_level === 1).length,
    less_urgent:queue.filter(p => p.urgency_level === 2).length,
    non_urgent: queue.filter(p => p.urgency_level === 3).length,
    sepsis:     queue.filter(p => p.sepsis_flag).length,
    overridden: queue.filter(p => p.overridden).length,
  };

  return (
    <div className="grid-2-narrow">
      {/* Form */}
      <div className="card">
        <div className="card-head">
          <span className="card-title">Generate Handover Report</span>
          <span className="card-badge">PDF</span>
        </div>
        <div className="card-body">
          <div style={{ background: "var(--blue-bg)", border: "1px solid var(--blue-border)", borderRadius: "var(--radius-sm)", padding: "8px 11px", fontSize: 11, color: "#93c5fd", marginBottom: 14 }}>
            Generates a complete PDF shift handover report including all patients, statistics, sepsis flags, and clinical notes for the incoming team.
          </div>

          <div className="form-group">
            <label className="form-label">Reporting Nurse / Doctor *</label>
            <input className="form-input" value={form.nurse} onChange={e => set("nurse", e.target.value)} placeholder="Sr. Nurse Meera Iyer" />
          </div>

          <div className="form-group">
            <label className="form-label">Shift Period</label>
            <select className="form-select" value={form.period} onChange={e => set("period", e.target.value)}>
              <option>Day Shift (08:00–20:00)</option>
              <option>Night Shift (20:00–08:00)</option>
              <option>Morning Shift (06:00–14:00)</option>
              <option>Evening Shift (14:00–22:00)</option>
              <option>Custom Period</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Additional Notes for Incoming Team</label>
            <textarea
              className="form-textarea"
              value={form.notes}
              onChange={e => set("notes", e.target.value)}
              placeholder="Any critical patient updates, pending investigations, staff notes..."
              style={{ height: 90 }}
            />
          </div>

          <button
            className="btn btn-blue btn-full"
            onClick={handleGenerate}
            disabled={loading}
            style={{ padding: 12, fontSize: 14 }}
          >
            {loading ? "Generating PDF..." : "📄 Generate & Download Handover PDF"}
          </button>

          {generated && (
            <div style={{ marginTop: 10, padding: "8px 11px", background: "var(--green-bg)", border: "1px solid var(--green-border)", borderRadius: "var(--radius-sm)", fontSize: 12, color: "#86efac" }}>
              ✓ Report downloaded successfully. Share with incoming nurse/doctor.
            </div>
          )}
        </div>
      </div>

      {/* Preview */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Queue snapshot */}
        <div className="card">
          <div className="card-head">
            <span className="card-title">Current Queue Snapshot</span>
            <span className="card-badge">{queue.length} patients</span>
          </div>
          <div className="card-body">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8, marginBottom: 12 }}>
              {[
                { label: "Immediate", count: counts.immediate, color: "var(--red)",    bg: "var(--red-bg)" },
                { label: "Urgent",    count: counts.urgent,    color: "var(--orange)", bg: "var(--orange-bg)" },
                { label: "Less Urgent",count:counts.less_urgent,color:"var(--yellow)", bg: "var(--yellow-bg)" },
                { label: "Non-Urgent",count: counts.non_urgent,color: "var(--green)",  bg: "var(--green-bg)" },
              ].map(s => (
                <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.color}`, borderRadius: "var(--radius-sm)", padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: s.color }}>{s.label}</span>
                  <span style={{ fontSize: 22, fontWeight: 700, fontFamily: "IBM Plex Mono", color: s.color }}>{s.count}</span>
                </div>
              ))}
            </div>

            {counts.sepsis > 0 && (
              <div className="sepsis-flag" style={{ marginBottom: 8 }}>
                {counts.sepsis} patient{counts.sepsis > 1 ? "s" : ""} with active sepsis flag — requires immediate handover
              </div>
            )}
            {counts.overridden > 0 && (
              <div className="pain-flag">
                {counts.overridden} AI decision{counts.overridden > 1 ? "s" : ""} overridden — review clinical reasoning
              </div>
            )}

            {queue.length === 0 && (
              <div style={{ fontSize: 13, color: "var(--text2)", textAlign: "center", padding: "10px 0" }}>
                Queue is empty — clean handover
              </div>
            )}
          </div>
        </div>

        {/* Patients still in queue */}
        {queue.length > 0 && (
          <div className="card">
            <div className="card-head">
              <span className="card-title">Patients Requiring Handover</span>
            </div>
            <div style={{ maxHeight: 300, overflowY: "auto" }}>
              {queue.sort((a, b) => a.urgency_level - b.urgency_level).map(p => (
                <div key={p.id} className={`audit-row border-${p.urgency_level}`} style={{ borderLeft: "3px solid" }}>
                  <div className="audit-time" style={{ width: 70, fontSize: 11 }}>{p.arrival_time}</div>
                  <div style={{ flex: 1 }}>
                    <div className="audit-action">
                      <span className={`pill pill-${p.urgency_level}`} style={{ marginRight: 6 }}>{p.urgency_label}</span>
                      {p.name}
                      <span style={{ fontFamily: "IBM Plex Mono", fontSize: 10, color: "var(--text3)", marginLeft: 6 }}>#{p.id}</span>
                    </div>
                    <div className="audit-note">
                      Age {p.age} · {p.chief_complaint} · Wait: {p.max_wait}
                      {p.sepsis_flag && <span style={{ color: "#fca5a5", marginLeft: 6 }}>SEPSIS FLAG</span>}
                      {p.overridden  && <span style={{ color: "var(--yellow)", marginLeft: 6 }}>OVERRIDDEN</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* What's in the PDF */}
        <div className="card">
          <div className="card-head"><span className="card-title">Report Contents</span></div>
          <div className="card-body">
            {[
              "Shift period and reporting nurse details",
              "Patient-wise urgency distribution stats",
              "All patients still in queue with full details",
              "Sepsis flags and SIRS criteria summary",
              "Nurse override log with clinical reasons",
              "AI confidence scores and uncertain predictions",
              "Recommendations for incoming shift",
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7, fontSize: 12, color: "var(--text2)" }}>
                <span style={{ color: "var(--green)", fontSize: 10 }}>✓</span>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
