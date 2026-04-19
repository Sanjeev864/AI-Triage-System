import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const BED_CONFIG = {
  icu:         { label: "ICU",         color: "var(--red)",    icon: "🔴" },
  emergency:   { label: "Emergency",   color: "var(--orange)", icon: "🟠" },
  general:     { label: "General",     color: "var(--blue)",   icon: "🔵" },
  observation: { label: "Observation", color: "var(--green)",  icon: "🟢" },
};

function BedBar({ occupied, total, color }) {
  const pct = total > 0 ? (occupied / total) * 100 : 0;
  const fillColor = pct >= 90 ? "var(--red)" : pct >= 70 ? "var(--orange)" : color;
  return (
    <div>
      <div className="bed-bar-track">
        <div className="bed-bar-fill" style={{ width: `${pct}%`, background: fillColor }} />
      </div>
      <div className="bed-count">{occupied}/{total} occupied ({Math.round(pct)}%)</div>
    </div>
  );
}

export default function BedManagement({ beds, API }) {
  const [loading, setLoading] = useState({});

  const update = async (type, action) => {
    setLoading(p => ({ ...p, [type + action]: true }));
    try {
      await axios.post(`${API}/api/beds/update`, { type, action });
      toast.success(`${BED_CONFIG[type]?.label} bed ${action === "occupy" ? "marked occupied" : "freed"}`);
    } catch { toast.error("Backend not connected"); }
    setLoading(p => ({ ...p, [type + action]: false }));
  };

  const totalBeds     = Object.values(beds).reduce((s, b) => s + (b.total    || 0), 0);
  const totalOccupied = Object.values(beds).reduce((s, b) => s + (b.occupied || 0), 0);
  const totalFree     = totalBeds - totalOccupied;
  const overallPct    = totalBeds > 0 ? Math.round((totalOccupied / totalBeds) * 100) : 0;

  return (
    <div>
      {/* Summary bar */}
      <div className="stats-row" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <div className="stat"><div className="stat-lbl">Total Beds</div><div className="stat-val blue">{totalBeds}</div><div className="stat-sub">Across all wards</div></div>
        <div className="stat"><div className="stat-lbl">Occupied</div><div className="stat-val red">{totalOccupied}</div><div className="stat-sub">{overallPct}% capacity</div></div>
        <div className="stat"><div className="stat-lbl">Available</div><div className="stat-val green">{totalFree}</div><div className="stat-sub">Ready for admission</div></div>
        <div className="stat">
          <div className="stat-lbl">Overall Load</div>
          <div className="stat-val" style={{ color: overallPct >= 90 ? "var(--red)" : overallPct >= 70 ? "var(--orange)" : "var(--green)" }}>
            {overallPct}%
          </div>
          <div className="stat-sub">{overallPct >= 90 ? "⚠ Critical" : overallPct >= 70 ? "High load" : "Normal"}</div>
        </div>
      </div>

      {/* Bed Cards */}
      <div className="grid-2">
        {Object.entries(BED_CONFIG).map(([type, cfg]) => {
          const data     = beds[type] || { total: 0, occupied: 0 };
          const free     = data.total - data.occupied;
          const pct      = data.total > 0 ? Math.round((data.occupied / data.total) * 100) : 0;
          const critical = pct >= 90;

          return (
            <div key={type} className="card" style={{ borderLeft: `3px solid ${cfg.color}` }}>
              <div className="card-head">
                <span className="card-title">{cfg.icon} {cfg.label} Ward</span>
                <span className="card-badge" style={{ color: critical ? "var(--red)" : "var(--text2)" }}>
                  {critical ? "⚠ NEAR FULL" : `${free} free`}
                </span>
              </div>
              <div className="card-body">
                {critical && (
                  <div className="sepsis-flag" style={{ marginBottom: 12, fontSize: 11 }}>
                    {cfg.label} ward at {pct}% capacity — consider diversion
                  </div>
                )}

                <BedBar occupied={data.occupied} total={data.total} color={cfg.color} />

                {/* Visual bed grid */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, margin: "14px 0" }}>
                  {Array.from({ length: data.total }).map((_, i) => (
                    <div
                      key={i}
                      title={i < data.occupied ? "Occupied" : "Available"}
                      style={{
                        width: 22, height: 22,
                        borderRadius: 4,
                        background: i < data.occupied ? cfg.color : "var(--bg3)",
                        border: `1px solid ${i < data.occupied ? cfg.color : "var(--border)"}`,
                        opacity: i < data.occupied ? 0.9 : 0.4,
                        transition: "all 0.2s",
                      }}
                    />
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <button
                    className="btn btn-red btn-sm"
                    disabled={data.occupied >= data.total || loading[type + "occupy"]}
                    onClick={() => update(type, "occupy")}
                  >
                    Admit Patient
                  </button>
                  <button
                    className="btn btn-green btn-sm"
                    disabled={data.occupied <= 0 || loading[type + "free"]}
                    onClick={() => update(type, "free")}
                  >
                    Free Bed
                  </button>
                </div>

                <div style={{ marginTop: 10, fontSize: 11, color: "var(--text2)", display: "flex", justifyContent: "space-between" }}>
                  <span>Occupied: <strong style={{ color: "var(--text)" }}>{data.occupied}</strong></span>
                  <span>Available: <strong style={{ color: "var(--green)" }}>{free}</strong></span>
                  <span>Total: <strong style={{ color: "var(--text)" }}>{data.total}</strong></span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bed-to-triage notice */}
      <div className="card" style={{ marginTop: 14 }}>
        <div className="card-head"><span className="card-title">Resource Matching Guide</span></div>
        <div className="card-body">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
            {[
              { level: "Immediate", ward: "ICU / Emergency", color: "var(--red)",    note: "Direct admit, no waiting" },
              { level: "Urgent",    ward: "Emergency",        color: "var(--orange)", note: "Within 10 min, monitored bed" },
              { level: "Less Urgent", ward: "General / Obs",  color: "var(--yellow)", note: "Within 60 min, standard bed" },
              { level: "Non-Urgent",  ward: "Waiting Area",   color: "var(--green)",  note: "No bed needed immediately" },
            ].map((r, i) => (
              <div key={i} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "10px 12px" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: r.color, marginBottom: 4 }}>{r.level}</div>
                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>{r.ward}</div>
                <div style={{ fontSize: 11, color: "var(--text2)" }}>{r.note}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
