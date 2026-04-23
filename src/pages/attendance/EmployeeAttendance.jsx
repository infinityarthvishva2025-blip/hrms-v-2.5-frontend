// EmployeeAttendance.jsx
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  Search, MapPin, Eye, Loader2, X,
  Calendar, Users, FileText, BarChart2, Clock,
  AlertCircle, CheckCircle, ChevronRight, ChevronLeft,
  ChevronsLeft, ChevronsRight, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AppShell from '../../components/layout/AppShell';

// Status badge mapping
const STATUS_LABELS = {
  P: 'Present', A: 'Absent', WO: 'Week Off', L: 'Leave',
  Coff: 'Comp Off', AUTO: 'Partial', H: 'Holiday',
};

const StatusBadge = ({ status }) => {
  const getIcon = () => {
    switch(status) {
      case 'P': return <CheckCircle size={12} />;
      case 'A': return <AlertCircle size={12} />;
      default: return null;
    }
  };
  return status ? (
    <span className={`badge status-${status}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      {getIcon()}
      {STATUS_LABELS[status] || status}
    </span>
  ) : null;
};

// Leaflet map modal component (improved)
const MapModal = ({ isOpen, onClose, latitude, longitude, locationHistory = [], workMode, employeeName }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const loadLeaflet = async () => {
      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        link.crossOrigin = '';
        document.head.appendChild(link);
      }

      if (!window.L) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
          script.crossOrigin = '';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
    };

    loadLeaflet().then(() => {
      if (mapContainerRef.current && !mapInstanceRef.current && window.L) {
        const L = window.L;
        const map = L.map(mapContainerRef.current).setView([latitude, longitude], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Start marker
        L.marker([latitude, longitude]).addTo(map)
          .bindPopup(`<strong>Start (Check-in)</strong><br>${employeeName || 'Employee'}<br>${latitude}, ${longitude}`)
          .openPopup();

        // Draw path if there is location history
        if (locationHistory && locationHistory.length > 1) {
          const pathPoints = locationHistory.map(loc => [loc.latitude, loc.longitude]);
          
          // Polyline for the trail
          const polyline = L.polyline(pathPoints, {
            color: 'var(--color-primary)',
            weight: 4,
            opacity: 0.7,
            dashArray: '10, 10',
            lineJoin: 'round'
          }).addTo(map);

          // End marker (latest point)
          const lastPoint = pathPoints[pathPoints.length - 1];
          L.marker(lastPoint, {
            icon: L.divIcon({
              className: 'custom-div-icon',
              html: `<div style="background-color: var(--color-primary); width: 12px; height: 12px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>`,
              iconSize: [12, 12],
              iconAnchor: [6, 6]
            })
          }).addTo(map).bindPopup('<strong>Latest Location</strong>');

          // Fit bounds to show the whole path
          map.fitBounds(polyline.getBounds(), { padding: [30, 30] });
        }

        mapInstanceRef.current = map;
      }
    }).catch(err => {
      console.error('Failed to load Leaflet:', err);
      toast.error('Map could not be loaded');
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, latitude, longitude, employeeName]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'absolute', inset: 0 }}
      />
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 30, stiffness: 400 }}
        style={{
          position: 'relative',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-2xl)',
          width: 'calc(100% - 32px)',
          maxWidth: '700px',
          maxHeight: '92dvh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-2xl)',
          overflow: 'hidden'
        }}
      >
        <div style={{ height: '4px', background: 'var(--gradient-primary)', flexShrink: 0 }} />
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-md)', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MapPin size={18} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-text)' }}>
                {employeeName || 'Employee'} Location
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)' }}>
                {latitude?.toFixed(5)}, {longitude?.toFixed(5)}
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: '16px', height: '400px', width: '100%' }}>
          <div ref={mapContainerRef} style={{ height: '100%', width: '100%', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }} />
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </motion.div>
    </div>
  );
};

// Skeleton loader component
const TableSkeleton = ({ rows = 5, columns = 8 }) => (
  <div className="card" style={{ overflow: 'auto' }}>
    <table className="data-table">
      <thead>
        <tr>
          {Array(columns).fill().map((_, i) => (
            <th key={i}><div style={{ height: '20px', background: 'var(--color-border)', borderRadius: 'var(--radius-sm)', width: '80%' }} /></th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array(rows).fill().map((_, i) => (
          <tr key={i}>
            {Array(columns).fill().map((_, j) => (
              <td key={j}><div style={{ height: '20px', background: 'var(--color-border)', borderRadius: 'var(--radius-sm)', width: j === 1 ? '60%' : '80%' }} /></td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const EmployeeAttendance = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showMobile, setShowMobile] = useState(window.innerWidth < 768);
  const [selectedLocation, setSelectedLocation] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(7);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Responsive listener
  useEffect(() => {
    const onResize = () => setShowMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Fetch attendance with pagination and search
const fetchAttendance = useCallback(async () => {
  setLoading(true);
  try {
    const { data } = await api.get('/attendance/employee-attendance', {
      params: {
        date: selectedDate,
        page: currentPage,
        limit,
        search: debouncedSearch
      }
    });

    if (data.success) {
      setRecords(data.data || []);

      // ✅ FIXED PAGINATION PATH
      const pagination = data.message?.pagination || {};

      setTotalPages(pagination.totalPages || 1);
      setTotalRecords(pagination.total || 0);
    } else {
      toast.error(data.message || 'Failed to fetch attendance');
    }
  } catch (err) {
    toast.error('Failed to fetch attendance records');
    console.error(err);
  } finally {
    setLoading(false);
  }
}, [selectedDate, currentPage, limit, debouncedSearch]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Reset page when date changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate]);

  // Helper formatters
  const formatDate = (dateStr) => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };
 
  const formatTime = (dateStr) => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  const formatHours = (hours) => {
    if (hours === null || hours === undefined) return '--';
    return hours.toFixed(2);
  };

  const handleViewLocation = (record) => {
    if (record.location?.latitude && record.location?.longitude) {
      setSelectedLocation({
        lat: record.location.latitude,
        lng: record.location.longitude,
        name: record.employeeName,
        workMode: record.workMode,
        locationHistory: record.locationHistory || []
      });
    } else {
      toast.error('Location not available for this record');
    }
  };

  // Pagination handlers
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleLimitChange = (e) => {
    setLimit(Number(e.target.value));
    setCurrentPage(1);
  };

  // Quick action links
  const quickActions = [
    { label: 'Admin', path: '/attendance/admin', icon: Users },
    { label: 'Corrections', path: '/attendance/corrections', icon: FileText },
    { label: 'Corrections History', path: '/attendance/correction-history', icon: FileText },
    { label: 'Reports', path: '/attendance/reports', icon: BarChart2 },
  ];

  // Pagination UI component
  const Pagination = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '16px',
      marginTop: '24px',
      padding: '16px 0'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
          Showing {records.length} of {totalRecords} entries
        </span>
        <select
          value={limit}
          onChange={handleLimitChange}
          className="input-field"
          style={{ width: 'auto', padding: '6px 24px 6px 12px' }}
        >
          <option value={10}>10 per page</option>
          <option value={20}>20 per page</option>
          <option value={50}>50 per page</option>
        </select>
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          onClick={() => goToPage(1)}
          disabled={currentPage === 1}
          className="btn-secondary"
          style={{ padding: '8px 12px' }}
        >
          <ChevronsLeft size={16} />
        </button>
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="btn-secondary"
          style={{ padding: '8px 12px' }}
        >
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontWeight: 600, fontSize: '0.9rem', minWidth: '80px', textAlign: 'center' }}>
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="btn-secondary"
          style={{ padding: '8px 12px' }}
        >
          <ChevronRight size={16} />
        </button>
        <button
          onClick={() => goToPage(totalPages)}
          disabled={currentPage === totalPages}
          className="btn-secondary"
          style={{ padding: '8px 12px' }}
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <AppShell>
      <div className="page-wrapper fade-in">
        {/* Header Section */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-2xl)',
          overflow: 'hidden',
          marginBottom: '24px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ height: '4px', background: 'var(--gradient-primary)' }} />
          <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <div style={{ width: '46px', height: '46px', borderRadius: 'var(--radius-lg)', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px rgba(32,118,199,0.3)' }}>
                <Calendar size={20} color="#fff" />
              </div>
              <div style={{ flex: 1 }}>
                <h1 style={{ fontSize: 'clamp(1.3rem, 4vw, 1.8rem)', fontWeight: 900, color: 'var(--color-text)', letterSpacing: '-0.03em' }}>
                  Employee Attendance
                </h1>
                <p style={{ color: 'var(--color-text-secondary)', fontWeight: 500, fontSize: '0.88rem' }}>
                  Daily attendance records with check-in/out times and location
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {quickActions.map((action) => (
                  <Link
                    key={action.path}
                    to={action.path}
                    className="btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '0.85rem', fontWeight: 600 }}
                  >
                    <action.icon size={16} />
                    {action.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Search + Date Selector Row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: '320px' }}>
                <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
                <input
                  type="text"
                  placeholder="Search by name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: '40px' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label htmlFor="date-select" style={{ fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                  Date:
                </label>
                <input
                  id="date-select"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="input-field"
                  style={{ width: 'auto', minWidth: '150px' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Loading State with Skeleton */}
        {loading ? (
          <TableSkeleton rows={limit} columns={8} />
        ) : records.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-tertiary)' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📋</div>
            <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>No attendance records found</p>
            <p style={{ fontSize: '0.9rem' }}>Try selecting a different date or clearing the search.</p>
          </div>
        ) : showMobile ? (
          /* Mobile Card Layout with Pagination */
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <AnimatePresence>
                {records.map((r, idx) => (
                  <motion.div
                    key={r.employeeCode + r.date}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="card"
                    style={{ padding: '18px' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                      <div style={{ width: '42px', height: '42px', minWidth: '42px', borderRadius: 'var(--radius-md)', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1rem', color: '#fff', boxShadow: '0 4px 12px rgba(32,118,199,0.3)' }}>
                        {r.employeeName?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{r.employeeName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>
                          {r.employeeCode} &middot; {formatDate(r.date)}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <p style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', marginBottom: '4px', fontWeight: 600 }}>CHECK IN</p>
                        <p style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--color-success)' }}>{formatTime(r.checkInTime)}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', marginBottom: '4px', fontWeight: 600 }}>CHECK OUT</p>
                        <p style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--color-primary)' }}>{formatTime(r.checkOutTime)}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', marginBottom: '4px', fontWeight: 600 }}>TOTAL HOURS</p>
                        <p style={{ fontWeight: 800, fontSize: '0.9rem' }}>{formatHours(r.totalHours)}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', marginBottom: '4px', fontWeight: 600 }}>STATUS</p>
                        <StatusBadge status={r.status} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
                        <MapPin size={14} />
                        {r.location?.latitude && r.location?.longitude ? 'Location available' : 'No location'}
                      </div>
                      <button
                        onClick={() => handleViewLocation(r)}
                        disabled={!r.location?.latitude || !r.location?.longitude}
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.75rem', opacity: r.location?.latitude ? 1 : 0.5 }}
                      >
                        <Eye size={14} style={{ marginRight: '4px' }} /> View
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <Pagination />
          </>
        ) : (
          /* Desktop Table Layout with Pagination */
          <>
            <div className="card" style={{ overflow: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee Code</th>
                    <th>Name</th>
                    <th>Date</th>
                    <th>Work Mode</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Total Hours</th>
                    <th>Status</th>
                    <th>Location</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {records.map((r, idx) => (
                      <motion.tr
                        key={r.employeeCode + r.date}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        whileHover={{ backgroundColor: 'var(--color-surface-hover)' }}
                        style={{ transition: 'background 0.2s' }}
                      >
                        <td style={{ fontWeight: 600 }}>{r.employeeCode}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '30px', height: '30px', borderRadius: 'var(--radius-md)', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', color: '#fff' }}>
                              {r.employeeName?.[0]?.toUpperCase()}
                            </div>
                            {r.employeeName}
                          </div>
                        </td>
                        <td>{formatDate(r.date)}</td>
                        <td>
                          <span className={`badge ${r.workMode === 'Field' ? 'status-Coff' : r.workMode === 'WFH' ? 'status-WO' : 'status-AUTO'}`} style={{ fontSize: '0.7rem' }}>
                            {r.workMode || 'Office'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--color-success)', fontWeight: 600 }}>{formatTime(r.checkInTime)}</td>
                        <td style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{formatTime(r.checkOutTime)}</td>
                        <td style={{ fontWeight: 600 }}>{formatHours(r.totalHours)}</td>
                        <td><StatusBadge status={r.status} /></td>
                        <td>
                          {r.location?.latitude && r.location?.longitude ? (
                            <button
                              onClick={() => handleViewLocation(r)}
                              className="btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <MapPin size={14} /> View
                            </button>
                          ) : (
                            <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <MapPin size={14} /> N/A
                            </span>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
            <Pagination />
          </>
        )}

        {/* Location Map Modal */}
        <AnimatePresence>
          {selectedLocation && (
            <MapModal
              isOpen={!!selectedLocation}
              onClose={() => setSelectedLocation(null)}
              latitude={selectedLocation.lat}
              longitude={selectedLocation.lng}
              locationHistory={selectedLocation.locationHistory}
              workMode={selectedLocation.workMode}
              employeeName={selectedLocation.name}
            />
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
};

export default EmployeeAttendance;