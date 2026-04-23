import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  CalendarDays, Clock, FileText, ChevronLeft, Loader2, Info, ChevronDown, Check, Sun, Moon, ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AppShell from '../../components/layout/AppShell';
import { applyLeave } from '../../api/leave.api';
import { useAuth } from '../../context/AuthContext';

const LEAVE_TYPES = [
  { value: 'Paid', label: 'Paid Leave', desc: 'Monthly accrued paid leave', color: '#10B981' },
  { value: 'Casual', label: 'Casual Leave', desc: 'Personal errands or short breaks', color: '#3B82F6' },
  { value: 'Sick', label: 'Sick Leave', desc: 'Medical illness or health issues', color: '#EF4444' },
  { value: 'CompOff', label: 'Comp-Off', desc: 'Compensatory off for overtime worked', color: '#6366F1' },
  { value: 'Other', label: 'Other', desc: 'Any other reason', color: '#64748B' },
];

const today = () => new Date().toISOString().split('T')[0];

/* ── Custom Dropdown Hook to handle outside clicks ── */
function useOutsideClick(ref, callback) {
  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        callback();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref, callback]);
}

const ApplyLeave = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [form, setForm] = useState({
    leaveType: '',
    startDate: today(),
    endDate: today(),
    halfDay: false,
    halfDayPeriod: 'Morning',
    reason: '',
  });

  useOutsideClick(dropdownRef, () => setDropdownOpen(false));

  const totalDays = form.halfDay
    ? 0.5
    : Math.max(
        0,
        Math.round((new Date(form.endDate) - new Date(form.startDate)) / (1000 * 60 * 60 * 24)) + 1
      );

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.leaveType) { toast.error('Please select a leave type'); return; }
    if (!form.reason.trim()) { toast.error('Please enter a reason'); return; }
    if (totalDays <= 0) { toast.error('Invalid date range'); return; }

    setLoading(true);
    try {
      await applyLeave(form);
      toast.success('Leave applied successfully! 🎉');
      navigate('/leaves');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply leave');
    } finally {
      setLoading(false);
    }
  };

  const selectedType = LEAVE_TYPES.find((t) => t.value === form.leaveType);

  function getBalanceForType(val) {
    if (val === 'Paid') return user?.paidLeaveBalance || 0;
    if (val === 'CompOff') return user?.compOffBalance || 0;
    return null;
  }

  // Derived Info regarding Approval Flow
  const approvalFlowMessage = user?.role === 'Director' || user?.role === 'SuperUser'
    ? 'Your leave will be auto-approved.'
    : user?.role === 'VP'
    ? 'Your leave requires Director approval.'
    : user?.role === 'GM'
    ? 'Your leave requires VP → Director approval.'
    : user?.role === 'HR'
    ? 'Your leave requires GM → VP → Director approval.'
    : user?.role === 'Manager'
    ? 'Your leave requires HR → GM → VP → Director approval.'
    : 'Your leave requires Manager → HR → GM → VP approval.';

  return (
    <AppShell>
      <div className="page-wrapper fade-in al-page">
        
        {/* ── Header ── */}
        <div className="al-header">
          <button
            onClick={() => navigate('/leaves')}
            className="al-back-btn"
            title="Back to Leaves"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="al-header-text">
            <h1 className="al-title">Apply for Leave</h1>
            <p className="al-subtitle">Submit a highly priority leave request for manager review</p>
          </div>
        </div>

        <form className="al-form-layout" onSubmit={handleSubmit}>
          
          {/* ────── LEAVE TYPE (Custom Dropdown) ────── */}
          <div className="al-card">
            <h3 className="al-card-title">
              <div className="al-icon-wrapper" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                <CalendarDays size={18} />
              </div>
              Leave Type Selection
            </h3>
            
            <div className="al-dropdown-container" ref={dropdownRef}>
              <button
                type="button"
                className={`al-dropdown-trigger ${dropdownOpen ? 'al-dropdown-open' : ''} ${!selectedType ? 'al-unselected' : ''}`}
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                {selectedType ? (
                  <div className="al-dropdown-selected">
                    <span className="al-dot" style={{ background: selectedType.color }} />
                    <div className="al-selected-info">
                      <span className="al-selected-label">{selectedType.label}</span>
                      {getBalanceForType(selectedType.value) !== null && (
                        <span className="al-badge" style={{ background: `${selectedType.color}15`, color: selectedType.color }}>
                          Balance: {getBalanceForType(selectedType.value)}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <span>Select a valid Leave Type...</span>
                )}
                <ChevronDown size={18} className="al-dropdown-icon" />
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="al-dropdown-menu"
                  >
                    {LEAVE_TYPES.map((type) => {
                      const balance = getBalanceForType(type.value);
                      const active = form.leaveType === type.value;
                      return (
                        <div
                          key={type.value}
                          className={`al-dropdown-item ${active ? 'al-item-active' : ''}`}
                          onClick={() => {
                            set('leaveType', type.value);
                            setDropdownOpen(false);
                          }}
                        >
                          <div className="al-item-left">
                            <div className="al-dot" style={{ background: type.color }} />
                            <div>
                              <div className="al-item-label">{type.label}</div>
                              <div className="al-item-desc">{type.desc}</div>
                            </div>
                          </div>
                          <div className="al-item-right">
                            {balance !== null && (
                              <div className="al-item-balance">Bal: {balance}</div>
                            )}
                            {active && <Check size={16} color={type.color} />}
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ────── DURATION & DATES ────── */}
          <div className="al-card">
            <h3 className="al-card-title">
              <div className="al-icon-wrapper" style={{ background: '#FEF3C7', color: '#D97706' }}>
                <Clock size={18} />
              </div>
              Time & Duration
            </h3>

            {/* Half Day Toggle */}
            <div className="al-half-day-section">
              <label className="al-toggle-wrap">
                <div className={`al-toggle ${form.halfDay ? 'al-toggle-active' : ''}`} onClick={() => set('halfDay', !form.halfDay)}>
                  <div className="al-toggle-handle" />
                </div>
                <span className="al-toggle-label">Request Half Day</span>
              </label>

              <AnimatePresence>
                {form.halfDay && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="al-period-selector"
                  >
                    <button
                      type="button"
                      className={`al-period-btn ${form.halfDayPeriod === 'Morning' ? 'active-morning' : ''}`}
                      onClick={() => set('halfDayPeriod', 'Morning')}
                    >
                      <Sun size={14} /> Morning
                    </button>
                    <button
                      type="button"
                      className={`al-period-btn ${form.halfDayPeriod === 'Afternoon' ? 'active-afternoon' : ''}`}
                      onClick={() => set('halfDayPeriod', 'Afternoon')}
                    >
                      <Moon size={14} /> Afternoon
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className={`al-dates-grid ${form.halfDay ? 'al-grid-single' : 'al-grid-double'}`}>
              <div className="al-input-group">
                <label>START DATE</label>
                <div className="al-date-input-wrap">
                  <CalendarDays size={16} className="al-input-icon" />
                  <input
                    type="date"
                    value={form.startDate}
                    min={today()}
                    onChange={(e) => {
                      set('startDate', e.target.value);
                      if (e.target.value > form.endDate) set('endDate', e.target.value);
                    }}
                    className="al-input"
                  />
                </div>
              </div>
              
              {!form.halfDay && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="al-input-group">
                  <label>END DATE</label>
                  <div className="al-date-input-wrap">
                    <CalendarDays size={16} className="al-input-icon" />
                    <input
                      type="date"
                      value={form.endDate}
                      min={form.startDate}
                      onChange={(e) => set('endDate', e.target.value)}
                      className="al-input"
                    />
                  </div>
                </motion.div>
              )}
            </div>

            <div className="al-duration-summary">
              <Info size={16} />
              <span>You are requesting <strong>{totalDays} {totalDays === 1 ? 'day' : 'days'}</strong> of leave.</span>
            </div>
          </div>

          {/* ────── REASON ────── */}
          <div className="al-card">
            <div className="al-card-header-spread">
              <h3 className="al-card-title">
                <div className="al-icon-wrapper" style={{ background: '#E0E7FF', color: '#4F46E5' }}>
                  <FileText size={18} />
                </div>
                Reason for Leave
              </h3>
              <span className="al-char-count">{form.reason.length}/500</span>
            </div>
            
            <textarea
              className="al-textarea"
              value={form.reason}
              onChange={(e) => set('reason', e.target.value)}
              placeholder="Provide a clear description for your manager..."
              rows={4}
              maxLength={500}
            />
          </div>

          {/* ────── APPROVAL FLOW ALERT ────── */}
          <AnimatePresence>
            {form.leaveType && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="al-approval-alert"
              >
                <ShieldAlert size={20} className="al-alert-icon" />
                <div className="al-alert-content">
                  <h4>Approval Flow Required</h4>
                  <p>{approvalFlowMessage}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ────── SUBMIT BUTTON ────── */}
          <div className="al-submit-wrapper">
            <button type="submit" disabled={loading} className="al-submit-btn">
              {loading ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <>
                  <span>Submit Leave Request</span>
                  <div className="al-submit-arrow">
                    <Check size={18} />
                  </div>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        /* ── Page Layout ── */
        .al-page {
          max-width: 860px !important;
          margin: 0 auto;
          width: 100%;
        }

        .al-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 32px;
          padding-top: 10px;
        }

        .al-back-btn {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-lg);
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--color-text-secondary);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: var(--shadow-sm);
          flex-shrink: 0;
        }

        .al-back-btn:hover {
          background: var(--color-surface-hover);
          color: var(--color-primary);
          transform: translateX(-3px);
          border-color: var(--color-border-dark);
        }

        .al-title {
          font-size: clamp(1.5rem, 4vw, 1.8rem);
          font-weight: 900;
          letter-spacing: -0.04em;
          color: var(--color-text);
          margin: 0 0 4px 0;
        }

        .al-subtitle {
          color: var(--color-text-secondary);
          font-size: 0.9rem;
          margin: 0;
        }

        .al-form-layout {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        /* ── Cards ── */
        .al-card {
          background: var(--color-surface);
          border-radius: var(--radius-2xl);
          padding: 32px;
          border: 1px solid var(--color-border);
          box-shadow: 0 4px 24px rgba(0,0,0,0.02);
          transition: box-shadow 0.3s ease;
        }

        .al-card:hover {
          box-shadow: var(--shadow-md);
        }

        .al-card-title {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 1.1rem;
          font-weight: 800;
          color: var(--color-text);
          margin: 0 0 24px 0;
        }

        .al-card-header-spread {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }

        .al-card-header-spread .al-card-title {
          margin-bottom: 0;
        }

        .al-icon-wrapper {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* ── Custom Dropdown ── */
        .al-dropdown-container {
          position: relative;
          width: 100%;
        }

        .al-dropdown-trigger {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: var(--color-surface-alt);
          border: 1.5px solid var(--color-border);
          border-radius: var(--radius-xl);
          font-size: 1rem;
          font-family: inherit;
          font-weight: 600;
          color: var(--color-text);
          cursor: pointer;
          transition: all 0.2s;
        }

        .al-dropdown-trigger:hover, 
        .al-dropdown-trigger:focus,
        .al-dropdown-open {
          background: var(--color-surface);
          border-color: var(--color-primary);
          box-shadow: 0 0 0 4px var(--color-primary-ring);
          outline: none;
        }

        .al-unselected {
          color: var(--color-text-secondary);
          font-weight: 500;
        }

        .al-dropdown-selected {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .al-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .al-selected-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .al-badge {
          font-size: 0.75rem;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          letter-spacing: 0.02em;
        }

        .al-dropdown-icon {
          color: var(--color-text-tertiary);
          transition: transform 0.3s;
        }
        .al-dropdown-open .al-dropdown-icon {
          transform: rotate(180deg);
        }

        .al-dropdown-menu {
          position: absolute;
          top: calc(100% + 10px);
          left: 0;
          width: 100%;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-xl);
          z-index: 100;
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .al-dropdown-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all 0.2s;
        }

        .al-dropdown-item:hover {
          background: var(--color-surface-hover);
        }

        .al-item-active {
          background: var(--color-primary-light) !important;
        }

        .al-item-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .al-item-label {
          font-weight: 700;
          font-size: 0.95rem;
          color: var(--color-text);
          margin-bottom: 3px;
        }

        .al-item-desc {
          font-size: 0.8rem;
          color: var(--color-text-secondary);
        }

        .al-item-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .al-item-balance {
          font-size: 0.75rem;
          font-weight: 800;
          background: var(--color-surface-alt);
          color: var(--color-text-secondary);
          padding: 4px 8px;
          border-radius: var(--radius-sm);
        }

        /* ── Half Day & Toggle ── */
        .al-half-day-section {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 24px;
          background: var(--color-surface-alt);
          padding: 16px 20px;
          border-radius: var(--radius-xl);
        }

        .al-toggle-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
        }

        .al-toggle {
          width: 50px;
          height: 28px;
          background: var(--color-border-dark);
          border-radius: 99px;
          position: relative;
          transition: background 0.3s;
        }

        .al-toggle-active {
          background: var(--color-primary);
        }

        .al-toggle-handle {
          width: 20px;
          height: 20px;
          background: #fff;
          border-radius: 50%;
          position: absolute;
          top: 4px;
          left: 4px;
          transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .al-toggle-active .al-toggle-handle {
          transform: translateX(22px);
        }

        .al-toggle-label {
          font-weight: 700;
          font-size: 0.95rem;
          color: var(--color-text);
        }

        .al-period-selector {
          display: flex;
          background: var(--color-surface);
          border-radius: var(--radius-full);
          padding: 4px;
          border: 1px solid var(--color-border);
        }

        .al-period-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 6px 16px;
          border: none;
          background: transparent;
          border-radius: var(--radius-full);
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .al-period-btn.active-morning {
          background: #FFFBEB;
          color: #D97706;
          box-shadow: 0 2px 8px rgba(217, 119, 6, 0.15);
        }

        .al-period-btn.active-afternoon {
          background: #EEF2FF;
          color: #4F46E5;
          box-shadow: 0 2px 8px rgba(79, 70, 229, 0.15);
        }

        /* ── Date Pickers ── */
        .al-dates-grid {
          display: grid;
          gap: 20px;
        }
        .al-grid-single { grid-template-columns: 1fr; }
        .al-grid-double { grid-template-columns: 1fr 1fr; }

        .al-input-group label {
          display: block;
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: var(--color-text-tertiary);
          margin-bottom: 8px;
          text-transform: uppercase;
        }

        .al-date-input-wrap {
          position: relative;
        }

        .al-input-icon {
          position: absolute;
          top: 50%;
          left: 16px;
          transform: translateY(-50%);
          color: var(--color-text-tertiary);
          pointer-events: none;
        }

        .al-input {
          width: 100%;
          background: var(--color-surface-alt);
          border: 1.5px solid var(--color-border);
          padding: 16px 16px 16px 44px;
          border-radius: var(--radius-xl);
          font-family: inherit;
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--color-text);
          outline: none;
          transition: all 0.2s;
        }

        .al-input:focus {
          border-color: var(--color-primary);
          background: var(--color-surface);
          box-shadow: 0 0 0 4px var(--color-primary-ring);
        }

        /* Customize native date picker icon indicator */
        .al-input::-webkit-calendar-picker-indicator {
          cursor: pointer;
          opacity: 0.6;
          transition: opacity 0.2s;
        }
        .al-input::-webkit-calendar-picker-indicator:hover {
          opacity: 1;
        }

        .al-duration-summary {
          margin-top: 24px;
          background: var(--color-info-light);
          border: 1px solid #BAE6FD;
          border-radius: var(--radius-lg);
          padding: 14px 20px;
          display: flex;
          align-items: center;
          gap: 12px;
          color: #0369A1;
          font-size: 0.9rem;
        }

        /* ── Texture/Reason ── */
        .al-char-count {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--color-text-tertiary);
          background: var(--color-surface-alt);
          padding: 4px 10px;
          border-radius: var(--radius-full);
        }

        .al-textarea {
          width: 100%;
          background: var(--color-surface-alt);
          border: 1.5px solid var(--color-border);
          border-radius: var(--radius-xl);
          padding: 20px;
          font-family: inherit;
          font-size: 0.95rem;
          color: var(--color-text);
          line-height: 1.6;
          resize: vertical;
          outline: none;
          transition: all 0.2s;
        }

        .al-textarea:focus {
          border-color: var(--color-primary);
          background: var(--color-surface);
          box-shadow: 0 0 0 4px var(--color-primary-ring);
        }

        .al-textarea::placeholder {
          color: var(--color-text-tertiary);
        }

        /* ── Approval Alert ── */
        .al-approval-alert {
          background: linear-gradient(135deg, #F0FDF4, #ECFDF5);
          border: 1px solid #A7F3D0;
          border-radius: var(--radius-2xl);
          padding: 20px 24px;
          display: flex;
          gap: 16px;
          align-items: flex-start;
          overflow: hidden;
        }

        .al-alert-icon {
          color: #059669;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .al-alert-content h4 {
          margin: 0 0 4px 0;
          font-size: 0.95rem;
          font-weight: 800;
          color: #065F46;
        }

        .al-alert-content p {
          margin: 0;
          font-size: 0.88rem;
          color: #047857;
          line-height: 1.5;
        }

        /* ── Submit Button ── */
        .al-submit-wrapper {
          display: flex;
          justify-content: flex-end;
          padding-bottom: 20px;
        }

        .al-submit-btn {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 24px;
          border-radius: var(--radius-xl);
          border: none;
          background: var(--gradient-primary);
          color: #fff;
          font-size: 1.05rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 10px 25px rgba(32, 118, 199, 0.35);
          min-width: 260px;
          justify-content: center;
        }

        .al-submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 14px 30px rgba(32, 118, 199, 0.45);
        }

        .al-submit-btn:disabled {
          background: var(--color-border-dark);
          box-shadow: none;
          cursor: not-allowed;
          opacity: 0.7;
        }

        .al-submit-arrow {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: rgba(255,255,255,0.2);
          border-radius: 50%;
        }

        /* ── Responsive Mobile Classes ── */
        @media (max-width: 640px) {
          .al-page {
            padding: 0 14px 40px !important;
          }

          .al-card {
            padding: 24px 20px;
            border-radius: var(--radius-xl);
          }

          .al-dates-grid.al-grid-double {
            grid-template-columns: 1fr;
          }

          .al-half-day-section {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
            padding: 16px;
          }

          .al-dropdown-selected {
            font-size: 0.9rem;
          }

          .al-period-selector {
            width: 100%;
          }

          .al-submit-btn {
            width: 100%;
          }

          .al-dropdown-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }

          .al-item-right {
            width: 100%;
            justify-content: flex-end;
          }
        }
      `}</style>
    </AppShell>
  );
};

export default ApplyLeave;
