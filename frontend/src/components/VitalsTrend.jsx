import { useState, useEffect } from "react";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function VitalsTrend({ patient, API }) {
  const [history, setHistory] = useState([]);
  const [trend, setTrend] = useState({});
  const [newHR, setNewHR] = useState("");
  const [newSPO2, setNewSPO2] = useState("");
  const [newBP, setNewBP] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    try {
      const r = await axios.get(`${API}/api/vitals/history/${patient.id}`);
      if (r.data.success) {
        setHistory(r.data.history.map((h, i) => ({
          ...h,
          time: `T+${i * 15}min`,
          heart_rate: h.heart_rate,
          oxygen_saturation: h.oxygen_saturation,
          systolic_bp: h.systolic_bp,
        })));
        setTrend(r.data.trend);
      }
    } catch {}
  };

  const addVitals = async () => {
    const vitals = {};
    if (newHR)   vitals.heart_rate        = parseInt(newHR);
    if (newSPO2) vitals.oxygen_saturation = parseInt(newSPO2);
    if (newBP)   vitals.systolic_bp       = parseInt(newBP);
    if (!Object.keys(vitals).length) return;
    setLoading(true);
    try {
      await axios.post(`${API}/api/vitals/update`, { patient_id: patient.id, vitals });
      setNewHR(""); setNewSPO2(""); setNewBP("");
      await fetchHistory();
    } catch {}
    setLoading(false);
  };

  return (
    <div>
      {trend.deteriorating && (
        <div className="sepsis-flag" style={{ marginBottom: 14 }}>
          ⚠ DETERIORATING — {trend.signals?.join(", ")}
        </div>
      )}

      {history.length >= 2 ? (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={history} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="time" tick={{ fill: "#9ca3af", fontSize: 10 }} />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid #374151", color: "#f9fafb", fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="heart_rate" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="HR (bpm)" />
            <Line type="monotone" dataKey="oxygen_saturation" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} name="SpO2 (%)" />
            <Line type="monotone" dataKey="systolic_bp" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="BP Sys" />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div style={{ textAlign: "center", padding: "30px", color: "var(--text2)", fontSize: 13 }}>
          Only 1 reading available. Add more vitals below to see trend.
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <div className="sub-head">Add New Vitals Reading</div>
        <div className="form-row-3">
          <div className="form-group">
            <label className="form-label">Heart Rate</label>
            <input className="form-input" type="number" value={newHR} onChange={e => setNewHR(e.target.value)} placeholder="bpm" />
          </div>
          <div className="form-group">
            <label className="form-label">SpO2</label>
            <input className="form-input" type="number" value={newSPO2} onChange={e => setNewSPO2(e.target.value)} placeholder="%" />
          </div>
          <div className="form-group">
            <label className="form-label">Systolic BP</label>
            <input className="form-input" type="number" value={newBP} onChange={e => setNewBP(e.target.value)} placeholder="mmHg" />
          </div>
        </div>
        <button className="btn btn-blue btn-full btn-sm" onClick={addVitals} disabled={loading}>
          {loading ? "Updating..." : "Log Vitals Reading"}
        </button>
      </div>
    </div>
  );
}
