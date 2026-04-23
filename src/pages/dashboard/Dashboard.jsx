import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import {
  Clock, Calendar, CheckCircle, XCircle, Timer,
  TrendingUp, ArrowRight, Zap, Users, Activity,
  Sun, Sunset, Sunrise, ChevronRight, MapPin,
  Cake, Gift, PartyPopper, User, Sparkles,
  FileText, BookOpen, ClipboardList
} from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import { motion, AnimatePresence } from 'framer-motion';

/* ──────────────────────────────────────────────────────────────
    Mini radial progress ring (kept from original)
────────────────────────────────────────────────────────────── */
const Ring = ({ value, max, color, size = 64 }) => {
  const r = (size / 2) - 6;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / (max || 1), 1);
  const dash = circ * pct;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E2E8F0" strokeWidth={5} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)' }}
      />
    </svg>
  );
};

/* ──────────────────────────────────────────────────────────────
    KPI Stat Card (enhanced, light surfaces)
────────────────────────────────────────────────────────────── */
const StatCard = ({ icon: Icon, label, value, sub, gradient, ringMax }) => (
  <motion.div
    whileHover={{ y: -6, boxShadow: '0 24px 48px rgba(99,102,241,0.12)' }}
    style={{
      background: '#fff',
      border: '1px solid #EEF0F8',
      borderRadius: '20px',
      padding: '22px 20px',
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.3s',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      boxShadow: '0 4px 16px rgba(99,102,241,0.06)',
    }}
  >
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: gradient, borderRadius: '4px 4px 0 0' }} />
    <div style={{ position: 'absolute', bottom: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: gradient, opacity: 0.05, filter: 'blur(20px)' }} />

    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <p style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94A3B8', marginBottom: '6px' }}>{label}</p>
        <p style={{ fontSize: '2.2rem', fontWeight: 900, color: '#1E293B', lineHeight: 1, letterSpacing: '-0.04em' }}>{value ?? '—'}</p>
        {sub && <p style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '4px', fontWeight: 500 }}>{sub}</p>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', position: 'relative' }}>
        <Ring value={parseFloat(value) || 0} max={ringMax ?? 31} color={gradient.match(/#[A-Fa-f0-9]{6}/)?.[0] ?? '#6366F1'} size={56} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} style={{ color: gradient.match(/#[A-Fa-f0-9]{6}/)?.[0] ?? '#6366F1', opacity: 0.8 }} />
        </div>
      </div>
    </div>
  </motion.div>
);

/* ──────────────────────────────────────────────────────────────
    Horizontal Bar Chart for clear comparison
────────────────────────────────────────────────────────────── */
const HorizontalBarChart = ({ data, maxValue }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {data.map((item, idx) => {
        const percent = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
        return (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '90px', fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>{item.label}</div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1, height: '36px', backgroundColor: '#F1F5F9', borderRadius: '12px', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  style={{
                    height: '100%',
                    background: `linear-gradient(90deg, ${item.colorStart}, ${item.colorEnd})`,
                    borderRadius: '12px',
                    width: `${percent}%`,
                  }}
                />
              </div>
              <span style={{ minWidth: '36px', fontWeight: 800, color: '#1E293B' }}>{item.value}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────
    Donut Chart (optional distribution)
────────────────────────────────────────────────────────────── */
const DonutChart = ({ data, total }) => {
  const size = 180;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  let cumulativeAngle = 0;

  const getCoordinates = (angle) => ({
    x: center + radius * Math.cos(angle),
    y: center + radius * Math.sin(angle),
  });

  const describeArc = (startAngle, endAngle) => {
    const start = getCoordinates(startAngle);
    const end = getCoordinates(endAngle);
    const largeArcFlag = endAngle - startAngle <= Math.PI ? 0 : 1;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
  };

  let currentAngle = -Math.PI / 2; // start at top (12 o'clock)
  const slices = [];

  data.forEach((item, idx) => {
    const angle = (item.value / total) * Math.PI * 2;
    if (angle === 0) return;
    const start = currentAngle;
    const end = currentAngle + angle;
    const path = describeArc(start, end);
    slices.push({ path, color: item.color, label: item.label, value: item.value, percent: (item.value / total) * 100 });
    currentAngle = end;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((slice, i) => (
          <path
            key={i}
            d={slice.path}
            fill="none"
            stroke={slice.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.6s' }}
          />
        ))}
        <circle cx={center} cy={center} r={radius - 10} fill="#ffffff" stroke="#F1F5F9" strokeWidth="2" />
        <text x={center} y={center - 6} textAnchor="middle" fill="#1E293B" fontSize="20" fontWeight="900" dy=".3em">
          {total}
        </text>
        <text x={center} y={center + 12} textAnchor="middle" fill="#94A3B8" fontSize="10" fontWeight="700">
          days
        </text>
      </svg>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px', marginTop: '8px' }}>
        {slices.map((slice, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '99px', background: slice.color }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>{slice.label} ({slice.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────
    Quick Action Card
────────────────────────────────────────────────────────────── */
const QuickActionCard = ({ label, sub, icon: Icon, onClick, colorFrom, colorTo, iconBg, shadow }) => (
  <motion.button
    whileHover={{ y: -8, boxShadow: shadow || '0 20px 40px rgba(99,102,241,0.2)' }}
    whileTap={{ scale: 0.97 }}
    onClick={onClick}
    style={{
      background: '#fff',
      border: '1px solid #EEF0F8',
      borderRadius: '20px',
      padding: '24px 20px',
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: '14px',
      textAlign: 'left',
      transition: 'all 0.25s',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
      width: '100%',
    }}
  >
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
      background: `linear-gradient(90deg, ${colorFrom}, ${colorTo})`
    }} />
    <div style={{
      width: '52px', height: '52px', borderRadius: '16px',
      background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <Icon size={24} color={colorFrom} />
    </div>
    <div>
      <p style={{ fontWeight: 800, fontSize: '1rem', color: '#1E293B', letterSpacing: '-0.01em', marginBottom: '4px' }}>{label}</p>
      <p style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 500 }}>{sub}</p>
    </div>
    <div style={{
      marginTop: 'auto',
      display: 'flex', alignItems: 'center', gap: '4px',
      fontSize: '0.8rem', fontWeight: 700,
      color: colorFrom,
    }}>
      Go <ArrowRight size={14} />
    </div>
  </motion.button>
);

const BirthdayCard = ({ employee, type }) => (
  <motion.div
    whileHover={{ y: -4, boxShadow: '0 12px 24px rgba(0,0,0,0.06)' }}
    className="birthday-mini-card"
    style={{
      background: '#fff',
      border: '1px solid #EEF0F8',
      borderRadius: '16px',
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      minWidth: '240px',
      flexShrink: 0,
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 4px 12px rgba(99,102,241,0.06)',
    }}
  >
    <div className={`birthday-type-indicator ${type}`} />
    <div style={{
      width: '44px', height: '44px', borderRadius: '12px', overflow: 'hidden',
      background: '#F1F5F9', flexShrink: 0, border: '2px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    }}>
      {employee.profileImageUrl ? (
        <img src={employee.profileImageUrl} alt={employee.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366F1' }}>
          <User size={20} />
        </div>
      )}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontWeight: 800, color: '#1E293B', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{employee.name}</p>
      <p style={{ fontSize: '0.72rem', color: type === 'today' ? '#6366F1' : '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {type === 'today' ? '🎂 Today' : '🎁 Tomorrow'}
      </p>
    </div>
    {type === 'today' && <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 2 }}><PartyPopper size={18} color="#6366F1" style={{ opacity: 0.7 }} /></motion.div>}
  </motion.div>
);

/* ── Greeting icon by hour ──────────────────────────────────── */
const getGreetingValue = (h) => {
  if (h < 12) return { text: 'Good Morning', Icon: Sunrise, color: '#2076C7', bg: '#EFF6FF', border: '#DBEAFE' };
  if (h < 17) return { text: 'Good Afternoon', Icon: Sun, color: '#1CADA3', bg: '#F0FDF4', border: '#DCFCE7' };
  return { text: 'Good Evening', Icon: Sunset, color: '#2076C7', bg: '#F5F3FF', border: '#EDE9FE' };
};

const Dashboard = () => {
  const { user } = useAuth();
  const [todayRecord, setTodayRecord] = useState(null);
  const [summary, setSummary] = useState({ present: 0, absent: 0, late: 0, weekOff: 0, totalHours: 0 });
  const [birthdays, setBirthdays] = useState({ today: [], tomorrow: [] });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const navigate = useNavigate();

  const isManagement = ['SuperUser', 'HR', 'Director', 'VP', 'GM', 'Manager'].includes(user?.role);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [todayRes, summaryRes, birthdayRes] = await Promise.all([
          api.get('/attendance/today'),
          api.get('/attendance/my-summary'),
          api.get('/employees/birthdays/upcoming'),
        ]);
        setTodayRecord(todayRes.data.data.record);
        setSummary(summaryRes.data.data.summary);
        setBirthdays(birthdayRes.data.data);
      } catch (_) {}

      if (isManagement) {
        try {
          // Additional admin stats could be fetched here
        } catch (_) {}
      }

      setLoading(false);
    };
    fetchData();
  }, [isManagement]);

  const formatTime = (d) =>
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const formatDate = (d) =>
    d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const fmtT = (s) =>
    s ? new Date(s).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';

  const hr = currentTime.getHours();
  const { text: greeting, Icon: GreetIcon, color: gColor, bg: gBg, border: gBorder } = getGreetingValue(hr);

  const isCheckedIn = !!todayRecord?.inTime;
  const isCheckedOut = !!todayRecord?.outTime;
  const hasBirthdays = birthdays.today.length > 0 || birthdays.tomorrow.length > 0;

  // Prepare data for horizontal bar chart & donut
  const present = summary.present || 0;
  const absent = summary.absent || 0;
  const late = summary.late || 0;
  const weekOff = summary.weekOff || 0;
  const totalDays = present + absent + late + weekOff;
  const maxBarValue = totalDays > 0 ? totalDays : 31; // fallback

  const barData = [
    { label: 'Present', value: present, colorStart: '#2076C7', colorEnd: '#1CADA3' },
    { label: 'Absent', value: absent, colorStart: '#1CADA3', colorEnd: '#2076C7' },
    { label: 'Late', value: late, colorStart: '#2076C7', colorEnd: '#1CADA3' },
    { label: 'Week Off', value: weekOff, colorStart: '#E2E8F0', colorEnd: '#CBD5E1' },
  ];

  const donutData = [
    { label: 'Present', value: present, color: '#2076C7' },
    { label: 'Absent', value: absent, color: '#1CADA3' },
    { label: 'Late', value: late, color: '#2076C7' },
    { label: 'Week Off', value: weekOff, color: '#E2E8F0' },
  ].filter(d => d.value > 0);

  return (
    <AppShell>
      <div className="page-wrapper fade-in dashboard-container">

        {/* ── Top Section: Greeting & Live Clock ───────────────── */}
        <div className="dashboard-header-row">
          <motion.div
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            className="greeting-box"
          >
            <div className="greeting-icon-wrap" style={{ background: gBg, borderColor: gBorder }}>
              <GreetIcon size={24} color={gColor} />
            </div>
            <div>
              <h1 className="greeting-text">
                {greeting}, <span className="name-highlight">{user?.name}</span> 👋
              </h1>
              <p className="date-text">{formatDate(currentTime)}</p>
            </div>
          </motion.div>
        </div>

        {/* ── Quick Actions ────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="dashboard-section-label">Quick Actions</div>
          <div className="quick-actions-grid">
            <QuickActionCard
              label="Mark Attendance"
              sub="Check in or check out"
              icon={Clock}
              onClick={() => navigate('/attendance')}
              colorFrom="#2076C7"
              colorTo="#1CADA3"
              iconBg="rgba(32, 118, 199, 0.08)"
              shadow="0 20px 40px rgba(32, 118, 199, 0.15)"
            />
            <QuickActionCard
              label="Attendance Summary"
              sub="View your monthly logs"
              icon={ClipboardList}
              onClick={() => navigate('/attendance/summary')}
              colorFrom="#1CADA3"
              colorTo="#2076C7"
              iconBg="rgba(28, 173, 163, 0.08)"
              shadow="0 20px 40px rgba(28, 173, 163, 0.15)"
            />
            <QuickActionCard
              label="Apply Leave"
              sub="Request time off"
              icon={Calendar}
              onClick={() => navigate('/leaves/apply')}
              colorFrom="#2076C7"
              colorTo="#1CADA3"
              iconBg="rgba(32, 118, 199, 0.08)"
              shadow="0 20px 40px rgba(32, 118, 199, 0.15)"
            />
            <QuickActionCard
              label="View Salary Slip"
              sub="Download payslip"
              icon={FileText}
              onClick={() => navigate('/payroll/my')}
              colorFrom="#1CADA3"
              colorTo="#2076C7"
              iconBg="rgba(28, 173, 163, 0.08)"
              shadow="0 20px 40px rgba(28, 173, 163, 0.15)"
            />
          </div>
        </motion.div>

        {/* ── Celebration Section (Birthdays) ───────────────────── */}
        <AnimatePresence>
          {hasBirthdays && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="birthday-section"
            >
              <div className="section-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} color="#6366F1" />
                  <span className="section-title-alt">CELEBRATIONS</span>
                </div>
                <div className="confetti-trail" />
              </div>
              <div className="birthday-scroll-track">
                {birthdays.today.map(emp => <BirthdayCard key={emp._id} employee={emp} type="today" />)}
                {birthdays.tomorrow.map(emp => <BirthdayCard key={emp._id} employee={emp} type="tomorrow" />)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Main Hero Card: Attendance Snapshot ─────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="attendance-hero-card"
        >
          <div className="hero-mesh" />

          <div className="hero-inner">
            <div className="status-info-side">
              <div className="hero-section-tag">
                <Activity size={14} /> <span>TODAY'S ATTENDANCE</span>
              </div>

              <div className="hero-time-grid">
                <div className="time-stat-block">
                  <span className="time-label">CHECK IN</span>
                  <span className={`time-value ${isCheckedIn ? 'active' : ''}`}>
                    {isCheckedIn ? fmtT(todayRecord.inTime) : '--:--'}
                  </span>
                </div>
                <div className="time-stat-block">
                  <span className="time-label">CHECK OUT</span>
                  <span className={`time-value ${isCheckedOut ? 'active-blue' : ''}`}>
                    {isCheckedOut ? fmtT(todayRecord.outTime) : '--:--'}
                  </span>
                </div>
                {todayRecord?.totalHours > 0 && (
                  <div className="time-stat-block">
                    <span className="time-label">DURATION</span>
                    <span className="time-value active-purple">{todayRecord.totalHours.toFixed(1)}h</span>
                  </div>
                )}
              </div>

              <div className="hero-action-row">
                {!isCheckedIn && (
                  <button className="btn-hero-checkin" onClick={() => navigate('/attendance')}>
                    <Clock size={18} /> Mark Attendance Now
                  </button>
                )}
                {isCheckedIn && !isCheckedOut && (
                  <div className="session-active-pill">
                    <div className="pulse-dot" />
                    <span>ON DUTY</span>
                  </div>
                )}
                {isCheckedOut && (
                  <div className="day-complete-pill">
                    <CheckCircle size={16} />
                    <span>LOGS COMPLETED</span>
                  </div>
                )}
                {todayRecord?.isLate && <span className="late-warning-tag">Late by {todayRecord.lateMinutes}m</span>}
              </div>
            </div>

            <div className="hero-shortcuts-side">
              <QuickShortcut label="My Logs" sub="Attendance history" icon={Calendar} onClick={() => navigate('/attendance/summary')} />
              <QuickShortcut label="Work Portal" sub="Daily reports" icon={Zap} onClick={() => navigate('/attendance/reports')} accent />
            </div>
          </div>
        </motion.div>

        {/* ── Monthly Performance: KPI Cards + Charts ─────────────── */}
        <div className="dashboard-section-label">Monthly Performance</div>

        <div className="stats-grid-wrapper">
          <StatCard icon={CheckCircle} label="Present" value={present} sub="working days" gradient="linear-gradient(135deg,#2076C7,#1CADA3)" ringMax={31} />
          <StatCard icon={XCircle} label="Absent" value={absent} sub="missed days" gradient="linear-gradient(135deg,#2076C7,#1CADA3)" ringMax={31} />
          <StatCard icon={Timer} label="Late Arrivals" value={late} sub="late logins" gradient="linear-gradient(135deg,#2076C7,#1CADA3)" ringMax={31} />
          <StatCard icon={TrendingUp} label="Avg Hours" value={summary.present ? (summary.totalHours / summary.present).toFixed(1) + 'h' : '--'} sub="per working day" gradient="linear-gradient(135deg,#2076C7,#1CADA3)" ringMax={9} />
        </div>

        {/* Charts row: Horizontal Bar + Optional Donut */}
        <div className="charts-row">
          <div className="bar-chart-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 className="chart-title">Attendance Breakdown</h3>
              <span className="chart-subtitle">Comparison vs total days</span>
            </div>
            <HorizontalBarChart data={barData} maxValue={maxBarValue} />
          </div>
          <div className="donut-chart-card">
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <h3 className="chart-title">Distribution</h3>
              <span className="chart-subtitle">overall share</span>
            </div>
            <DonutChart data={donutData} total={totalDays} />
          </div>
        </div>

        {/* ── Managerial Quick Access ─────────────────────────── */}
        {isManagement && (
          <div className="management-section">
            <div className="dashboard-section-label">Team Insights</div>
            <div className="management-actions-grid">
              <ManagementActionCard label="Team Attendance" sub="Live tracking & reports" icon={Users} path="/attendance/admin" gr="linear-gradient(135deg,#2563EB,#0EA5E9)" />
              <ManagementActionCard label="Correction Requests" sub="Pending approvals" icon={CheckCircle} path="/attendance/corrections" gr="linear-gradient(135deg,#10B981,#34D399)" />
              <ManagementActionCard label="Daily Reports" sub="Review EOD updates" icon={Activity} path="/attendance/reports" gr="linear-gradient(135deg,#8B5CF6,#6366F1)" />
            </div>
          </div>
        )}

      </div>

      <style>{`
        .dashboard-container {
          max-width: 1400px;
          margin: 0 auto;
          overflow-x: hidden;
        }

        /* Header Layout */
        .dashboard-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 20px;
          margin-bottom: 32px;
        }

        .greeting-box {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .greeting-icon-wrap {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }

        .greeting-text {
          font-size: clamp(1.4rem, 4vw, 1.8rem);
          font-weight: 900;
          color: #1E293B;
          letter-spacing: -0.04em;
          line-height: 1.1;
        }

        .name-highlight {
          background: linear-gradient(135deg, #2076C7, #1CADA3);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .date-text { color: #94A3B8; font-size: 0.95rem; font-weight: 600; margin-top: 4px; }

        /* Quick Actions */
        .quick-actions-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 36px;
        }

        /* Birthday Section */
        .birthday-section {
          margin-bottom: 28px;
          background: linear-gradient(135deg, rgba(99,102,241,0.04), rgba(139,92,246,0.04));
          border: 1px dashed rgba(99,102,241,0.2);
          border-radius: 24px;
          padding: 16px;
          overflow: hidden;
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          padding: 0 8px;
        }

        .section-title-alt { font-size: 0.72rem; font-weight: 900; color: #6366F1; letter-spacing: 0.1em; }

        .birthday-scroll-track {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          padding: 4px 8px 12px;
          scrollbar-width: none;
        }
        .birthday-scroll-track::-webkit-scrollbar { display: none; }

        .birthday-type-indicator {
          position: absolute; left: 0; top: 0; bottom: 0; width: 4px; border-radius: 2px 0 0 2px;
        }
        .birthday-type-indicator.today { background: linear-gradient(180deg, #6366F1, #8B5CF6); }
        .birthday-type-indicator.tomorrow { background: #E2E8F0; }

        /* Attendance Hero - Light Theme */
        .attendance-hero-card {
          background: #ffffff;
          border: 1px solid #EEF0F8;
          border-radius: 32px;
          padding: clamp(24px, 5vw, 40px);
          position: relative;
          overflow: hidden;
          color: #1E293B;
          margin-bottom: 32px;
          box-shadow: 0 8px 32px rgba(99,102,241,0.05);
        }

        .hero-mesh {
          position: absolute; inset: 0;
          background-image:
            radial-gradient(circle at 70% 30%, rgba(99,102,241,0.15) 0%, transparent 50%),
            radial-gradient(circle at 20% 80%, rgba(16,185,129,0.1) 0%, transparent 40%);
          opacity: 0.8;
        }

        .hero-inner {
          position: relative;
          display: grid;
          grid-template-columns: 1fr 280px;
          gap: 40px;
          align-items: center;
        }

        .hero-section-tag {
          display: flex; align-items: center; gap: 8px;
          font-size: 0.75rem; font-weight: 800; color: #6366F1;
          letter-spacing: 0.12em; margin-bottom: 24px;
        }

        .hero-time-grid {
          display: flex; flex-wrap: wrap; gap: 40px; margin-bottom: 32px;
        }

        .time-stat-block { display: flex; flex-direction: column; gap: 4px; }
        .time-label { font-size: 0.72rem; color: #94A3B8; font-weight: 700; letter-spacing: 0.06em; }
        .time-value { font-size: 1.8rem; font-weight: 900; color: #CBD5E1; letter-spacing: -0.02em; }
        .time-value.active { color: #059669; }
        .time-value.active-blue { color: #2563EB; }
        .time-value.active-purple { color: #7C3AED; }

        .hero-action-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }

        .btn-hero-checkin {
          background: linear-gradient(135deg, #2076C7, #1CADA3);
          color: #fff; border: none; padding: 14px 28px;
          border-radius: 16px; font-weight: 800; cursor: pointer;
          display: flex; align-items: center; gap: 10px;
          transition: all 0.2s; box-shadow: 0 10px 25px rgba(32,118,199,0.25);
          font-size: 0.95rem; letter-spacing: -0.01em;
        }
        .btn-hero-checkin:hover { transform: translateY(-2px); box-shadow: 0 16px 35px rgba(32,118,199,0.35); }

        .session-active-pill {
          display: flex; align-items: center; gap: 8px;
          background: rgba(5,150,105,0.1); border: 1px solid rgba(5,150,105,0.25);
          padding: 8px 16px; border-radius: 99px; color: #059669; font-size: 0.82rem; font-weight: 800;
        }

        .day-complete-pill {
          display: flex; align-items: center; gap: 8px;
          background: rgba(37,99,235,0.08); border: 1px solid rgba(37,99,235,0.2);
          padding: 8px 16px; border-radius: 99px; color: #2563EB; font-size: 0.82rem; font-weight: 800;
        }

        .pulse-dot { width: 8px; height: 8px; background: #059669; border-radius: 50%; animation: clockGlow 2s infinite; }

        @keyframes clockGlow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.4); }
        }

        .late-warning-tag {
          font-size: 0.82rem; font-weight: 800; color: #D97706;
          background: rgba(217,119,6,0.08); border: 1px solid rgba(217,119,6,0.2);
          padding: 8px 16px; border-radius: 99px;
        }

        .hero-shortcuts-side { display: flex; flex-direction: column; gap: 14px; }

        /* General Sections */
        .dashboard-section-label {
          font-size: 1.1rem; font-weight: 900; color: #1E293B; margin-bottom: 20px;
          letter-spacing: -0.02em; display: flex; align-items: center; gap: 12px;
        }
        .dashboard-section-label::after { content: ''; flex: 1; height: 1px; background: #EEF0F8; }

        .stats-grid-wrapper {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px; margin-bottom: 40px;
        }

        /* Charts Row */
        .charts-row {
          display: grid;
          grid-template-columns: 1fr 0.9fr;
          gap: 24px;
          margin-bottom: 48px;
        }

        .bar-chart-card, .donut-chart-card {
          background: #ffffff;
          border-radius: 24px;
          border: 1px solid #EEF0F8;
          padding: 24px;
          box-shadow: 0 8px 20px rgba(0,0,0,0.04);
          transition: all 0.2s;
        }

        .chart-title {
          font-size: 1rem;
          font-weight: 800;
          color: #1E293B;
          letter-spacing: -0.02em;
          margin: 0;
        }

        .chart-subtitle {
          font-size: 0.7rem;
          font-weight: 600;
          color: #94A3B8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .management-actions-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 16px;
        }

        /* Responsive Breakpoints */
        @media (max-width: 1100px) {
          .quick-actions-grid { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 1024px) {
          .hero-inner { grid-template-columns: 1fr; }
          .hero-shortcuts-side { flex-direction: row; flex-wrap: wrap; }
          .hero-shortcuts-side > button { flex: 1; min-width: 200px; }
          .charts-row { grid-template-columns: 1fr; gap: 20px; }
        }

        @media (max-width: 640px) {
          .dashboard-header-row { flex-direction: column; align-items: stretch; }
          .hero-time-grid { gap: 24px; }
          .time-value { font-size: 1.4rem; }
          .stats-grid-wrapper { grid-template-columns: 1fr 1fr; gap: 12px; }
          .quick-actions-grid { grid-template-columns: 1fr 1fr; gap: 12px; }
        }

        @media (max-width: 400px) {
          .quick-actions-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </AppShell>
  );
};

const QuickShortcut = ({ label, sub, icon: Icon, onClick, accent }) => (
  <motion.button
    whileHover={{ x: 6, background: accent ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.06)' }}
    onClick={onClick}
    style={{
      background: accent ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.6)',
      border: `1px solid ${accent ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)'}`,
      borderRadius: '20px', padding: '16px', color: '#1E293B',
      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px',
      textAlign: 'left', transition: 'all 0.2s', backdropFilter: 'blur(6px)',
    }}
  >
    <div style={{
      width: '44px', height: '44px', borderRadius: '14px',
      background: accent ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <Icon size={20} color={accent ? '#6366F1' : '#7C3AED'} />
    </div>
    <div style={{ flex: 1 }}>
      <p style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.01em', color: '#1E293B' }}>{label}</p>
      <p style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '2px', fontWeight: 500 }}>{sub}</p>
    </div>
    <ChevronRight size={16} color="#94A3B8" />
  </motion.button>
);

const ManagementActionCard = ({ label, sub, icon: Icon, path, gr }) => {
  const navigate = useNavigate();
  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 16px 40px rgba(99,102,241,0.12)' }}
      onClick={() => navigate(path)}
      style={{
        background: '#fff',
        border: '1px solid #EEF0F8',
        borderRadius: '24px',
        padding: '24px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(99,102,241,0.06)',
        transition: 'all 0.25s',
      }}
    >
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: gr }} />
      <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: gr, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={24} color="#fff" />
      </div>
      <div>
        <h4 style={{ fontWeight: 900, color: '#1E293B', fontSize: '1rem', letterSpacing: '-0.01em' }}>{label}</h4>
        <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginTop: '4px', fontWeight: 500 }}>{sub}</p>
      </div>
      <div style={{ marginLeft: 'auto', width: '32px', height: '32px', borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ChevronRight size={16} color="#64748B" />
      </div>
    </motion.div>
  );
};

export default Dashboard;