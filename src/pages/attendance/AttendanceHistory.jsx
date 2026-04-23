// AttendanceHistory.jsx
import { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  Search,
  Loader2,
  History,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import AppShell from '../../components/layout/AppShell';

// Status badge component (similar to AdminAttendance)
const StatusBadge = ({ status }) => {
  const statusStyles = {
    Approved: { bg: 'var(--color-success-light)', color: 'var(--color-success)', border: '1px solid var(--color-success)' },
    Pending: { bg: 'var(--color-warning-light)', color: 'var(--color-warning)', border: '1px solid var(--color-warning)' },
    Rejected: { bg: 'var(--color-error-light)', color: 'var(--color-error)', border: '1px solid var(--color-error)' },
    default: { bg: 'var(--color-surface-alt)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' },
  };
  const style = statusStyles[status] || statusStyles.default;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: 'var(--radius-full)',
        fontSize: '0.75rem',
        fontWeight: 700,
        textTransform: 'capitalize',
        backgroundColor: style.bg,
        color: style.color,
        border: style.border,
      }}
    >
      {status || '—'}
    </span>
  );
};

const AttendanceHistory = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showMobile, setShowMobile] = useState(window.innerWidth < 768);

  // Responsive handler
  useEffect(() => {
    const handleResize = () => setShowMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch correction history
  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get('/attendance/correction-history', {
          params: { month: selectedMonth, year: selectedYear },
        });
        setRecords(response.data.data || []);
      } catch (err) {
        console.error('Failed to fetch correction history:', err);
        setError(err.response?.data?.message || 'Failed to load correction history');
        toast.error('Could not fetch correction history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [selectedMonth, selectedYear]);

  // Filter records by search term (employee name or ID)
  const filteredRecords = records.filter((record) => {
    const term = searchTerm.toLowerCase();
    return (
      record.name?.toLowerCase().includes(term) ||
      record.employeeId?.toLowerCase().includes(term)
    );
  });

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Generate month options
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Generate year options (current year ± 5)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  return (
    <AppShell>
      <div className="page-wrapper fade-in">
        {/* Header Card with Gradient Strip */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-2xl)',
            overflow: 'hidden',
            marginBottom: '24px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ height: '4px', background: 'var(--gradient-primary)' }} />
          <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Title Section */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--gradient-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 6px 16px rgba(32,118,199,0.3)',
                }}
              >
                <History size={20} color="#fff" />
              </div>
              <div>
                <h1
                  style={{
                    fontSize: 'clamp(1.3rem, 4vw, 1.8rem)',
                    fontWeight: 900,
                    color: 'var(--color-text)',
                    letterSpacing: '-0.03em',
                  }}
                >
                  Attendance Correction History
                </h1>
                <p
                  style={{
                    color: 'var(--color-text-secondary)',
                    fontWeight: 500,
                    fontSize: '0.88rem',
                  }}
                >
                  Review past correction requests and their status
                </p>
              </div>
            </div>

            {/* Filters Row: Month/Year Selectors + Search */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                alignItems: 'center',
              }}
            >
              {/* Month Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={16} style={{ color: 'var(--color-text-tertiary)' }} />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  style={{
                    padding: '8px 32px 8px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    fontWeight: 500,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                    backgroundSize: '14px',
                  }}
                >
                  {months.map((month, idx) => (
                    <option key={idx} value={idx + 1}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Selector */}
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                style={{
                  padding: '8px 32px 8px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  fontWeight: 500,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  backgroundSize: '14px',
                }}
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>

              {/* Search Input */}
              <div
                style={{
                  position: 'relative',
                  flex: '1 1 200px',
                  maxWidth: '340px',
                  marginLeft: 'auto',
                }}
              >
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-tertiary)',
                  }}
                />
                <input
                  type="text"
                  placeholder="Search by name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: '40px' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Content: Loading / Error / Data */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
            <Loader2 size={40} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
          </div>
        ) : error ? (
          <div
            className="card"
            style={{
              padding: '40px',
              textAlign: 'center',
              color: 'var(--color-error)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <AlertCircle size={40} />
            <p style={{ fontWeight: 600 }}>{error}</p>
            <button
              className="btn-secondary"
              onClick={() => {
                setSelectedMonth(new Date().getMonth() + 1);
                setSelectedYear(new Date().getFullYear());
              }}
            >
              Try Again
            </button>
          </div>
        ) : showMobile ? (
          // Mobile Card View
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredRecords.length === 0 ? (
              <div
                className="card"
                style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: 'var(--color-text-tertiary)',
                }}
              >
                No correction requests found for {months[selectedMonth - 1]} {selectedYear}
              </div>
            ) : (
              filteredRecords.map((record) => (
                <div key={record.employeeId + record.date} className="card" style={{ padding: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        minWidth: '42px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--gradient-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: '1rem',
                        color: '#fff',
                        boxShadow: '0 4px 12px rgba(32,118,199,0.3)',
                      }}
                    >
                      {record.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{record.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>
                        {record.employeeId} · {formatDate(record.date)}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>
                        Requested
                      </span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                        {formatDateTime(record.requestedAt)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>
                        Reviewed By
                      </span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{record.reviewedBy || '—'}</span>
                    </div>
                    <div style={{ marginTop: '8px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                        Reason
                      </span>
                      <p style={{ fontSize: '0.85rem', margin: 0, lineHeight: 1.4 }}>{record.reason || '—'}</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <StatusBadge status={record.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          // Desktop Table View
          <div className="card" style={{ overflow: 'auto' }}>
            <table className="data-table" style={{ minWidth: '900px' }}>
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Date</th>
                  <th>Requested At</th>
                  <th>Status</th>
                  <th>Reason</th>
                  <th>Reviewed By</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-tertiary)' }}>
                      No correction requests found for {months[selectedMonth - 1]} {selectedYear}
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                    <tr key={record.employeeId + record.date}>
                      <td style={{ fontWeight: 600 }}>{record.employeeId}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: 'var(--radius-md)',
                              background: 'var(--gradient-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 900,
                              fontSize: '0.8rem',
                              color: '#fff',
                            }}
                          >
                            {record.name?.[0]?.toUpperCase()}
                          </div>
                          <span>{record.name}</span>
                        </div>
                      </td>
                      <td>{formatDate(record.date)}</td>
                      <td style={{ fontSize: '0.85rem' }}>{formatDateTime(record.requestedAt)}</td>
                      <td>
                        <StatusBadge status={record.status} />
                      </td>
                      <td style={{ maxWidth: '220px' }}>
                        <div style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{record.reason || '—'}</div>
                      </td>
                      <td>{record.reviewedBy || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default AttendanceHistory;