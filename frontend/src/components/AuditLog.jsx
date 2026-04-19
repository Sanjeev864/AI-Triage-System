import { useState, useEffect } from "react";
import axios from "axios";

const ACTION_CONFIG = {
  triage:       { label: "AI Triage",      color: "var(--blue)",   bg: "var(--blue-bg)" },
  override:     { label: "Nurse Override", color: "var(--orange)", bg: "var(--orange-bg)" },
  auto_upgrade: { label: "Auto Upgraded",  color: "var(--red)",    bg: "var(--red-bg)" },
};

const URGENCY_COLORS = ["var(--red)","var(--orange)","var(--yellow)","var(--green)"];
const URGENCY_LABELS = ["Immediate","Urgent","Less Urgent","Non-Urgent"];

export default function AuditLog({ API }) {
  const [log, setLog]         = useState([]);
  const [filter, setFilter]   = useState("all");
  const [search, setSearch]   = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchLog(); }, []);

  const fetchLog = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/api/audit`);
      if (r.data.success) setLog(r.data.log);
    } catch {
      // Use mock data when backend not connected
      setLog(MOCK_LOG);
    }
    setLoading(false);
  };

  const filtered = log.filter(entry => {
    const matchFilter = filter === "all" || entry.action === filter ||
      (filter === "sepsis" && entry.sepsis_flag);
    const matchSearch = !search ||
      entry.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
      entry.patient_id?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const stats = {
    total:    log.length,
    overrides: log.filter(e => e.action === "override").length,
    sepsis:    log.filter(e => e.sepsis_flag).length,
    upgraded:  log.filter(e => e.action === "auto_upgrade").length,
  };

  return (
    <div>
      {/* Stats */}
      <div className="stats-row" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <div className="stat"><div className="stat-lbl">Total Events</div><div className="stat-val blue">{stats.total}</div></div>
        <div className="stat"><div className="stat-lbl">Nurse Overrides</div><div className="stat-val orange">{stats.overrides}</div><div className="stat-sub">AI decisions changed</div></div>
        <div className="stat"><div className="stat-lbl">Sepsis Flags</div><div className="stat-val red">{stats.sepsis}</div><div className="stat-sub">SIRS criteria triggered</div></div>
        <div className="stat"><div className="stat-lbl">Auto Upgrades</div><div className="stat-val yellow">{stats.upgraded}</div><div className="stat-sub">Vitals-triggered</div></div>
      </div>

      <div className="card">
        <div className="card-head">
          <span className="card-title">Audit Trail</span>
          <button className="btn btn-sm" onClick={fetchLog}>Refresh</button>
        </div>

        {/* Filters */}
        <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", gap: 8, alignItems: "center" }}>
          <input
            className="form-input"
            style={{ maxWidth: 220 }}
            placeholder="Search patient name or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="tabs" style={{ marginLeft: 4 }}>
            {[
              { id: "all",          label: "All" },
              { id: "triage",       label: "Triage" },
              { id: "override",     label: "Overrides" },
              { id: "auto_upgrade", label: "Upgrades" },
              { id: "sepsis",       label: "Sepsis" },
            ].map(f => (
              <button
                key={f.id}
                className={`tab ${filter === f.id ? "active" : ""}`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <span style={{ marginLeft: "auto", fontSize: 11, fontFamily: "IBM Plex Mono", color: "var(--text2)" }}>
            {filtered.length} entries
          </span>
        </div>

        {/* Log entries */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text2)", fontSize: 13 }}>Loading audit log...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text2)", fontSize: 13 }}>
            No entries found. Start triaging patients to build the audit trail.
          </div>
        ) : (
          <div style={{ maxHeight: "calc(100vh - 340px)", overflowY: "auto" }}>
            {filtered.map((entry, i) => {
              const ac = ACTION_CONFIG[entry.action] || ACTION_CONFIG.triage;
              const urgencyColor = URGENCY_COLORS[entry.urgency_level] || "var(--text)";
              const urgencyLabel = URGENCY_LABELS[entry.urgency_level] || "Unknown";
              const time = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--";

              return (
                <div key={i} className="audit-row">
                  <div className="audit-time">{time}</div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, fontFamily: "IBM Plex Mono", padding: "2px 7px", borderRadius: 20, background: ac.bg, color: ac.color, whiteSpace: "nowrap" }}>
                      {ac.label}
                    </span>
                  </div>

                  <div style={{ flex: 1 }}>
                    <div className="audit-action">
                      <span style={{ color: "var(--blue)", fontFamily: "IBM Plex Mono", fontSize: 11, marginRight: 6 }}>#{entry.patient_id}</span>
                      {entry.patient_name || "Unknown"}
                    </div>
                    <div className="audit-note">
                      Urgency: <span style={{ color: urgencyColor, fontWeight: 500 }}>{urgencyLabel}</span>
                      {entry.confidence && <span style={{ marginLeft: 8, color: "var(--text3)" }}>· {entry.confidence}% confidence</span>}
                      {entry.note && <span style={{ marginLeft: 8, color: "var(--text2)" }}>· {entry.note}</span>}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                    {entry.sepsis_flag && (
                      <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 20, background: "var(--red-bg)", color: "#fca5a5", border: "1px solid var(--red-border)" }}>
                        SEPSIS
                      </span>
                    )}
                    {entry.overridden && (
                      <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 20, background: "var(--orange-bg)", color: "#fdba74", border: "1px solid var(--orange-border)" }}>
                        OVERRIDE
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bias analysis */}
      <div className="card" style={{ marginTop: 14 }}>
        <div className="card-head">
          <span className="card-title">Override Pattern Analysis</span>
          <span className="card-badge">Bias Detection</span>
        </div>
        <div className="card-body">
          {stats.overrides === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text2)" }}>
              No overrides recorded yet. Override patterns will be analyzed here to detect systematic AI bias.
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.8 }}>
              <div style={{ marginBottom: 8 }}>
                <strong style={{ color: "var(--text)" }}>{stats.overrides}</strong> AI decisions overridden out of{" "}
                <strong style={{ color: "var(--text)" }}>{stats.total}</strong> total triage events ({Math.round((stats.overrides / stats.total) * 100)}% override rate)
              </div>
              <div style={{ padding: "10px 12px", background: "var(--bg)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 12 }}>
                High override rates in specific demographics may indicate model bias. Review override reasons in the log above to identify patterns. Documented bias examples: undertriaging elderly women with cardiac symptoms, undertriaging patients with atypical pain presentation.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Mock data for when backend is not connected
const MOCK_LOG = [
  { timestamp: new Date(Date.now() - 300000).toISOString(), patient_id: "A1B2C3", patient_name: "Ravi Kumar", action: "triage", urgency_level: 0, urgency_label: "Immediate", confidence: 94.2, sepsis_flag: true, overridden: false, note: null },
  { timestamp: new Date(Date.now() - 240000).toISOString(), patient_id: "D4E5F6", patient_name: "Priya Sharma", action: "triage", urgency_level: 1, urgency_label: "Urgent", confidence: 81.5, sepsis_flag: false, overridden: false, note: null },
  { timestamp: new Date(Date.now() - 180000).toISOString(), patient_id: "D4E5F6", patient_name: "Priya Sharma", action: "override", urgency_level: 0, urgency_label: "Immediate", confidence: null, sepsis_flag: false, overridden: true, note: "Atypical MI presentation — upgrading to Immediate" },
  { timestamp: new Date(Date.now() - 120000).toISOString(), patient_id: "G7H8I9", patient_name: "Mohammed Farooq", action: "triage", urgency_level: 2, urgency_label: "Less Urgent", confidence: 67.3, sepsis_flag: false, overridden: false, note: null },
  { timestamp: new Date(Date.now() - 60000).toISOString(),  patient_id: "G7H8I9", patient_name: "Mohammed Farooq", action: "auto_upgrade", urgency_level: 1, urgency_label: "Urgent", confidence: null, sepsis_flag: false, overridden: false, note: "SpO2 dropping · HR rising" },
];
