import { useState, useEffect } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const STORAGE_KEY = "asset-tracker-data";
const INV_STORAGE_KEY = "asset-tracker-invest";

const initialData = [
  { year: 2015, total: 1240, note: "" },
  { year: 2016, total: 2270, note: "" },
  { year: 2017, total: 4660, note: "" },
  { year: 2018, total: 7310, note: "" },
  { year: 2019, total: 11000, note: "" },
  { year: 2020, total: 17900, note: "" },
  { year: 2021, total: 23680, note: "" },
  { year: 2022, total: 27960, note: "" },
  { year: 2023, total: 32300, note: "" },
  { year: 2024, total: 37000, note: "" },
  { year: 2025, total: 42000, note: "" },
];

// 투자 스냅샷: 연도별로 계좌 목록 + 투자금/수익금
const initialInvest = [
  {
    id: "2026-05",
    label: "2026.05",
    invested: 13080,
    profit: 6000,
    accounts: [
      { name: "보증금", balance: 26000 },
      { name: "청약", balance: 400 },
      { name: "CMA1", balance: 1330 },
      { name: "CMA2", balance: 2200 },
      { name: "연금", balance: 1600 },
      { name: "ISA", balance: 5800 },
      { name: "토스", balance: 7000 },
    ],
  },
];

const ACCOUNT_COLORS = ["#38bdf8","#34d399","#a78bfa","#fb923c","#f472b6","#facc15","#60a5fa","#4ade80","#e879f9"];

function formatKRW(val) {
  if (val >= 10000) return `${(val / 10000).toFixed(1)}억`;
  return `${val.toLocaleString()}만`;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#0f1117", border:"1px solid #2a2d3a", borderRadius:10, padding:"10px 16px", fontSize:13, color:"#e2e8f0" }}>
      <div style={{ fontWeight:700, marginBottom:4, color:"#7dd3fc" }}>{label}년</div>
      <div>{payload[0]?.name === "total" ? "총자산" : "순증가"}: <span style={{ color:"#34d399", fontWeight:700 }}>{payload[0]?.value?.toLocaleString()}만원</span></div>
    </div>
  );
}

function InvestTab() {
  const [snapshots, setSnapshots] = useState(() => {
    try { const s = localStorage.getItem(INV_STORAGE_KEY); return s ? JSON.parse(s) : initialInvest; } catch { return initialInvest; }
  });
  const [selectedId, setSelectedId] = useState(snapshots[0]?.id || null);
  const [showAddSnap, setShowAddSnap] = useState(false);
  const [editingSnap, setEditingSnap] = useState(null); // snapshot id being edited
  const [newSnap, setNewSnap] = useState({ label: "", invested: "", profit: "", accounts: [{ name: "", balance: "" }] });
  const [editSnap, setEditSnap] = useState(null);

  useEffect(() => {
    try { localStorage.setItem(INV_STORAGE_KEY, JSON.stringify(snapshots)); } catch {}
  }, [snapshots]);

  const sorted = [...snapshots].sort((a, b) => a.label.localeCompare(b.label));
  const current = sorted.find(s => s.id === selectedId) || sorted[sorted.length - 1];

  const totalBalance = current ? current.accounts.reduce((s, a) => s + Number(a.balance || 0), 0) : 0;
  const returnRate = current && current.invested > 0
    ? (((current.profit) / current.invested) * 100).toFixed(1) : null;

  function addAccountRow(target, setTarget) {
    setTarget(v => ({ ...v, accounts: [...v.accounts, { name: "", balance: "" }] }));
  }
  function removeAccountRow(target, setTarget, idx) {
    setTarget(v => ({ ...v, accounts: v.accounts.filter((_, i) => i !== idx) }));
  }
  function updateAccountRow(target, setTarget, idx, key, val) {
    setTarget(v => {
      const accs = [...v.accounts];
      accs[idx] = { ...accs[idx], [key]: val };
      return { ...v, accounts: accs };
    });
  }

  function saveNewSnap() {
    if (!newSnap.label) return;
    const id = Date.now().toString();
    const snap = {
      id,
      label: newSnap.label,
      invested: Number(newSnap.invested) || 0,
      profit: Number(newSnap.profit) || 0,
      accounts: newSnap.accounts.filter(a => a.name).map(a => ({ name: a.name, balance: Number(a.balance) || 0 })),
    };
    setSnapshots(ss => [...ss, snap]);
    setSelectedId(id);
    setShowAddSnap(false);
    setNewSnap({ label: "", invested: "", profit: "", accounts: [{ name: "", balance: "" }] });
  }

  function saveEditSnap() {
    setSnapshots(ss => ss.map(s => s.id === editSnap.id ? {
      ...s,
      label: editSnap.label,
      invested: Number(editSnap.invested) || 0,
      profit: Number(editSnap.profit) || 0,
      accounts: editSnap.accounts.filter(a => a.name).map(a => ({ name: a.name, balance: Number(a.balance) || 0 })),
    } : s));
    setEditingSnap(null);
    setEditSnap(null);
  }

  function deleteSnap(id) {
    if (!confirm("이 스냅샷을 삭제할까요?")) return;
    setSnapshots(ss => ss.filter(s => s.id !== id));
    setSelectedId(sorted.find(s => s.id !== id)?.id || null);
  }

  function startEdit(snap) {
    setEditingSnap(snap.id);
    setEditSnap({ ...snap, accounts: snap.accounts.map(a => ({ ...a })) });
  }

  const pieData = current?.accounts.map((a, i) => ({ name: a.name, value: Number(a.balance) || 0, color: ACCOUNT_COLORS[i % ACCOUNT_COLORS.length] })) || [];

  // history chart
  const historyChart = sorted.map(s => ({
    label: s.label,
    invested: s.invested,
    profit: s.profit,
    total: s.accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0),
  }));

  return (
    <div>
      {/* 스냅샷 선택 + 추가 */}
      <div style={{ display:"flex", gap:8, marginBottom:16, alignItems:"center", flexWrap:"wrap" }}>
        <div style={{ display:"flex", gap:6, flex:1, flexWrap:"wrap" }}>
          {sorted.map(s => (
            <button key={s.id} onClick={() => { setSelectedId(s.id); setEditingSnap(null); }} style={{
              background: selectedId === s.id ? "linear-gradient(135deg,#1e3a5f,#1a3050)" : "#0d1220",
              border: selectedId === s.id ? "1px solid #38bdf855" : "1px solid #1e2740",
              color: selectedId === s.id ? "#7dd3fc" : "#4a5568",
              borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>{s.label}</button>
          ))}
        </div>
        <button onClick={() => setShowAddSnap(v => !v)} style={{
          background: showAddSnap ? "#1a2235" : "linear-gradient(135deg,#1e3a5f,#1a3050)",
          border: "1px solid #38bdf833", color: "#7dd3fc",
          borderRadius: 10, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer",
        }}>{showAddSnap ? "✕" : "+ 스냅샷"}</button>
      </div>

      {/* 새 스냅샷 추가 폼 */}
      {showAddSnap && (
        <SnapForm
          snap={newSnap} setSnap={setNewSnap}
          onSave={saveNewSnap} onCancel={() => setShowAddSnap(false)}
          title="새 스냅샷 추가"
          addRow={() => addAccountRow(newSnap, setNewSnap)}
          removeRow={(i) => removeAccountRow(newSnap, setNewSnap, i)}
          updateRow={(i, k, v) => updateAccountRow(newSnap, setNewSnap, i, k, v)}
        />
      )}

      {current && (
        editingSnap === current.id && editSnap ? (
          <SnapForm
            snap={editSnap} setSnap={setEditSnap}
            onSave={saveEditSnap} onCancel={() => { setEditingSnap(null); setEditSnap(null); }}
            title={`${editSnap.label} 수정`}
            addRow={() => addAccountRow(editSnap, setEditSnap)}
            removeRow={(i) => removeAccountRow(editSnap, setEditSnap, i)}
            updateRow={(i, k, v) => updateAccountRow(editSnap, setEditSnap, i, k, v)}
          />
        ) : (
          <div>
            {/* 상단 요약 카드 */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:16 }}>
              {[
                { label:"투자금", value:`${current.invested.toLocaleString()}만`, accent:"#38bdf8" },
                { label:"수익금", value:`+${current.profit.toLocaleString()}만`, accent:"#34d399" },
                { label:"수익률", value: returnRate ? `+${returnRate}%` : "-", accent:"#a78bfa" },
              ].map((c,i) => (
                <div key={i} style={{
                  background:"linear-gradient(135deg,#0f1629,#111827)",
                  border:`1px solid ${c.accent}22`, borderRadius:14, padding:"14px 12px",
                  position:"relative", overflow:"hidden",
                }}>
                  <div style={{ position:"absolute",top:0,right:0,width:50,height:50, background:`radial-gradient(circle,${c.accent}18 0%,transparent 70%)` }} />
                  <div style={{ fontSize:10, color:"#4a5568", marginBottom:4 }}>{c.label}</div>
                  <div style={{ fontSize:16, fontWeight:800, color:c.accent, letterSpacing:"-0.5px" }}>{c.value}</div>
                </div>
              ))}
            </div>

            {/* 계좌 목록 + 파이차트 */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
              {/* 계좌 목록 */}
              <div style={{ background:"#0f1629", border:"1px solid #1e2740", borderRadius:16, padding:"16px 14px" }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#94a3b8", marginBottom:12 }}>계좌별 잔액</div>
                {current.accounts.map((a, i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:9 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                      <div style={{ width:8, height:8, borderRadius:"50%", background:ACCOUNT_COLORS[i % ACCOUNT_COLORS.length], flexShrink:0 }} />
                      <span style={{ fontSize:13, color:"#94a3b8" }}>{a.name}</span>
                    </div>
                    <span style={{ fontSize:13, fontWeight:700, color:"#e2e8f0" }}>{Number(a.balance).toLocaleString()}<span style={{ fontSize:10, color:"#4a5568" }}>만</span></span>
                  </div>
                ))}
                <div style={{ borderTop:"1px solid #1a2235", marginTop:10, paddingTop:10, display:"flex", justifyContent:"space-between" }}>
                  <span style={{ fontSize:12, color:"#4a5568" }}>합계</span>
                  <span style={{ fontSize:15, fontWeight:800, color:"#38bdf8" }}>{totalBalance.toLocaleString()}만</span>
                </div>
              </div>

              {/* 파이차트 */}
              <div style={{ background:"#0f1629", border:"1px solid #1e2740", borderRadius:16, padding:"16px 8px", display:"flex", flexDirection:"column", alignItems:"center" }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#94a3b8", marginBottom:8, alignSelf:"flex-start", paddingLeft:6 }}>비중</div>
                <PieChart width={140} height={140}>
                  <Pie data={pieData} cx={65} cy={65} innerRadius={38} outerRadius={62} dataKey="value" strokeWidth={0}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v.toLocaleString()}만`, ""]} contentStyle={{ background:"#0f1117", border:"1px solid #2a2d3a", borderRadius:8, fontSize:12 }} />
                </PieChart>
                <div style={{ width:"100%", paddingLeft:6 }}>
                  {pieData.slice(0,4).map((d,i) => (
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"#4a5568", marginBottom:2 }}>
                      <span style={{ color:d.color }}>{d.name}</span>
                      <span>{totalBalance > 0 ? ((d.value / totalBalance)*100).toFixed(0) : 0}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 수정/삭제 버튼 */}
            <div style={{ display:"flex", gap:8, marginBottom:16 }}>
              <button onClick={() => startEdit(current)} style={{ ...btnStyleBase, background:"linear-gradient(135deg,#1e3a5f,#1a3050)", color:"#7dd3fc", flex:1 }}>✏️ 수정</button>
              <button onClick={() => deleteSnap(current.id)} style={{ ...btnStyleBase, background:"#1a0a0a", color:"#f87171" }}>🗑 삭제</button>
            </div>
          </div>
        )
      )}

      {/* 히스토리 차트 (스냅샷 2개 이상일 때) */}
      {sorted.length >= 2 && (
        <div style={{ background:"#0f1629", border:"1px solid #1e2740", borderRadius:16, padding:"20px 14px 12px", marginBottom:16 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#94a3b8", marginBottom:14 }}>📈 투자 히스토리</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={historyChart} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2235" />
              <XAxis dataKey="label" tick={{ fill:"#4a5568", fontSize:10 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `${v}만`} tick={{ fill:"#4a5568", fontSize:10 }} axisLine={false} tickLine={false} width={44} />
              <Tooltip contentStyle={{ background:"#0f1117", border:"1px solid #2a2d3a", borderRadius:8, fontSize:12, color:"#e2e8f0" }} formatter={v => [`${v.toLocaleString()}만`]} />
              <Bar dataKey="invested" name="투자금" fill="#38bdf8" radius={[4,4,0,0]} />
              <Bar dataKey="profit" name="수익금" fill="#34d399" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function SnapForm({ snap, setSnap, onSave, onCancel, title, addRow, removeRow, updateRow }) {
  return (
    <div style={{ background:"#0f1629", border:"1px solid #38bdf822", borderRadius:14, padding:18, marginBottom:16 }}>
      <div style={{ fontSize:13, fontWeight:700, color:"#7dd3fc", marginBottom:14 }}>{title}</div>
      <div style={{ marginBottom:10 }}>
        <div style={{ fontSize:11, color:"#4a5568", marginBottom:5 }}>기간 레이블 (예: 2026.05)</div>
        <input value={snap.label} onChange={e => setSnap(v => ({ ...v, label: e.target.value }))}
          placeholder="2026.05" style={inputStyle} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
        <div>
          <div style={{ fontSize:11, color:"#4a5568", marginBottom:5 }}>투자금 (만원)</div>
          <input type="number" value={snap.invested} onChange={e => setSnap(v => ({ ...v, invested: e.target.value }))}
            placeholder="13080" style={inputStyle} />
        </div>
        <div>
          <div style={{ fontSize:11, color:"#4a5568", marginBottom:5 }}>수익금 (만원)</div>
          <input type="number" value={snap.profit} onChange={e => setSnap(v => ({ ...v, profit: e.target.value }))}
            placeholder="6000" style={inputStyle} />
        </div>
      </div>

      <div style={{ fontSize:11, color:"#4a5568", marginBottom:8 }}>계좌별 잔액</div>
      {snap.accounts.map((a, i) => (
        <div key={i} style={{ display:"flex", gap:8, marginBottom:8, alignItems:"center" }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:ACCOUNT_COLORS[i % ACCOUNT_COLORS.length], flexShrink:0 }} />
          <input value={a.name} onChange={e => updateRow(i, "name", e.target.value)}
            placeholder="계좌명" style={{ ...inputStyle, flex:1 }} />
          <input type="number" value={a.balance} onChange={e => updateRow(i, "balance", e.target.value)}
            placeholder="잔액(만)" style={{ ...inputStyle, width:90, flex:"none" }} />
          <button onClick={() => removeRow(i)} style={{ background:"transparent", border:"none", color:"#f87171", cursor:"pointer", fontSize:16, padding:"0 4px" }}>×</button>
        </div>
      ))}
      <button onClick={addRow} style={{ ...btnStyleBase, background:"#0d1220", color:"#4a5568", width:"100%", marginBottom:12, fontSize:12 }}>+ 계좌 추가</button>

      <div style={{ display:"flex", gap:8 }}>
        <button onClick={onSave} style={{ ...btnStyleBase, background:"linear-gradient(135deg,#14532d,#166534)", color:"#4ade80", flex:1 }}>💾 저장</button>
        <button onClick={onCancel} style={{ ...btnStyleBase, background:"#1a2235", color:"#64748b" }}>취소</button>
      </div>
    </div>
  );
}

export default function AssetTracker() {
  const [records, setRecords] = useState(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : initialData; } catch { return initialData; }
  });
  const [activeTab, setActiveTab] = useState("dashboard");
  const [editingId, setEditingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRecord, setNewRecord] = useState({ year: new Date().getFullYear(), total: "", note: "" });
  const [editValues, setEditValues] = useState({});
  const [animIn, setAnimIn] = useState(true);

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); } catch {} }, [records]);
  useEffect(() => { setAnimIn(false); const t = setTimeout(() => setAnimIn(true), 50); return () => clearTimeout(t); }, [activeTab]);

  const sorted = [...records].sort((a, b) => a.year - b.year);
  const chartData = sorted.map((r, i) => ({ year: String(r.year), total: r.total, increase: i === 0 ? r.total : r.total - sorted[i-1].total }));
  const latest = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
  const growthRate = prev ? (((latest.total - prev.total) / prev.total) * 100).toFixed(1) : null;
  const totalGrowth = sorted.length > 1 ? (((latest.total - sorted[0].total) / sorted[0].total) * 100).toFixed(0) : null;

  function saveEdit(year) { setRecords(rs => rs.map(r => r.year === year ? { ...r, ...editValues } : r)); setEditingId(null); }
  function deleteRecord(year) { if (confirm(`${year}년 기록을 삭제할까요?`)) setRecords(rs => rs.filter(r => r.year !== year)); }
  function addRecord() {
    const yr = Number(newRecord.year), tot = Number(newRecord.total);
    if (!yr || !tot) return;
    if (records.find(r => r.year === yr)) { alert("이미 같은 연도 기록이 있어요."); return; }
    setRecords(rs => [...rs, { year: yr, total: tot, note: newRecord.note }]);
    setNewRecord({ year: new Date().getFullYear(), total: "", note: "" });
    setShowAddForm(false);
  }

  const tabs = [
    { id:"dashboard", label:"📊 대시보드" },
    { id:"records", label:"📋 기록" },
    { id:"invest", label:"💼 투자" },
    { id:"charts", label:"📈 차트" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#080b12 0%,#0d1220 50%,#080c18 100%)", fontFamily:"'Pretendard','Apple SD Gothic Neo',sans-serif", color:"#e2e8f0", padding:"0 0 60px" }}>
      {/* Header */}
      <div style={{ background:"linear-gradient(90deg,#0f1629 0%,#131b2e 100%)", borderBottom:"1px solid #1e2740", padding:"20px 24px 0", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ maxWidth:720, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
            <span style={{ fontSize:26 }}>💰</span>
            <div>
              <div style={{ fontWeight:800, fontSize:20, letterSpacing:"-0.5px", color:"#f0f4ff" }}>연도별 자산 기록</div>
              <div style={{ fontSize:11, color:"#4a5568", marginTop:1 }}>내 금융 여정 추적기</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:2, overflowX:"auto" }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                background: activeTab === t.id ? "linear-gradient(135deg,#1e3a5f,#1a3050)" : "transparent",
                border:"none", borderBottom: activeTab === t.id ? "2px solid #38bdf8" : "2px solid transparent",
                color: activeTab === t.id ? "#7dd3fc" : "#64748b",
                padding:"8px 14px", borderRadius:"8px 8px 0 0", cursor:"pointer",
                fontSize:12, fontWeight: activeTab === t.id ? 700 : 500, transition:"all 0.2s", whiteSpace:"nowrap",
              }}>{t.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:720, margin:"0 auto", padding:"24px 16px", opacity:animIn?1:0, transform:animIn?"translateY(0)":"translateY(8px)", transition:"all 0.3s ease" }}>

        {/* DASHBOARD */}
        {activeTab === "dashboard" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
              {[
                { label:"현재 총자산", value:`${latest?.total?.toLocaleString()}만원`, sub:`${latest?.year}년 기준`, accent:"#38bdf8" },
                { label:"전년 대비", value:growthRate?`+${growthRate}%`:"-", sub:`${prev?.year}→${latest?.year}`, accent:"#34d399" },
                { label:"누적 증가율", value:totalGrowth?`+${totalGrowth}%`:"-", sub:`${sorted[0]?.year}년 대비`, accent:"#a78bfa" },
                { label:"기록 기간", value:`${sorted.length}년`, sub:`${sorted[0]?.year} ~ ${latest?.year}`, accent:"#fb923c" },
              ].map((card,i) => (
                <div key={i} style={{ background:"linear-gradient(135deg,#0f1629 0%,#111827 100%)", border:`1px solid ${card.accent}22`, borderRadius:14, padding:"16px 18px", position:"relative", overflow:"hidden" }}>
                  <div style={{ position:"absolute",top:0,right:0,width:60,height:60, background:`radial-gradient(circle,${card.accent}18 0%,transparent 70%)` }} />
                  <div style={{ fontSize:11, color:"#4a5568", marginBottom:6 }}>{card.label}</div>
                  <div style={{ fontSize:20, fontWeight:800, color:card.accent, letterSpacing:"-0.5px" }}>{card.value}</div>
                  <div style={{ fontSize:11, color:"#374151", marginTop:4 }}>{card.sub}</div>
                </div>
              ))}
            </div>
            <div style={{ background:"#0f1629", border:"1px solid #1e2740", borderRadius:16, padding:"20px 16px 12px", marginBottom:20 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#94a3b8", marginBottom:16 }}>총자산 추이</div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2740" />
                  <XAxis dataKey="year" tick={{ fill:"#4a5568", fontSize:11 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="total" name="total" stroke="#38bdf8" strokeWidth={2.5} dot={{ fill:"#38bdf8",r:3 }} activeDot={{ r:6,fill:"#7dd3fc" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ background:"#0f1629", border:"1px solid #1e2740", borderRadius:16, padding:"20px" }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#94a3b8", marginBottom:14 }}>최근 기록</div>
              {[...sorted].reverse().slice(0,5).map((r,i) => {
                const idx = sorted.indexOf(r);
                const inc = idx > 0 ? r.total - sorted[idx-1].total : null;
                return (
                  <div key={r.year} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0", borderBottom:i<4?"1px solid #1a2235":"none" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ width:36,height:36,borderRadius:10, background:i===0?"linear-gradient(135deg,#1e3a5f,#1e4060)":"#0d1220", border:i===0?"1px solid #38bdf833":"1px solid #1e2740", display:"flex",alignItems:"center",justifyContent:"center", fontSize:11,fontWeight:800, color:i===0?"#7dd3fc":"#374151" }}>{r.year}</div>
                      <div>
                        <div style={{ fontWeight:700,fontSize:15,color:"#e2e8f0" }}>{r.total.toLocaleString()}<span style={{ fontSize:11,color:"#4a5568",marginLeft:2 }}>만원</span></div>
                        {inc!==null&&<div style={{ fontSize:11,color:"#34d399" }}>+{inc.toLocaleString()}만 증가</div>}
                      </div>
                    </div>
                    <div style={{ fontSize:18,fontWeight:800,color:"#38bdf8" }}>{formatKRW(r.total)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* RECORDS */}
        {activeTab === "records" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div style={{ fontSize:15,fontWeight:700,color:"#94a3b8" }}>전체 기록 <span style={{ color:"#374151" }}>({records.length}개)</span></div>
              <button onClick={() => setShowAddForm(v=>!v)} style={{ background:showAddForm?"#1a2235":"linear-gradient(135deg,#1e3a5f,#1a3050)", border:"1px solid #38bdf833", color:"#7dd3fc", borderRadius:10, padding:"8px 16px", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                {showAddForm ? "✕ 닫기" : "+ 추가"}
              </button>
            </div>
            {showAddForm && (
              <div style={{ background:"#0f1629", border:"1px solid #38bdf822", borderRadius:14, padding:18, marginBottom:16 }}>
                <div style={{ fontSize:13,fontWeight:700,color:"#7dd3fc",marginBottom:14 }}>새 기록 추가</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                  {[{ label:"연도",key:"year",type:"number",placeholder:"2026" },{ label:"총자산 (만원)",key:"total",type:"number",placeholder:"45000" }].map(f=>(
                    <div key={f.key}>
                      <div style={{ fontSize:11,color:"#4a5568",marginBottom:5 }}>{f.label}</div>
                      <input type={f.type} placeholder={f.placeholder} value={newRecord[f.key]} onChange={e=>setNewRecord(v=>({...v,[f.key]:e.target.value}))} style={inputStyle} />
                    </div>
                  ))}
                </div>
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:11,color:"#4a5568",marginBottom:5 }}>메모 (선택)</div>
                  <input placeholder="예: 보증금 26000, ISA 5800..." value={newRecord.note} onChange={e=>setNewRecord(v=>({...v,note:e.target.value}))} style={{ ...inputStyle,width:"100%",boxSizing:"border-box" }} />
                </div>
                <button onClick={addRecord} style={{ background:"linear-gradient(135deg,#1e3a5f,#1a3050)", border:"1px solid #38bdf833", color:"#7dd3fc", borderRadius:10,padding:"10px 20px",fontSize:13,fontWeight:700,cursor:"pointer",width:"100%" }}>💾 저장</button>
              </div>
            )}
            {[...sorted].reverse().map((r,i) => {
              const idx = sorted.indexOf(r);
              const inc = idx > 0 ? r.total - sorted[idx-1].total : null;
              const isEditing = editingId === r.year;
              return (
                <div key={r.year} style={{ background:"#0f1629", border:isEditing?"1px solid #38bdf855":"1px solid #1e2740", borderRadius:14, padding:"16px 18px", marginBottom:10, transition:"border 0.2s" }}>
                  {isEditing ? (
                    <div>
                      <div style={{ fontSize:13,fontWeight:700,color:"#7dd3fc",marginBottom:12 }}>{r.year}년 수정</div>
                      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10 }}>
                        <div>
                          <div style={{ fontSize:11,color:"#4a5568",marginBottom:5 }}>총자산 (만원)</div>
                          <input type="number" value={editValues.total??r.total} onChange={e=>setEditValues(v=>({...v,total:Number(e.target.value)}))} style={inputStyle} />
                        </div>
                        <div>
                          <div style={{ fontSize:11,color:"#4a5568",marginBottom:5 }}>메모</div>
                          <input value={editValues.note??r.note??""} onChange={e=>setEditValues(v=>({...v,note:e.target.value}))} style={inputStyle} />
                        </div>
                      </div>
                      <div style={{ display:"flex",gap:8 }}>
                        <button onClick={()=>saveEdit(r.year)} style={{ ...btnStyleBase,background:"linear-gradient(135deg,#14532d,#166534)",color:"#4ade80",flex:1 }}>✓ 저장</button>
                        <button onClick={()=>setEditingId(null)} style={{ ...btnStyleBase,background:"#1a2235",color:"#64748b" }}>취소</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display:"flex",alignItems:"center" }}>
                      <div style={{ width:46,height:46,borderRadius:12,flexShrink:0, background:i===0?"linear-gradient(135deg,#1e3a5f,#1a3050)":"#0d1220", border:i===0?"1px solid #38bdf833":"1px solid #1e2740", display:"flex",alignItems:"center",justifyContent:"center", fontSize:12,fontWeight:800, color:i===0?"#7dd3fc":"#374151",marginRight:14 }}>{r.year}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:800,fontSize:17,color:"#e2e8f0" }}>{r.total.toLocaleString()}<span style={{ fontSize:12,fontWeight:400,color:"#4a5568",marginLeft:2 }}>만원</span></div>
                        {inc!==null&&<div style={{ fontSize:12,color:"#34d399",marginTop:2 }}>↑ +{inc.toLocaleString()}만 ({((inc/(r.total-inc))*100).toFixed(1)}%)</div>}
                        {r.note&&<div style={{ fontSize:11,color:"#374151",marginTop:3 }}>{r.note}</div>}
                      </div>
                      <div style={{ textAlign:"right",marginRight:12 }}>
                        <div style={{ fontSize:20,fontWeight:800,color:"#38bdf8" }}>{formatKRW(r.total)}</div>
                      </div>
                      <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                        <button onClick={()=>{ setEditingId(r.year); setEditValues({ total:r.total,note:r.note||"" }); }} style={{ ...iconBtn,color:"#7dd3fc" }}>✏️</button>
                        <button onClick={()=>deleteRecord(r.year)} style={{ ...iconBtn,color:"#f87171" }}>🗑</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* INVEST TAB */}
        {activeTab === "invest" && <InvestTab />}

        {/* CHARTS */}
        {activeTab === "charts" && (
          <div>
            <div style={chartCard}>
              <div style={chartTitle}>📈 총자산 성장 곡선</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2235" />
                  <XAxis dataKey="year" tick={{ fill:"#4a5568",fontSize:11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v=>`${v/10000>=1?(v/10000).toFixed(0)+"억":v+"만"}`} tick={{ fill:"#4a5568",fontSize:10 }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="total" name="total" stroke="#38bdf8" strokeWidth={3} dot={{ fill:"#38bdf8",r:4,strokeWidth:0 }} activeDot={{ r:7,fill:"#7dd3fc" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={chartCard}>
              <div style={chartTitle}>📊 연간 순증가액</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData.slice(1)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2235" />
                  <XAxis dataKey="year" tick={{ fill:"#4a5568",fontSize:11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v=>`${v}만`} tick={{ fill:"#4a5568",fontSize:10 }} axisLine={false} tickLine={false} width={44} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="increase" name="increase" fill="#34d399" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ background:"#0f1629",border:"1px solid #1e2740",borderRadius:16,padding:20 }}>
              <div style={chartTitle}>📋 연도별 요약</div>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%",borderCollapse:"collapse",fontSize:13 }}>
                  <thead>
                    <tr>{["연도","총자산","순증가","증가율"].map(h=><th key={h} style={{ textAlign:"right",color:"#4a5568",fontWeight:600,padding:"6px 8px",borderBottom:"1px solid #1a2235" }}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {[...sorted].reverse().map((r,i)=>{
                      const idx=sorted.indexOf(r);
                      const inc=idx>0?r.total-sorted[idx-1].total:null;
                      const pct=inc&&(r.total-inc)>0?((inc/(r.total-inc))*100).toFixed(1):null;
                      return (
                        <tr key={r.year} style={{ borderBottom:"1px solid #0d1220" }}>
                          <td style={{ padding:"10px 8px",color:i===0?"#7dd3fc":"#64748b",fontWeight:i===0?700:400 }}>{r.year}</td>
                          <td style={{ textAlign:"right",padding:"10px 8px",fontWeight:700,color:"#e2e8f0" }}>{r.total.toLocaleString()}만</td>
                          <td style={{ textAlign:"right",padding:"10px 8px",color:inc?"#34d399":"#374151" }}>{inc?`+${inc.toLocaleString()}만`:"-"}</td>
                          <td style={{ textAlign:"right",padding:"10px 8px",color:pct?"#a78bfa":"#374151" }}>{pct?`+${pct}%`:"-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle = { background:"#0d1220", border:"1px solid #1e2740", borderRadius:8, color:"#e2e8f0", padding:"9px 12px", fontSize:14, width:"100%", boxSizing:"border-box", outline:"none" };
const btnStyleBase = { border:"none", borderRadius:8, padding:"8px 14px", fontSize:13, fontWeight:700, cursor:"pointer" };
const iconBtn = { background:"transparent", border:"none", cursor:"pointer", fontSize:14, padding:"4px", borderRadius:6 };
const chartCard = { background:"#0f1629", border:"1px solid #1e2740", borderRadius:16, padding:"20px 16px 12px", marginBottom:16 };
const chartTitle = { fontSize:13, fontWeight:700, color:"#94a3b8", marginBottom:16 };
