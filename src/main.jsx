import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import { adminAccount } from "./data/demo-data";
import { supabase } from "./supabase";
import "./styles.css";

const priorityLabels = {
  High: "สูง",
  Normal: "กลาง",
  Low: "ต่ำ",
  สูง: "สูง",
  กลาง: "กลาง",
  ต่ำ: "ต่ำ",
};
const priorityClasses = {
  High: "high",
  Normal: "medium",
  Low: "low",
  สูง: "high",
  กลาง: "medium",
  ต่ำ: "low",
};

function App() {
  const [user, setUser] = useState(null),
    [page, setPage] = useState("calendar");
  const [emps, setEmps] = useState([]),
    [plans, setPlans] = useState([]),
    [history, setHistory] = useState([]);
  const [dataReady, setDataReady] = useState(false);
  const [dataError, setDataError] = useState("");
  const [toast, setToast] = useState("");
  const savedStateRef = useRef("");
  const hasPendingSaveRef = useRef(false);
  useEffect(() => {
    let active = true;
    const loadData = async () => {
      // ❌ ห้ามโหลดถ้ากำลังมี save ค้างอยู่
      if (hasPendingSaveRef.current) return;
      if (!supabase) {
        if (active) {
          setDataError("ไม่พบการตั้งค่าการเชื่อมต่อฐานข้อมูล");
        }
        return;
      }
      const { data, error } = await supabase
        .from("app_state")
        .select("data")
        .eq("id", 1)
        .maybeSingle();
      if (!active) return;
      // ❌ ห้ามโหลดถ้า save เพิ่งเริ่มระหว่างรอ network
      if (hasPendingSaveRef.current) return;
      if (error) {
        setDataError("ไม่สามารถโหลดข้อมูลจากฐานข้อมูลได้");
        return;
      }
      if (data?.data) {
        const employees = (data.data.employees ?? []).map((employee) =>
          employee.role === "Employee"
            ? { ...employee, role: "Supervisor" }
            : employee,
        );
        const plans = (data.data.plans ?? []).map((plan) => ({
          ...plan,
          priority: priorityLabels[plan.priority] ?? plan.priority,
        }));
        const incoming = JSON.stringify({
          employees,
          plans,
          history: data.data.history ?? [],
        });
        // ✅ อัปเดต state เฉพาะเมื่อข้อมูลจาก Supabase ต่างจาก local จริงๆ
        if (incoming !== savedStateRef.current) {
          savedStateRef.current = incoming;
          setEmps(employees);
          setPlans(plans);
          setHistory(data.data.history ?? []);
        }
      }
      setDataReady(true);
    };
    loadData();
    const syncInterval = window.setInterval(loadData, 10000);
    return () => {
      active = false;
      window.clearInterval(syncInterval);
    };
  }, []);
  // ✅ เก็บ state ล่าสุดไว้เสมอ เพื่อให้ save loop อ่านได้ถูกต้อง
  const latestStateRef = useRef(null);
  useEffect(() => {
    if (!dataReady || !supabase) return;
    const nextState = { employees: emps, plans, history };
    const serializedState = JSON.stringify(nextState);
    if (serializedState === savedStateRef.current) return;

    // อัปเดต ref ให้เป็น state ล่าสุดเสมอ
    latestStateRef.current = { nextState, serializedState };
    hasPendingSaveRef.current = true;

    const saveData = window.setTimeout(async () => {
      // ✅ อ่านจาก ref ล่าสุด ไม่ใช่ closure เก่า
      const toSave = latestStateRef.current;
      if (!toSave) return;
      const { error } = await supabase.from("app_state").upsert(
        {
          id: 1,
          data: toSave.nextState,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );
      if (error) {
        setDataError("ไม่สามารถบันทึกข้อมูลลงฐานข้อมูลได้");
      } else {
        savedStateRef.current = toSave.serializedState;
      }
      hasPendingSaveRef.current = false;
    }, 500);

    return () => {
      // ✅ แค่ยกเลิก timer — ไม่ save state เก่า ไม่ reset flag
      // effect ใหม่จะ schedule timer ใหม่พร้อม state ล่าสุดแทน
      window.clearTimeout(saveData);
    };
  }, [dataReady, emps, plans, history]);
  const notify = (m) => {
    setToast(m);
    setTimeout(() => setToast(""), 1800);
  };
  if (dataError)
    return <div className="data-message">{dataError}</div>;
  if (!dataReady)
    return <div className="data-message">กำลังโหลดข้อมูล...</div>;
  if (!user)
    return (
      <Login
        emps={emps}
        onLogin={(u) => {
          setUser(u);
          setPage("calendar");
        }}
      />
    );
  const isAdmin = user.role === "Admin",
    isManager = user.role === "PM",
    isSupervisor = user.role === "Supervisor",
    isOM = user.role === "OM",
    isGM = user.role === "GM";
  const pending = plans.filter((p) => p.status === "Pending").length;
  const menu = [
    ["plan", "📝", isManager || isSupervisor || isAdmin || isOM || isGM ? "Plans" : "My Plan"],
    ["calendar", "📅", "Calendar"],
    ["dashboard", "📊", "Dashboard"],
    ...(isAdmin
      ? [
        ["admin", "👑", "Admin Management"],
        ["team", "👥", "Team Status"],
      ]
      : []),
    ...(isManager
      ? [
        ["team", "👥", "Team Status"],
        ["approval", "🔵", "Approval Center"],
      ]
      : []),
    ...(isOM
      ? [
        ["team", "👥", "Team Status"],
        ["approval", "🔵", "Approval Center"],
      ]
      : []),
    ...(isGM
      ? [
        ["team", "👥", "Team Status"],
      ]
      : []),
    ["history", "🕒", "Approval History"],
  ];
  const nav = (p) => {
    setPage(p);
    document.querySelector(".drawer")?.classList.remove("open");
  };
  return (
    <div className="app">
      <header>
        <button
          className="hamb"
          onClick={() =>
            document.querySelector(".drawer")?.classList.toggle("open")
          }
        >
          ☰
        </button>
        <div className="logo">TEAM PLANNER</div>
        <div className="user">{user.role} · {user.name}</div>
      </header>
      <div className="layout">
        <aside className="drawer">
          {menu.map(([id, ic, label]) => (
            <button
              key={id}
              className={page === id ? "active" : ""}
              onClick={() => nav(id)}
            >
              <span>{ic}</span>
              {label}
            </button>
          ))}
          <button className="logout menu-logout" onClick={() => setUser(null)}>
            ออกจากระบบ
          </button>
        </aside>
        <main>
          {page === "dashboard" && (
            <Dashboard emps={emps} plans={plans} pending={pending} history={history} user={user} />
          )}
          {page === "admin" && (
            <Admin
              emps={emps}
              setEmps={setEmps}
              plans={plans}
              setPlans={setPlans}
              notify={notify}
            />
          )}
          {page === "team" && <Team emps={emps} plans={plans} user={user} />}
          {page === "approval" && (
            <Approval
              plans={plans}
              setPlans={setPlans}
              history={history}
              setHistory={setHistory}
              emps={emps}
              user={user}
              notify={notify}
            />
          )}
          {page === "plan" && (
            <Plan
              plans={plans}
              setPlans={setPlans}
              emps={emps}
              user={user}
              notify={notify}
            />
          )}
          {page === "calendar" && (
            <Calendar
              plans={plans}
              setPlans={setPlans}
              emps={emps}
              user={user}
            />
          )}
          {page === "history" && <History history={history} plans={plans} user={user} />}
        </main>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function Login({ emps, onLogin }) {
  const accounts = [
    adminAccount,
    ...emps.filter((employee) => employee.active),
  ];
  const savedLogin = (() => {
    try {
      return JSON.parse(localStorage.getItem("team-planner-saved-login"));
    } catch {
      return null;
    }
  })();
  const [id, setId] = useState(savedLogin?.id ?? accounts[0]?.id);
  const [password, setPassword] = useState(savedLogin?.password ?? "");
  const [rememberLogin, setRememberLogin] = useState(Boolean(savedLogin));
  const [error, setError] = useState("");
  const submit = () => {
    const account = accounts.find((x) => x.id === id);
    if (!account || account.password !== password) {
      setError("รหัสผ่านไม่ถูกต้อง");
      return;
    }
    setError("");
    if (rememberLogin) {
      localStorage.setItem(
        "team-planner-saved-login",
        JSON.stringify({ id, password }),
      );
    } else {
      localStorage.removeItem("team-planner-saved-login");
    }
    onLogin(account);
  };
  return (
    <div className="login">
      <div className="login-card">
        <div className="logo dark">TEAM PLANNER</div>
        <h2>เข้าสู่ระบบ</h2>
        <p className="muted">เลือกบัญชีและกรอกรหัสผ่าน</p>
        <select
          value={id}
          onChange={(e) => {
            setId(+e.target.value);
            setError("");
          }}
        >
          {accounts.map((x) => (
            <option value={x.id} key={x.id}>
              {x.name} — {x.role}
            </option>
          ))}
        </select>
        <input
          type="password"
          placeholder="รหัสผ่าน"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <label className="remember-login">
          <input
            type="checkbox"
            checked={rememberLogin}
            onChange={(e) => {
              const checked = e.target.checked;
              setRememberLogin(checked);
              if (!checked) {
                localStorage.removeItem("team-planner-saved-login");
              }
            }}
          />
          <span>จดจำรหัสผ่านบนอุปกรณ์นี้</span>
        </label>
        {error && <p className="error-text">{error}</p>}
        <button className="btn primary full" onClick={submit}>
          เข้าสู่ระบบ
        </button>
      </div>
    </div>
  );
}
const Card = ({ children, className = "" }) => (
  <div className={"card " + className}>{children}</div>
);
const OVERVIEW_ROLES = ["Admin", "PM", "OM", "GM", "MD"];

/* ── Shared: Donut SVG ── */
function DonutChart({ data, label }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let cum = 0;
  const segs = data.map((d) => {
    const pct = (d.value / total) * 100;
    const s = { ...d, pct, offset: cum };
    cum += pct;
    return s;
  });
  return (
    <div className="db-donut-wrap">
      <svg viewBox="0 0 42 42" className="db-donut-svg">
        <circle cx="21" cy="21" r="15.9" fill="none" stroke="#f1f5f9" strokeWidth="3.8" />
        {segs.filter((d) => d.value > 0).map((d, i) => (
          <circle key={i} cx="21" cy="21" r="15.9" fill="none"
            stroke={d.color} strokeWidth="3.8"
            strokeDasharray={`${d.pct} ${100 - d.pct}`}
            strokeDashoffset={25 - d.offset} strokeLinecap="round" />
        ))}
        <text x="21" y="19" textAnchor="middle" fontSize="5.5" fontWeight="700" fill="#172033">{total}</text>
        <text x="21" y="25" textAnchor="middle" fontSize="3" fill="#687386">{label}</text>
      </svg>
      <div className="db-donut-legend">
        {data.map((d) => (
          <div className="db-legend-item" key={d.label}>
            <span className="db-legend-dot" style={{ background: d.color }} />
            <span className="db-legend-label">{d.label}</span>
            <span className="db-legend-val">{d.value}</span>
            <span className="db-legend-pct">({total > 0 ? Math.round(d.value / total * 100) : 0}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Personal Dashboard (Supervisor) ── */
function PersonalDashboard({ user, plans, history }) {
  const myPlans = plans.filter((p) => p.empId === user.id);
  const myApproved = myPlans.filter((p) => p.status === "Approved").length;
  const myPending = myPlans.filter((p) => p.status === "Pending").length;
  const myRejected = myPlans.filter((p) => p.status === "Cancelled").length;
  const myDone = myPlans.filter((p) => p.done).length;
  const myTotal = myPlans.length;
  const myRate = myTotal ? Math.round((myApproved / myTotal) * 100) : 0;

  const myHistory = (history ?? []).filter((h) =>
    myPlans.some((p) => p.id === h.planId)
  ).slice(0, 5);

  const priorityStats = ["สูง", "กลาง", "ต่ำ"].map((p) => ({
    label: p,
    count: myPlans.filter((pl) => pl.priority === p).length,
    color: p === "สูง" ? "#b42318" : p === "กลาง" ? "#b54708" : "#067647",
  }));
  const prMax = Math.max(...priorityStats.map((p) => p.count), 1);

  // Monthly plan trend (last 4 months)
  const monthlyData = Array.from({ length: 4 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (3 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("th-TH", { month: "short" });
    const count = myPlans.filter((p) => p.date?.startsWith(key)).length;
    return { key, label, count };
  });
  const monthMax = Math.max(...monthlyData.map((m) => m.count), 1);

  const donutData = [
    { label: "อนุมัติ", value: myApproved, color: "#15803d" },
    { label: "รออนุมัติ", value: myPending, color: "#1769aa" },
    { label: "ยกเลิก", value: myRejected, color: "#d92d20" },
    { label: "เสร็จแล้ว", value: myDone, color: "#7c3aed" },
  ];

  const kpiCards = [
    { label: "แผนทั้งหมด", value: myTotal, icon: "📝", color: "#1769aa", sub: "ของฉัน" },
    { label: "อนุมัติแล้ว", value: myApproved, icon: "✅", color: "#15803d", sub: myTotal ? `${myRate}% ของแผน` : "0%" },
    { label: "รออนุมัติ", value: myPending, icon: "⏳", color: "#d97706", sub: "รอผู้บังคับบัญชา" },
    { label: "เสร็จสมบูรณ์", value: myDone, icon: "🏆", color: "#0891b2", sub: "mark done แล้ว" },
  ];

  return (
    <>
      <div className="db-header">
        <div>
          <h1>📊 My Dashboard</h1>
          <p className="muted">สวัสดี, <b>{user.name}</b> · {user.role} · {user.dept}</p>
        </div>
        <span className="db-date">{new Date().toLocaleDateString("th-TH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
      </div>

      {/* KPI Cards */}
      <div className="db-kpi-grid db-kpi-grid-4">
        {kpiCards.map((k) => (
          <div className="db-kpi-card" key={k.label} style={{ "--kpi-color": k.color }}>
            <div className="db-kpi-icon">{k.icon}</div>
            <div className="db-kpi-body">
              <div className="db-kpi-value">{k.value}</div>
              <div className="db-kpi-label">{k.label}</div>
              <div className="db-kpi-sub">{k.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="db-row">
        {/* Donut + Rate */}
        <div className="card db-donut-card">
          <h3 className="db-section-title">🍩 สถานะแผนงานของฉัน</h3>
          <DonutChart data={donutData} label="แผนงาน" />
          <div className="db-my-rate-row">
            <div className="db-completion-ring" style={{marginTop:16}}>
              <svg viewBox="0 0 36 36" style={{width:72,height:72}}>
                <circle cx="18" cy="18" r="14" fill="none" stroke="#e2e8f0" strokeWidth="3"/>
                <circle cx="18" cy="18" r="14" fill="none"
                  stroke={myRate >= 80 ? "#15803d" : myRate >= 50 ? "#b54708" : "#d92d20"}
                  strokeWidth="3"
                  strokeDasharray={`${myTotal ? (myApproved / myTotal) * 87.96 : 0} 87.96`}
                  strokeDashoffset="22" strokeLinecap="round"/>
                <text x="18" y="20" textAnchor="middle" fontSize="6" fontWeight="700" fill="#172033">{myRate}%</text>
              </svg>
              <div>
                <div style={{fontWeight:700}}>อัตราอนุมัติ</div>
                <div className="muted">{myApproved} / {myTotal} แผน</div>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="card db-chart-card">
          <h3 className="db-section-title">📈 แผนงานรายเดือน (4 เดือนล่าสุด)</h3>
          <div className="db-bar-chart">
            {monthlyData.map((m) => (
              <div className="db-bar-item" key={m.key}>
                <span className="db-bar-name">{m.label}</span>
                <div className="db-bar-track">
                  <div className="db-bar-fill" style={{ width: `${(m.count / monthMax) * 100}%` }}>
                    <span className="db-bar-val">{m.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <h3 className="db-section-title" style={{marginTop:20}}>🎯 ระดับความสำคัญ</h3>
          <div className="db-priority-list">
            {priorityStats.map((p) => (
              <div className="db-priority-item" key={p.label}>
                <div className="db-priority-row">
                  <span className="db-priority-dot" style={{ background: p.color }} />
                  <span className="db-priority-label">{p.label === "สูง" ? "🔴 สูง" : p.label === "กลาง" ? "🟡 กลาง" : "🟢 ต่ำ"}</span>
                  <span className="db-priority-count">{p.count}</span>
                </div>
                <div className="db-priority-track">
                  <div className="db-priority-fill" style={{ width: `${(p.count / prMax) * 100}%`, background: p.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Plans + Activity */}
      <div className="db-row">
        <div className="card">
          <h3 className="db-section-title">📋 แผนงานล่าสุดของฉัน</h3>
          <div className="db-my-plans">
            {myPlans.slice().sort((a,b) => b.date?.localeCompare(a.date)).slice(0, 6).map((p) => (
              <div className="db-my-plan-item" key={p.id}>
                <div className="db-my-plan-date">{p.date}</div>
                <div className="db-my-plan-task">{p.task}</div>
                <div className="db-my-plan-meta">
                  <span className={`status ${p.status}`}>{p.status}</span>
                  <span className={`key-dot ${p.priority === "สูง" ? "high" : p.priority === "กลาง" ? "medium" : "low"}`} style={{display:"inline-block"}} />
                  <span className="muted" style={{fontSize:11}}>{p.priority}</span>
                  {p.done && <span className="db-done-badge">✓ เสร็จ</span>}
                </div>
              </div>
            ))}
            {myPlans.length === 0 && <p className="muted">ยังไม่มีแผนงาน</p>}
          </div>
        </div>

        <div className="card db-activity-card">
          <h3 className="db-section-title">🕒 ประวัติการอนุมัติของฉัน</h3>
          <div className="db-activity-list">
            {myHistory.map((h) => {
              const actionColor = h.action === "Approved" ? "#15803d" : h.action === "Cancelled" ? "#d92d20" : "#d97706";
              const actionIcon = h.action === "Approved" ? "✅" : h.action === "Cancelled" ? "❌" : "↩️";
              const plan = myPlans.find((p) => p.id === h.planId);
              return (
                <div className="db-activity-item" key={h.id}>
                  <div className="db-activity-icon" style={{ background: actionColor + "22", color: actionColor }}>{actionIcon}</div>
                  <div className="db-activity-body">
                    <div className="db-activity-title"><b>{h.by}</b> {h.action === "Approved" ? "อนุมัติ" : h.action === "Cancelled" ? "ยกเลิก" : "ส่ง reply"}</div>
                    <div className="muted">{plan?.task?.slice(0, 45)}{plan?.task?.length > 45 ? "…" : ""}</div>
                    <div className="db-activity-time">{h.time}</div>
                  </div>
                </div>
              );
            })}
            {myHistory.length === 0 && <p className="muted">ยังไม่มีประวัติ</p>}
          </div>
        </div>
      </div>
    </>
  );
}

function Dashboard({ emps, plans, pending, history, user }) {
  if (!OVERVIEW_ROLES.includes(user.role)) {
    return <PersonalDashboard user={user} plans={plans} history={history} />;
  }
  const approved = plans.filter((p) => p.status === "Approved").length;
  const rejected = plans.filter((p) => p.status === "Cancelled").length;
  const inProgress = plans.filter((p) => p.done).length;
  const totalPlans = plans.length;

  // แผนตามแผนก
  const depts = [...new Set(emps.map((e) => e.dept))];
  const deptStats = depts.map((dept) => {
    const deptEmps = emps.filter((e) => e.dept === dept).map((e) => e.id);
    const deptPlans = plans.filter((p) => deptEmps.includes(p.empId));
    return {
      dept,
      total: deptPlans.length,
      approved: deptPlans.filter((p) => p.status === "Approved").length,
      pending: deptPlans.filter((p) => p.status === "Pending").length,
    };
  }).sort((a, b) => b.total - a.total);

  // Top performers (Supervisor ที่มีงานอนุมัติมากสุด)
  const supervisors = emps.filter((e) => e.role === "Supervisor" && e.active);
  const topPerformers = supervisors
    .map((e) => {
      const empPlans = plans.filter((p) => p.empId === e.id);
      return {
        name: e.name,
        dept: e.dept,
        total: empPlans.length,
        approved: empPlans.filter((p) => p.status === "Approved").length,
        done: empPlans.filter((p) => p.done).length,
        rate: empPlans.length
          ? Math.round((empPlans.filter((p) => p.status === "Approved").length / empPlans.length) * 100)
          : 0,
      };
    })
    .sort((a, b) => b.approved - a.approved)
    .slice(0, 5);

  // Bar chart — งานรายคน (top 6)
  const barData = supervisors
    .map((e) => ({
      name: e.name.split(" ")[0],
      total: plans.filter((p) => p.empId === e.id).length,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);
  const barMax = Math.max(...barData.map((d) => d.total), 1);

  // Donut chart data
  const donutData = [
    { label: "อนุมัติ", value: approved, color: "#15803d" },
    { label: "รออนุมัติ", value: pending, color: "#1769aa" },
    { label: "ยกเลิก", value: rejected, color: "#d92d20" },
    { label: "เสร็จแล้ว", value: inProgress, color: "#7c3aed" },
  ];

  // Priority breakdown
  const priorityStats = ["สูง", "กลาง", "ต่ำ"].map((p) => ({
    label: p,
    count: plans.filter((pl) => pl.priority === p).length,
    color: p === "สูง" ? "#b42318" : p === "กลาง" ? "#b54708" : "#067647",
  }));
  const prMax = Math.max(...priorityStats.map((p) => p.count), 1);

  // Recent history (latest 5)
  const recentHistory = [...(history ?? [])].slice(0, 5);

  const kpiCards = [
    { label: "พนักงานทั้งหมด", value: emps.filter(e=>e.active).length, icon: "👥", color: "#1769aa", sub: `${emps.length} คนในระบบ` },
    { label: "แผนทั้งหมด", value: totalPlans, icon: "📝", color: "#7c3aed", sub: `${new Set(plans.map(p=>p.empId)).size} คนส่งแผน` },
    { label: "อนุมัติแล้ว", value: approved, icon: "✅", color: "#15803d", sub: totalPlans ? `${Math.round(approved/totalPlans*100)}% ของทั้งหมด` : "0%" },
    { label: "รออนุมัติ", value: pending, icon: "⏳", color: "#d97706", sub: "ต้องดำเนินการ" },
    { label: "เสร็จสมบูรณ์", value: inProgress, icon: "🏆", color: "#0891b2", sub: "mark done แล้ว" },
    { label: "ยกเลิก/ปฏิเสธ", value: rejected, icon: "❌", color: "#d92d20", sub: "ต้องแก้ไข" },
  ];

  return (
    <>
      <div className="db-header">
        <h1>📊 Dashboard</h1>
        <span className="db-date">{new Date().toLocaleDateString("th-TH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
      </div>

      {/* KPI Cards */}
      <div className="db-kpi-grid">
        {kpiCards.map((k) => (
          <div className="db-kpi-card" key={k.label} style={{ "--kpi-color": k.color }}>
            <div className="db-kpi-icon">{k.icon}</div>
            <div className="db-kpi-body">
              <div className="db-kpi-value">{k.value}</div>
              <div className="db-kpi-label">{k.label}</div>
              <div className="db-kpi-sub">{k.sub}</div>
            </div>
            <div className="db-kpi-bar" style={{ background: k.color, opacity: 0.12, width: "4px", borderRadius: "4px", alignSelf: "stretch" }} />
          </div>
        ))}
      </div>

      <div className="db-row">
        {/* Bar Chart */}
        <div className="card db-chart-card">
          <h3 className="db-section-title">📈 จำนวนแผนงานรายคน</h3>
          <div className="db-bar-chart">
            {barData.map((d) => (
              <div className="db-bar-item" key={d.name}>
                <span className="db-bar-name">{d.name}</span>
                <div className="db-bar-track">
                  <div
                    className="db-bar-fill"
                    style={{ width: `${(d.total / barMax) * 100}%` }}
                  >
                    <span className="db-bar-val">{d.total}</span>
                  </div>
                </div>
              </div>
            ))}
            {barData.length === 0 && <p className="muted">ยังไม่มีข้อมูล</p>}
          </div>
        </div>

        {/* Donut Chart */}
        <div className="card db-donut-card">
          <h3 className="db-section-title">🍩 สัดส่วนสถานะแผนงาน</h3>
          <DonutChart data={donutData} label="แผนงาน" />
        </div>
      </div>

      <div className="db-row">
        {/* Dept breakdown */}
        <div className="card db-dept-card">
          <h3 className="db-section-title">🏢 แผนงานตามแผนก</h3>
          <div className="db-dept-list">
            {deptStats.map((d) => (
              <div className="db-dept-item" key={d.dept}>
                <div className="db-dept-header">
                  <span className="db-dept-name">{d.dept}</span>
                  <span className="db-dept-total">{d.total} แผน</span>
                </div>
                <div className="db-dept-track">
                  <div className="db-dept-approved" style={{ width: d.total ? `${(d.approved / d.total) * 100}%` : "0%" }} />
                  <div className="db-dept-pending" style={{ width: d.total ? `${(d.pending / d.total) * 100}%` : "0%" }} />
                </div>
                <div className="db-dept-tags">
                  <span style={{ color: "#15803d" }}>✓ {d.approved} อนุมัติ</span>
                  <span style={{ color: "#1769aa" }}>⏳ {d.pending} รอ</span>
                </div>
              </div>
            ))}
            {deptStats.length === 0 && <p className="muted">ยังไม่มีข้อมูล</p>}
          </div>
        </div>

        {/* Priority breakdown */}
        <div className="card db-priority-card">
          <h3 className="db-section-title">🎯 ระดับความสำคัญ</h3>
          <div className="db-priority-list">
            {priorityStats.map((p) => (
              <div className="db-priority-item" key={p.label}>
                <div className="db-priority-row">
                  <span className="db-priority-dot" style={{ background: p.color }} />
                  <span className="db-priority-label">{p.label === "สูง" ? "🔴 สูง" : p.label === "กลาง" ? "🟡 กลาง" : "🟢 ต่ำ"}</span>
                  <span className="db-priority-count">{p.count}</span>
                </div>
                <div className="db-priority-track">
                  <div className="db-priority-fill" style={{ width: `${(p.count / prMax) * 100}%`, background: p.color }} />
                </div>
              </div>
            ))}
          </div>
          <div className="db-completion-section">
            <h3 className="db-section-title" style={{marginTop:"18px"}}>⚡ อัตราความสำเร็จ</h3>
            <div className="db-completion-ring">
              <svg viewBox="0 0 36 36" style={{width:80,height:80}}>
                <circle cx="18" cy="18" r="14" fill="none" stroke="#e2e8f0" strokeWidth="3"/>
                <circle cx="18" cy="18" r="14" fill="none" stroke="#15803d" strokeWidth="3"
                  strokeDasharray={`${totalPlans ? (approved/totalPlans)*87.96 : 0} 87.96`}
                  strokeDashoffset="22" strokeLinecap="round"/>
                <text x="18" y="20" textAnchor="middle" fontSize="6" fontWeight="700" fill="#172033">
                  {totalPlans ? Math.round(approved/totalPlans*100) : 0}%
                </text>
              </svg>
              <div>
                <div style={{fontWeight:700,fontSize:15}}>อนุมัติแล้ว</div>
                <div className="muted">{approved} / {totalPlans} แผน</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="db-row">
        {/* Top Performers */}
        <div className="card db-top-card">
          <h3 className="db-section-title">🏅 Top Performers</h3>
          <div className="db-top-list">
            {topPerformers.map((p, i) => (
              <div className="db-top-item" key={p.name}>
                <div className="db-top-rank">{["🥇","🥈","🥉","4️⃣","5️⃣"][i]}</div>
                <div className="db-top-info">
                  <div className="db-top-name">{p.name}</div>
                  <div className="muted">{p.dept}</div>
                </div>
                <div className="db-top-stats">
                  <span className="db-top-stat">{p.approved} อนุมัติ</span>
                  <span className="db-top-stat done">{p.done} เสร็จ</span>
                </div>
                <div className="db-top-rate" style={{color: p.rate >= 80 ? "#15803d" : p.rate >= 50 ? "#b54708" : "#d92d20"}}>
                  {p.rate}%
                </div>
              </div>
            ))}
            {topPerformers.length === 0 && <p className="muted">ยังไม่มีข้อมูล</p>}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card db-activity-card">
          <h3 className="db-section-title">🕒 กิจกรรมล่าสุด</h3>
          <div className="db-activity-list">
            {recentHistory.map((h) => {
              const plan = plans.find((p) => p.id === h.planId);
              const emp = emps.find((e) => e.id === plan?.empId);
              const actionColor = h.action === "Approved" ? "#15803d" : h.action === "Cancelled" ? "#d92d20" : "#d97706";
              const actionIcon = h.action === "Approved" ? "✅" : h.action === "Cancelled" ? "❌" : "↩️";
              return (
                <div className="db-activity-item" key={h.id}>
                  <div className="db-activity-icon" style={{ background: actionColor + "22", color: actionColor }}>{actionIcon}</div>
                  <div className="db-activity-body">
                    <div className="db-activity-title">
                      <b>{h.by}</b> {h.action === "Approved" ? "อนุมัติ" : h.action === "Cancelled" ? "ยกเลิก" : "ส่ง reply"} แผนของ <b>{emp?.name ?? "?"}</b>
                    </div>
                    <div className="muted">{plan?.task?.slice(0, 40)}{plan?.task?.length > 40 ? "…" : ""}</div>
                    <div className="db-activity-time">{h.time}</div>
                  </div>
                </div>
              );
            })}
            {recentHistory.length === 0 && <p className="muted">ยังไม่มีกิจกรรม</p>}
          </div>
        </div>
      </div>
    </>
  );
}
function Admin({ emps, setEmps, plans, setPlans, notify }) {
  const [form, setForm] = useState({
    code: "",
    name: "",
    dept: "Operations",
    role: "Supervisor",
    managerId: "",
  });
  const leaderConfig = {
    Supervisor: { role: "PM", label: "PM" },
    PM: { role: "OM", label: "OM (Operation Manager)" },
  };
  const leader = leaderConfig[form.role];
  const leaders = leader
    ? emps.filter((employee) => employee.role === leader.role)
    : [];
  const roleOrder = { MD: 1, GM: 2, OM: 3, PM: 4, Supervisor: 5, Admin: 6 };
  return (
    <>
      <h1>👑 Admin Management</h1>
      <Card>
        <h3>เพิ่มพนักงาน</h3>
        <div className="form-grid">
          {Object.entries({
            code: "Employee ID",
            name: "ชื่อ-นามสกุล",
            dept: "แผนก",
          }).map(([k, l]) => (
            <label key={k}>
              {l}
              <input
                value={form[k]}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              />
            </label>
          ))}
          <label>
            Role
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option>PM</option>
              <option>Supervisor</option>
              <option>OM</option>
              <option>MD</option>
              <option>GM</option>
              <option>Admin</option>
            </select>
          </label>
          {leader && (
            <label>
              {leader.label}
              <select
                value={form.managerId}
                onChange={(e) =>
                  setForm({
                    ...form,
                    managerId: e.target.value ? Number(e.target.value) : "",
                  })
                }
              >
                <option value="">เลือก {leader.label}</option>
                {leaders.map((m) => (
                  <option value={m.id} key={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <button
          className="btn primary"
          onClick={() => {
            if (!form.code || !form.name) return notify("กรุณากรอกข้อมูล");
            if (leader && !form.managerId)
              return notify(`กรุณาเลือก ${leader.label}`);
            setEmps([
              ...emps,
              {
                ...form,
                managerId: leader ? Number(form.managerId) : undefined,
                id: Date.now(),
                active: true,
                password: "1234",
              },
            ]);
            setForm({ ...form, code: "", name: "", managerId: "" });
            notify("เพิ่มพนักงานแล้ว (รหัสผ่านเริ่มต้น: 1234)");
          }}
        >
          ＋ เพิ่มพนักงาน
        </button>
      </Card>
      <Card>
        <h3>รายชื่อพนักงาน</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>ชื่อ</th>
                <th>แผนก</th>
                <th>Role</th>
                <th>ผู้บังคับบัญชา</th>
                <th>สถานะ</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {emps
                .slice()
                .sort((a, b) => roleOrder[a.role] - roleOrder[b.role])
                .map((e) => {
                  const managerName = e.managerId
                    ? emps.find((m) => m.id === e.managerId)?.name
                    : "-";
                  return (
                    <tr key={e.id}>
                      <td>{e.code}</td>
                      <td>{e.name}</td>
                      <td>{e.dept}</td>
                      <td>{e.role}</td>
                      <td>{managerName}</td>
                      <td>{e.active ? "🟢 Active" : "🔴 Inactive"}</td>
                      <td>
                        <div className="row-actions">
                          {["Supervisor", "PM"].includes(e.role) && (
                            <button
                              className="btn small"
                              onClick={() => {
                                const expectedLeaderRole =
                                  e.role === "Supervisor" ? "PM" : "OM";
                                const newManager = prompt(
                                  `เลือก ${expectedLeaderRole} ID:`,
                                  e.managerId || "",
                                );
                                if (newManager === null) return;
                                const mgrId = newManager
                                  ? Number(newManager)
                                  : undefined;
                                if (
                                  mgrId &&
                                  !emps.find(
                                    (m) =>
                                      m.id === mgrId &&
                                      m.role === expectedLeaderRole,
                                  )
                                ) {
                                  notify(`${expectedLeaderRole} ID ไม่ถูกต้อง`);
                                  return;
                                }
                                setEmps(
                                  emps.map((x) =>
                                    x.id === e.id
                                      ? { ...x, managerId: mgrId }
                                      : x,
                                  ),
                                );
                                notify(`อัปเดต ${expectedLeaderRole} แล้ว`);
                              }}
                            >
                              👨‍💼 เปลี่ยนผู้บังคับบัญชา
                            </button>
                          )}
                          <button
                            className="btn small"
                            onClick={() => {
                              setEmps(
                                emps.map((x) =>
                                  x.id === e.id ? { ...x, active: !x.active } : x,
                                ),
                              );
                              notify(
                                e.active ? "ปิดใช้งานแล้ว" : "เปิดใช้งานแล้ว",
                              );
                            }}
                          >
                            {e.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                          </button>
                          <button
                            className="btn small"
                            onClick={() => {
                              const pw = prompt(
                                `ตั้งรหัสผ่านใหม่สำหรับ ${e.name}`,
                                "",
                              );
                              if (!pw) return;
                              setEmps(
                                emps.map((x) =>
                                  x.id === e.id ? { ...x, password: pw } : x,
                                ),
                              );
                              notify("ตั้งรหัสผ่านแล้ว");
                            }}
                          >
                            🔑 ตั้งรหัสผ่าน
                          </button>
                          <button
                            className="btn danger small"
                            onClick={() => {
                              if (!confirm(`ยืนยันลบพนักงาน ${e.name}?`)) return;
                              setEmps(emps.filter((x) => x.id !== e.id));
                              setPlans(plans.filter((p) => p.empId !== e.id));
                              notify("ลบพนักงานแล้ว");
                            }}
                          >
                            🗑 ลบ
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
function Team({ emps, plans, user }) {
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay(); // 0=Sun, 1=Mon...
    const mon = new Date(d);
    mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    return [
      mon.getFullYear(),
      String(mon.getMonth() + 1).padStart(2, "0"),
      String(mon.getDate()).padStart(2, "0"),
    ].join("-");
  });
  const teamEmployees =
    user.role === "PM"
      ? emps.filter(
        (employee) =>
          employee.role === "Supervisor" && employee.managerId === user.id,
      )
      : ["Admin", "MD", "GM", "OM"].includes(user.role)
        ? emps
        : emps;
  const teamIds = teamEmployees.map((employee) => employee.id);
  const weekEnd = new Date(`${weekStart}T00:00:00`);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const endKey = [
    weekEnd.getFullYear(),
    String(weekEnd.getMonth() + 1).padStart(2, "0"),
    String(weekEnd.getDate()).padStart(2, "0"),
  ].join("-");
  const weeklyPlans = plans.filter(
    (plan) =>
      teamIds.includes(plan.empId) &&
      plan.date >= weekStart &&
      plan.date <= endKey,
  );
  return (
    <>
      <h1>👥 Team Status</h1>
      <Card>
        <div className="team-week-toolbar">
          <div>
            <h3>ติดตามแผนงานรายสัปดาห์</h3>
            <p className="muted">
              {weekStart} ถึง {endKey}
            </p>
          </div>
          <label>
            วันเริ่มต้นสัปดาห์
            <input
              type="date"
              value={weekStart}
              onChange={(event) => setWeekStart(event.target.value)}
            />
          </label>
        </div>
        <div className="team-week-summary">
          <span>
            แผนทั้งหมด <b>{weeklyPlans.length}</b>
          </span>
          <span>
            อนุมัติแล้ว{" "}
            <b>
              {weeklyPlans.filter((plan) => plan.status === "Approved").length}
            </b>
          </span>
          <span>
            รออนุมัติ{" "}
            <b>
              {weeklyPlans.filter((plan) => plan.status === "Pending").length}
            </b>
          </span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Supervisor</th>
                <th>บัญชี</th>
                <th>จำนวนแผน</th>
                <th>อนุมัติ</th>
                <th>รออนุมัติ</th>
                <th>ต้องดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {teamEmployees.map((employee) => {
                const employeePlans = weeklyPlans.filter(
                  (plan) => plan.empId === employee.id,
                );
                const approved = employeePlans.filter(
                  (plan) => plan.status === "Approved",
                ).length;
                const pending = employeePlans.filter(
                  (plan) => plan.status === "Pending",
                ).length;
                const actionNeeded = employeePlans.filter(
                  (plan) =>
                    plan.status === "Replied" || plan.status === "Cancelled",
                ).length;
                return (
                  <tr key={employee.id}>
                    <td>{employee.name}</td>
                    <td>{employee.active ? "🟢 Active" : "🔴 Inactive"}</td>
                    <td>
                      <b>{employeePlans.length}</b>
                    </td>
                    <td>{approved || "-"}</td>
                    <td>{pending || "-"}</td>
                    <td>{actionNeeded || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
function Approval({
  plans,
  setPlans,
  history,
  setHistory,
  emps,
  user,
  notify,
}) {
  const updatePlan = (plan, status, action, comment = "") => {
    setPlans(
      plans.map((item) =>
        item.id === plan.id
          ? {
            ...item,
            status,
            comment,
            approvedBy: status === "Approved" ? user.name : undefined,
          }
          : item,
      ),
    );
    setHistory([
      {
        id: Date.now(),
        planId: plan.id,
        action,
        by: user.name,
        time: new Date().toLocaleString("th-TH"),
        comment,
      },
      ...history,
    ]);
  };
  const subordinateRole = user.role === "OM" ? "PM" : "Supervisor";
  const subordinateIds = emps
    .filter(
      (employee) =>
        employee.role === subordinateRole && employee.managerId === user.id,
    )
    .map((employee) => employee.id);
  const rows = plans.filter(
    (plan) => plan.status === "Pending" && subordinateIds.includes(plan.empId),
  );
  return (
    <>
      <h1>🔵 Approval Center</h1>
      <Card>
        <div className="approval-list">
          {rows.map((p) => {
            let e = emps.find((x) => x.id === p.empId);
            return (
              <div className="approval-item" key={p.id}>
                <div>
                  <b>{e?.name}</b>
                  <div>
                    {p.date} · {p.periods?.join(", ") || "-"} · {p.task}
                  </div>
                  <small>Priority: {p.priority}</small>
                </div>
                <div className="actions">
                  <button
                    className="btn success"
                    onClick={() => {
                      updatePlan(p, "Approved", "Approved");
                      notify("อนุมัติแผนแล้ว");
                    }}
                  >
                    ✓ อนุมัติ
                  </button>
                  <button
                    className="btn reply"
                    onClick={() => {
                      const reply = prompt(
                        "Reply ถึงพนักงาน",
                        "กรุณาปรับรายละเอียด",
                      );
                      if (reply === null) return;
                      updatePlan(p, "Replied", "Replied", reply);
                      notify("ส่ง reply กลับแล้ว");
                    }}
                  >
                    ↩ Reply
                  </button>
                  <button
                    className="btn danger"
                    onClick={() => {
                      const reason = prompt("เหตุผลที่ยกเลิก", "");
                      if (reason === null) return;
                      updatePlan(p, "Cancelled", "Cancelled", reason);
                      notify("ยกเลิกแผนแล้ว");
                    }}
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            );
          })}
          {!rows.length && <p>ไม่มีรายการรออนุมัติ</p>}
        </div>
      </Card>
    </>
  );
}
function Plan({ plans, setPlans, emps, user, notify }) {
  const todayStr = (() => {
    const d = new Date();
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0"),
    ].join("-");
  })();
  const [f, setF] = useState({
    date: todayStr,
    task: "",
    priority: "กลาง",
    periods: [],
  });
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(String(user.id));
  const togglePeriod = (period) =>
    setF((current) => ({
      ...current,
      periods: current.periods.includes(period)
        ? current.periods.filter((item) => item !== period)
        : [...current.periods, period],
    }));
  const toggleDone = (planId) =>
    setPlans(
      plans.map((plan) =>
        plan.id === planId ? { ...plan, done: !plan.done } : plan,
      ),
    );
  const managedEmployees = emps.filter(
    (employee) =>
      employee.role === "Supervisor" && employee.managerId === user.id,
  );
  const managedIds = managedEmployees.map((employee) => employee.id);
  const isSelfApprover = ["PM", "OM", "GM", "MD"].includes(user.role);
  const canCreatePlan = ["PM", "Supervisor", "OM", "GM", "MD"].includes(user.role);
  let rows =
    user.role === "Supervisor"
      ? plans.filter((p) => p.empId === user.id)
      : user.role === "PM"
        ? plans.filter((p) => p.empId === Number(selectedEmployeeId))
        : isSelfApprover
          ? plans.filter((p) => p.empId === user.id)
          : plans;
  return (
    <>
      <h1>📝 {["Supervisor", "OM", "GM", "MD"].includes(user.role) ? "My Plan" : "Plans"}</h1>
      {canCreatePlan && (
        <Card>
          <div className="form-grid">
            <label>
              วันที่
              <input
                type="date"
                value={f.date}
                onChange={(e) => setF({ ...f, date: e.target.value })}
              />
            </label>
            <label>
              ความสำคัญ
              <select
                value={f.priority}
                onChange={(e) => setF({ ...f, priority: e.target.value })}
              >
                <option>สูง</option>
                <option>กลาง</option>
                <option>ต่ำ</option>
              </select>
            </label>
          </div>
          <fieldset className="period-options">
            <legend>ช่วงเวลา</legend>
            {["เช้า", "บ่าย"].map((period) => (
              <label key={period}>
                <input
                  type="checkbox"
                  checked={f.periods.includes(period)}
                  onChange={() => togglePeriod(period)}
                />
                {period}
              </label>
            ))}
          </fieldset>
          <label>
            แผนงาน
            <textarea
              value={f.task}
              onChange={(e) => setF({ ...f, task: e.target.value })}
            />
          </label>
          <button
            className="btn primary"
            onClick={() => {
              if (!f.task) return notify("กรุณากรอกแผนงาน");
              if (!f.periods.length) return notify("กรุณาเลือกช่วงเวลา");
              const autoApprove = isSelfApprover;
              setPlans([
                ...plans,
                {
                  id: Date.now(),
                  empId: user.id,
                  ...f,
                  status: autoApprove ? "Approved" : "Pending",
                  approvedBy: autoApprove ? user.name : undefined,
                },
              ]);
              setF({ ...f, task: "", periods: [] });
              notify(
                autoApprove
                  ? "บันทึกแผนงานเรียบร้อย (อนุมัติอัตโนมัติ)"
                  : user.role === "PM"
                  ? "ส่งแผนแล้ว — รอ OM อนุมัติ"
                  : "ส่งแผนแล้ว — รอ PM อนุมัติ",
              );
            }}
          >
            {isSelfApprover ? "บันทึกแผนงาน" : "ส่งแผนเพื่ออนุมัติ"}
          </button>
        </Card>
      )}
      <Card>
        {user.role === "PM" && (
          <label className="plan-person-filter">
            แสดงแผนงานของ
            <select
              value={selectedEmployeeId}
              onChange={(event) => setSelectedEmployeeId(event.target.value)}
            >
              <option value={user.id}>แผนของฉัน</option>
              {managedEmployees.map((employee) => (
                <option value={employee.id} key={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>วันที่</th>
                <th>เวลา</th>
                <th>พนักงาน</th>
                <th>งาน</th>
                <th>ความสำคัญ</th>
                <th>Status</th>
                <th>ผู้อนุมัติ</th>
                {canCreatePlan && <th>ทำเสร็จ</th>}
                {canCreatePlan && <th>จัดการ</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>{p.date}</td>
                  <td>{p.periods?.join(", ") || "-"}</td>
                  <td>{emps.find((e) => e.id === p.empId)?.name}</td>
                  <td>{p.task}</td>
                  <td>{p.priority}</td>
                  <td>
                    <span className={"status " + p.status}>{p.status}</span>
                  </td>
                  <td>{p.status === "Approved" ? p.approvedBy : ""}</td>
                  {canCreatePlan &&
                    p.empId === user.id &&
                    p.status === "Approved" && (
                      <td>
                        <button
                          className={"btn small " + (p.done ? "success" : "")}
                          onClick={() => {
                            toggleDone(p.id);
                            notify(p.done ? "ยกเลิกการทำเสร็จ" : "ทำเสร็จแล้ว");
                          }}
                        >
                          {p.done ? "✓ เสร็จแล้ว" : "○ ยังไม่เสร็จ"}
                        </button>
                      </td>
                    )}
                  {canCreatePlan && p.empId !== user.id && <td />}
                  {canCreatePlan && (
                    <td>
                      {p.empId === user.id && (
                        <button
                          className="btn danger small"
                          onClick={() => {
                            if (!confirm(`ยืนยันลบงาน: ${p.task}?`)) return;
                            setPlans(plans.filter((plan) => plan.id !== p.id));
                            notify("ลบงานแล้ว");
                          }}
                        >
                          ลบงาน
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
function Calendar({ plans, setPlans, emps, user }) {
  const toggleDone = (planId) =>
    setPlans(
      plans.map((plan) =>
        plan.id === planId ? { ...plan, done: !plan.done } : plan,
      ),
    );
  const completePlan = (plan) => {
    if (plan.done) {
      toggleDone(plan.id);
      return;
    }
    const completionNote = window.prompt(
      "กรอกรายละเอียดผลการทำงานก่อนยืนยัน",
    );
    if (!completionNote?.trim()) {
      window.alert("กรุณากรอกรายละเอียดผลการทำงาน");
      return;
    }
    setPlans(
      plans.map((item) =>
        item.id === plan.id
          ? {
            ...item,
            done: true,
            completionNote: completionNote.trim(),
            completedAt: new Date().toISOString(),
          }
          : item,
      ),
    );
  };
  const viewPlanDetails = (plan) => {
    const employeeName = emps.find((employee) => employee.id === plan.empId)?.name;
    const completionDetails = plan.completionNote
      ? `\n\nรายละเอียดผลการทำงาน\n${plan.completionNote}`
      : "";
    window.alert(
      `รายละเอียดงาน\n\nงาน: ${plan.task}\nวันที่: ${plan.date}\nช่วงเวลา: ${plan.periods?.join(", ") || "-"}\nผู้วางแผน: ${employeeName ?? "-"}\nสถานะ: ${plan.status}${plan.approvedBy ? `\nผู้อนุมัติ: ${plan.approvedBy}` : ""}${completionDetails}`,
    );
  };
  const [employeeId, setEmployeeId] = useState(
    ["Admin", "MD", "GM", "OM"].includes(user.role) ? "all" : String(user.id),
  );
  const [isCapturing, setIsCapturing] = useState(false);
  const [calendarView, setCalendarView] = useState("month");
  const [monthStart, setMonthStart] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const mon = new Date(d);
    mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    return new Date(mon.getFullYear(), mon.getMonth(), mon.getDate());
  });
  const calendarRef = useRef(null);
  const shiftMonth = (offset) =>
    setMonthStart(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  const shiftWeek = (offset) =>
    setWeekStart(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth(),
          current.getDate() + offset * 7,
        ),
    );
  const daysInMonth = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth() + 1,
    0,
  ).getDate();
  const leading = monthStart.getDay();
  const totalCells = Math.ceil((leading + daysInMonth) / 7) * 7;
  const _now = new Date();
  const todayKey = [
    _now.getFullYear(),
    String(_now.getMonth() + 1).padStart(2, "0"),
    String(_now.getDate()).padStart(2, "0"),
  ].join("-");
  const days = Array.from({ length: totalCells }, (_, index) => {
    const date = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth(),
      1 - leading + index,
    );
    const key = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
    return {
      key,
      day: date.getDate(),
      inMonth: date.getMonth() === monthStart.getMonth(),
      weekend: date.getDay() === 0 || date.getDay() === 6,
      today: key === todayKey,
    };
  });
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(
      weekStart.getFullYear(),
      weekStart.getMonth(),
      weekStart.getDate() + index,
    );
    const key = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
    return {
      key,
      day: date.getDate(),
      inMonth: true,
      weekend: date.getDay() === 0 || date.getDay() === 6,
      today: key === todayKey,
    };
  });
  const calendarEmployees =
    ["Admin", "MD", "GM", "OM"].includes(user.role)
      ? emps.filter((employee) => employee.active)
      : emps.filter(
        (employee) =>
          employee.active &&
          (employee.id === user.id ||
            (employee.role === "Supervisor" && employee.managerId === user.id)),
      );
  const teamIds = calendarEmployees.map((employee) => employee.id);
  const visiblePlans = plans.filter(
    (plan) =>
      !["Replied", "Cancelled"].includes(plan.status) &&
      (plan.empId === user.id || teamIds.includes(plan.empId)) &&
      (employeeId === "all" || plan.empId === Number(employeeId)),
  );
  const allPlans =
    user.role === "Supervisor"
      ? plans.filter((plan) => plan.empId === user.id)
      : ["Admin", "MD", "GM", "OM"].includes(user.role)
        ? plans.filter(
          (plan) => employeeId === "all" || plan.empId === Number(employeeId),
        )
        : plans.filter(
          (plan) =>
            (plan.empId === user.id || teamIds.includes(plan.empId)) &&
            (employeeId === "all" || plan.empId === Number(employeeId)),
        );
  const monthLabel = monthStart.toLocaleDateString("th-TH", {
    month: "long",
    year: "numeric",
  });
  const weekLabel = `${weekStart.toLocaleDateString("th-TH", { day: "numeric", month: "short" })} - ${weekDays[6].key === weekStart.toISOString().slice(0, 10) ? "" : new Date(weekDays[6].key).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}`;
  const calendarDays = calendarView === "week" ? weekDays : days;
  const calendarOwnerName =
    user.role === "Supervisor"
      ? user.name
      : employeeId === "all"
        ? "แผนของทุกคน"
        : employeeId === String(user.id)
          ? "แผนของฉัน"
          : calendarEmployees.find((employee) => employee.id === Number(employeeId))
            ?.name;
  const monthKey = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`;
  const captureCalendar = async () => {
    if (!calendarRef.current) return;
    setIsCapturing(true);
    try {
      const canvas = await html2canvas(calendarRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
      });
      const link = document.createElement("a");
      link.download = `team-calendar-${monthKey}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setIsCapturing(false);
    }
  };
  const exportCalendar = () => {
    const rows = visiblePlans.map((plan) => ({
      วันที่: plan.date,
      ช่วงเวลา: plan.periods?.join(", ") || "-",
      พนักงาน: emps.find((employee) => employee.id === plan.empId)?.name ?? "",
      แผนงาน: plan.task,
      ความสำคัญ: plan.priority,
      สถานะ: plan.status,
      ผู้อนุมัติ: plan.status === "Approved" ? plan.approvedBy : "",
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Team Calendar");
    XLSX.writeFile(workbook, `team-calendar-${monthKey}.xlsx`);
  };
  return (
    <>
      <div className="page-header">
        <h1>📅 Team Calendar</h1>
        <div className="calendar-page-actions">
          <button
            className="btn small"
            onClick={captureCalendar}
            disabled={isCapturing}
          >
            {isCapturing ? "กำลัง Capture..." : "Capture"}
          </button>
          <button className="btn primary" onClick={exportCalendar}>
            Export Excel
          </button>
        </div>
      </div>
      <Card className="calendar-card">
        <div className="calendar-toolbar">
          <div>
            <h2>{calendarView === "week" ? weekLabel : monthLabel}</h2>
            <p className="muted">{calendarOwnerName}</p>
          </div>
          <div className="calendar-controls">
            {["PM", "Admin", "MD", "GM", "OM"].includes(user.role) && (
              <label className="calendar-filter">
                พนักงาน
                <select
                  value={employeeId}
                  onChange={(event) => setEmployeeId(event.target.value)}
                >
                  {["Admin", "MD", "GM", "OM"].includes(user.role) && (
                    <option value="all">แผนของทุกคน</option>
                  )}
                  {user.role === "PM" && (
                    <option value={user.id}>แผนของฉัน</option>
                  )}
                  {calendarEmployees.map((employee) => (
                    <option value={employee.id} key={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="calendar-view-toggle" role="group" aria-label="รูปแบบปฏิทิน">
              <button
                className={calendarView === "month" ? "active" : ""}
                onClick={() => setCalendarView("month")}
              >
                เดือน
              </button>
              <button
                className={calendarView === "week" ? "active" : ""}
                onClick={() => {
                  const start = new Date(monthStart);
                  start.setDate(start.getDate() - start.getDay());
                  setWeekStart(start);
                  setCalendarView("week");
                }}
              >
                สัปดาห์
              </button>
            </div>
            <button
              className="btn small"
              onClick={() =>
                calendarView === "week" ? shiftWeek(-1) : shiftMonth(-1)
              }
            >
              ‹ {calendarView === "week" ? "สัปดาห์ก่อน" : "เดือนก่อน"}
            </button>
            <button
              className="btn small"
              onClick={() =>
                calendarView === "week" ? shiftWeek(1) : shiftMonth(1)
              }
            >
              {calendarView === "week" ? "สัปดาห์ถัดไป" : "เดือนถัดไป"} ›
            </button>
          </div>
        </div>
        <div className="calendar-key" aria-label="คำอธิบายระดับความสำคัญ">
          <span><i className="key-dot high" />สูง</span>
          <span><i className="key-dot medium" />กลาง</span>
          <span><i className="key-dot low" />ต่ำ</span>
        </div>
        <div ref={calendarRef} className="calendar-capture">
          <div className="calendar-wrap">
            <div className="calendar-weekdays">
              {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
            <div className="month-calendar">
              {calendarDays.map((day) => {
                const showEntries = visiblePlans.filter(
                  (plan) => plan.date === day.key,
                );
                return (
                  <section
                    className={
                      "month-day " +
                      (day.weekend ? "weekend " : "") +
                      (day.today ? "today " : "") +
                      (day.inMonth ? "" : "other-month")
                    }
                    key={day.key}
                  >
                    <b>{day.day}</b>
                    <div className="calendar-events">
                      {showEntries.map((plan, index) => (
                        <article
                          className={
                            "calendar-event " +
                            (priorityClasses[plan.priority] ?? "medium") +
                            (plan.done ? " done" : "")
                          }
                          key={plan.id}
                        >
                          {["PM", "Supervisor"].includes(user.role) &&
                            plan.empId === user.id && (
                              <button
                                type="button"
                                className={
                                  "calendar-event-done" +
                                  (plan.done ? " checked" : "") +
                                  (plan.status !== "Approved" ? " disabled" : "")
                                }
                                disabled={plan.status !== "Approved"}
                                onClick={() => completePlan(plan)}
                              >
                                <span className="check-box">
                                  {plan.done ? "✓" : ""}
                                </span>
                                {plan.status === "Approved"
                                  ? "อนุมัติแล้ว"
                                  : "รอ PM อนุมัติ"}
                              </button>
                            )}
                          <button
                            type="button"
                            className="calendar-event-note"
                            onClick={() => viewPlanDetails(plan)}
                          >
                            ดูรายละเอียด
                          </button>
                          <div className="calendar-event-task">
                            <small>{plan.periods?.join(", ") || "-"}</small>
                            {plan.done ? (
                              <s>{`${index + 1}. ${plan.task}`}</s>
                            ) : (
                              `${index + 1}. ${plan.task}`
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      </Card>
    </>
  );
}
function History({ history, plans, user }) {
  const visibleHistory =
    user.role === "Supervisor"
      ? history.filter((h) => {
        const plan = plans.find((p) => p.id === h.planId);
        return plan?.empId === user.id;
      })
      : history;
  return (
    <>
      <h1>🕒 Approval History</h1>
      <Card>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>เวลา</th>
                <th>Action</th>
                <th>ผู้ดำเนินการ</th>
                <th>Comment</th>
              </tr>
            </thead>
            <tbody>
              {visibleHistory.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--muted)" }}>ไม่มีประวัติการอนุมัติ</td></tr>
              )}
              {visibleHistory.map((h) => (
                <tr key={h.id}>
                  <td>{h.time}</td>
                  <td>{h.action}</td>
                  <td>{h.by}</td>
                  <td>{h.comment || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
const root =
  import.meta.hot?.data.root ?? createRoot(document.getElementById("root"));
if (import.meta.hot)
  import.meta.hot.dispose((data) => {
    data.root = root;
  });
root.render(<App />);
