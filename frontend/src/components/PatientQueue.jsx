import axios from "axios";

const COLORS = ["red","orange","yellow","green"];
const DOT_COLORS = ["dot-red","dot-orange","dot-yellow","dot-green"];

export default function PatientQueue({ queue, selected, onSelect, onDischarge }) {
  if (!queue.length) return (
    <div className="card">
      <div className="card-head"><span className="card-title">Live Queue</span><span className="card-badge">Empty</span></div>
      <div style={{ textAlign:"center", padding:"50px 20px", color:"var(--text2)", fontSize:13 }}>
        No patients in queue.<br />Register a patient using the form.
      </div>
    </div>
  );

  return (
    <div className="card">
      <div className="card-head">
        <span className="card-title">Live Queue</span>
        <span className="card-badge">{queue.length} patients</span>
      </div>
      <div className="scroll-list">
        {queue.map(p => (
          <div
            key={p.id}
            className={`q-item border-${p.urgency_level} ${selected?.id === p.id ? "selected" : ""}`}
            onClick={() => onSelect(p)}
          >
            <div className="q-item-top">
              <div className="q-item-left">
                <span className={`pill pill-${p.urgency_level}`}>{p.urgency_label}</span>
                <span className="q-name">{p.name}</span>
                {p.age_group !== "adult" && (
                  <span className={`age-badge age-${p.age_group}`}>{p.age_group}</span>
                )}
              </div>
              <span className="q-time">{p.arrival_time}</span>
            </div>
            <div className="q-loc">Age {p.age} · {p.chief_complaint}</div>
            <div className="q-chips">
              <span className="chip"><span className={`dot ${DOT_COLORS[p.urgency_level]}`} />Wait: {p.max_wait}</span>
              <span className="chip">{Math.round(p.confidence)}% conf.</span>
              {p.sepsis_flag && <span className="chip" style={{ background: "var(--red-bg)", color: "#fca5a5", borderColor: "var(--red-border)" }}>SEPSIS FLAG</span>}
              {p.uncertain && <span className="chip" style={{ background: "var(--purple-bg)", color: "#d8b4fe", borderColor: "var(--purple)" }}>UNCERTAIN</span>}
              {p.overridden && <span className="chip" style={{ color: "var(--yellow)" }}>OVERRIDDEN</span>}
              {p.source === "ambulance" && <span className="chip" style={{ background: "var(--orange-bg)", color: "#fdba74" }}>🚑 AMB</span>}
              {p.source === "mass_casualty" && <span className="chip" style={{ background: "var(--purple-bg)", color: "#d8b4fe" }}>MCI</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
