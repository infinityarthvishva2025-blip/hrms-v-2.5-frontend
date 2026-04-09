import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  Clock, MapPin, CheckCircle, LogOut, Loader2,
  AlertCircle, ChevronRight, Send, UserCircle, X,
  FileText, AlertTriangle, Users, Camera, Wifi, WifiOff,
  Shield, Zap, Info, ExternalLink, CameraOff, ArrowLeft
} from 'lucide-react';
import * as faceapi from 'face-api.js';
import { motion, AnimatePresence } from 'framer-motion';
import AppShell from '../../components/layout/AppShell';
import { useAuth } from '../../context/AuthContext';

function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/* ── Geo status pill ── */
const GeoStatus = ({ status, distance }) => {
  const statusMap = {
    checking:         { color: '#2076C7', bg: 'rgba(32,118,199,0.12)', border: 'rgba(32,118,199,0.3)', Icon: Wifi,        text: 'Checking location…' },
    valid:            { color: '#1CADA3', bg: 'rgba(28,173,163,0.12)', border: 'rgba(28,173,163,0.3)', Icon: CheckCircle, text: `Within zone · ${distance}m` },
    invalid:          { color: '#DC2626', bg: 'rgba(220,38,38,0.12)',  border: 'rgba(220,38,38,0.3)',  Icon: WifiOff,     text: `Out of range · ${distance}m` },
    error:            { color: '#DC2626', bg: 'rgba(220,38,38,0.12)',  border: 'rgba(220,38,38,0.3)',  Icon: WifiOff,     text: 'GPS error' },
    permission_denied:{ color: '#DC2626', bg: 'rgba(220,38,38,0.12)',  border: 'rgba(220,38,38,0.3)',  Icon: AlertCircle, text: 'Location blocked' },
  };
  const c = statusMap[status] || statusMap.checking;
  const CIcon = c.Icon;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '7px',
        background: c.bg, color: c.color,
        padding: '7px 14px', borderRadius: 'var(--radius-full)',
        fontSize: '0.78rem', fontWeight: 700,
        border: `1px solid ${c.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      <CIcon size={13} />
      {c.text}
    </motion.div>
  );
};

/* ── Location permission banner ── */
const LocationPermissionBanner = ({ onRetry }) => {
  const [showDetails, setShowDetails] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="att-permission-banner"
    >
      <div className="att-perm-left">
        <div className="att-perm-icon" style={{ background: '#DC2626' }}>
          <MapPin size={16} color="#fff" />
        </div>
        <div>
          <p className="att-perm-title">Location access required</p>
          <p className="att-perm-desc">Attendance requires your location to verify office zone.</p>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="att-perm-toggle"
          >
            {showDetails ? 'Hide instructions ↑' : 'How to enable location →'}
          </button>
        </div>
      </div>
      <button onClick={onRetry} className="att-perm-retry-btn">
        <MapPin size={15} /> Retry
      </button>
      {showDetails && (
        <div className="att-perm-details">
          <p style={{ fontWeight: 700, marginBottom: '8px' }}>🔧 To enable location:</p>
          <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--color-text-secondary)' }}>
            <li>Click the <strong>lock icon</strong> 🔒 in your address bar</li>
            <li>Set <strong>Location</strong> to <strong>Allow</strong></li>
            <li>Refresh or tap <strong>"Retry"</strong> above</li>
          </ul>
        </div>
      )}
    </motion.div>
  );
};

/* ── Camera permission denied banner ── */
const CameraPermissionBanner = ({ onClose }) => (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    className="att-permission-banner att-perm-camera"
  >
    <div className="att-perm-left">
      <div className="att-perm-icon" style={{ background: '#7C3AED' }}>
        <CameraOff size={16} color="#fff" />
      </div>
      <div>
        <p className="att-perm-title">Camera access blocked</p>
        <p className="att-perm-desc">Face verification needs camera access. Please enable it in browser settings.</p>
        <div style={{ marginTop: '8px', fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
          <strong>Steps:</strong> Address bar → 🔒 Lock → Camera → Allow → Refresh
        </div>
      </div>
    </div>
    <button onClick={onClose} className="btn-icon">
      <X size={15} />
    </button>
  </motion.div>
);

const AttendancePage = () => {
  const { user, refreshProfile } = useAuth();
  const isBypassUser = user?.employeeCode === 'IA00117';
  const [todayRecord, setTodayRecord]         = useState(null);
  const [loading, setLoading]                 = useState(true);
  const [actionLoading, setActionLoading]     = useState(false);
  const [geoStatus, setGeoStatus]             = useState('checking');
  const [geoDistance, setGeoDistance]         = useState(0);
  const [coords, setCoords]                   = useState(null);
  const [remainingMs, setRemainingMs]         = useState(0);
  const [isOvertime, setIsOvertime]           = useState(false);
  const [officeSettings, setOfficeSettings]   = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData]           = useState({ todayWork: '', pendingWork: '', issuesFaced: '', reportParticipants: [] });
  const [managementEmployees, setManagementEmployees] = useState([]);
  const [showFaceModal, setShowFaceModal]     = useState(false);
  const [verifyingFace, setVerifyingFace]     = useState(false);
  const [modelsLoaded, setModelsLoaded]       = useState(false);
  const [faceOp, setFaceOp]                   = useState(null);
  const [cameraPermDenied, setCameraPermDenied] = useState(false);
  const navigate = useNavigate();
  const videoRef = useRef();

  /* ── Face Models ── */
  const loadModels = async () => {
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
      ]);
      setModelsLoaded(true);
    } catch (err) {
      toast.error('Failed to load face verification models');
    }
  };

  /* ── Camera with permission fallback ── */
  const startVideo = async () => {
    try {
      // Proactively check camera permission if supported
      if (navigator.permissions?.query) {
        try {
          const camPerm = await navigator.permissions.query({ name: 'camera' });
          if (camPerm.state === 'denied') {
            setCameraPermDenied(true);
            setShowFaceModal(false);
            toast.error('Camera blocked. Please enable it in browser settings.');
            return;
          }
        } catch (_) { /* permission API may not support 'camera' in all browsers */ }
      }

      const constraints = {
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraPermDenied(false);
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraPermDenied(true);
        setShowFaceModal(false);
        toast.error('Camera permission denied. Enable it in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        toast.error('No camera found on this device.');
        setShowFaceModal(false);
      } else {
        toast.error('Could not access camera. Please try again.');
      }
    }
  };

  const stopVideo = () => {
    if (videoRef.current?.srcObject)
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
  };

  const handleVerifyFaceAndProceed = async () => {
    if (!videoRef.current) return;
    setVerifyingFace(true);
    try {
      if (!user.faceDescriptor?.length) {
        toast.error('Face ID not registered. Visit your Profile to set it up.');
        setVerifyingFace(false);
        return;
      }
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) { toast.error('No face detected. Reposition yourself.'); setVerifyingFace(false); return; }

      const dist = faceapi.euclideanDistance(detection.descriptor, new Float32Array(user.faceDescriptor));
      if (dist > 0.6) { toast.error('Face mismatch. Try again.'); setVerifyingFace(false); return; }

      toast.success('Identity Verified ✓');
      setShowFaceModal(false);
      stopVideo();
      if (faceOp === 'checkin') await proceedWithCheckIn();
      else if (faceOp === 'checkout') setShowReportModal(true);
    } catch (err) {
      toast.error('Face verification failed');
    } finally { setVerifyingFace(false); }
  };

  /* ── Live timer ── */
  useEffect(() => {
    refreshProfile();
    if (!todayRecord?.inTime || todayRecord?.outTime) return;
    const inTime = new Date(todayRecord.inTime);
    const shiftMs = (inTime.getDay() === 6 ? 7 : 8.5) * 3600000;
    const tick = () => {
      const worked = Date.now() - inTime.getTime();
      const rem = shiftMs - worked;
      setIsOvertime(rem < 0);
      setRemainingMs(Math.abs(rem));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [todayRecord]);

  /* ── Enhanced geo with proactive permission check ── */
  const fetchGeo = useCallback(async (office) => {
    if (!office || !navigator.geolocation) { setGeoStatus('error'); return; }
    setGeoStatus('checking');

    // Proactively check permission state where supported
    if (navigator.permissions?.query) {
      try {
        const perm = await navigator.permissions.query({ name: 'geolocation' });
        if (perm.state === 'denied') {
          setGeoStatus('permission_denied');
          setCoords(null);
          return; // Skip the geolocation call, it will just fail anyway
        }
        // Listen for dynamic permission changes
        perm.onchange = () => {
          if (perm.state === 'granted') fetchGeo(office);
          else if (perm.state === 'denied') { setGeoStatus('permission_denied'); setCoords(null); }
        };
      } catch (_) { /* Some browsers don't support geolocation in permissions API */ }
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude, longitude } }) => {
        setCoords({ latitude, longitude });
        const R = 6371000, tr = v => (v * Math.PI) / 180;
        const dLat = tr(latitude - office.lat), dLng = tr(longitude - office.lng);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(tr(office.lat)) * Math.cos(tr(latitude)) * Math.sin(dLng / 2) ** 2;
        const d = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
        setGeoDistance(d);
        setGeoStatus(d <= office.radius ? 'valid' : 'invalid');
      },
      (err) => {
        if (err.code === 1) {
          setGeoStatus('permission_denied');
          toast.error('Location permission denied. Enable it in browser/device settings.', { id: 'geo-denied' });
        } else if (err.code === 2) {
          setGeoStatus('error');
          toast.error('Location unavailable. Check device GPS.', { id: 'geo-unavail' });
        } else if (err.code === 3) {
          setGeoStatus('error');
          toast.error('Location request timed out. Try again.', { id: 'geo-timeout' });
        } else {
          setGeoStatus('error');
        }
        setCoords(null);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }, []);

  const fetchToday = useCallback(async () => {
    try {
      const { data } = await api.get('/attendance/today');
      setTodayRecord(data.data.record);
      if (data.data.office) {
        setOfficeSettings(data.data.office);
        fetchGeo(data.data.office);
      }
    } catch (_) {}
    setLoading(false);
  }, [fetchGeo]);

  const fetchManagement = useCallback(async () => {
    try {
      const { data } = await api.get('/employees/management');
      setManagementEmployees(data.data);
    } catch (_) {}
  }, []);

  useEffect(() => { fetchToday(); fetchManagement(); }, [fetchToday, fetchManagement]);

  const handleCheckIn = async () => {
    if (!coords && !isBypassUser) {
      toast.error('Location not available. Please allow location access.');
      if (geoStatus === 'permission_denied') fetchGeo(officeSettings);
      return;
    }
    if (geoStatus === 'invalid' && !isBypassUser) { toast.error(`Out of Zone: ${geoDistance}m away.`); return; }
    if (!user.faceDescriptor?.length) { toast.error('Register Face ID from Profile first!'); return; }
    if (!modelsLoaded) await loadModels();
    setFaceOp('checkin');
    setShowFaceModal(true);
    setTimeout(startVideo, 100);
  };

  const proceedWithCheckIn = async () => {
    setActionLoading(true);
    try {
      await api.post('/attendance/check-in', { 
        latitude: coords?.latitude ?? null, 
        longitude: coords?.longitude ?? null 
      });
      toast.success('Checked In Successfully!');
      fetchToday();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in failed');
    } finally { setActionLoading(false); }
  };

  const handleCheckOutSubmit = async () => {
    if (!reportData.todayWork.trim()) { toast.error("Describe today's work first"); return; }
    setActionLoading(true);
    try {
      const { data } = await api.post('/attendance/check-out', { 
        latitude: coords?.latitude ?? null, 
        longitude: coords?.longitude ?? null, 
        ...reportData 
      });
      const { overtimeMinutes, shortfallMinutes } = data.data;
      if (overtimeMinutes > 0) toast.success(`Checked out! Overtime: ${overtimeMinutes}m`);
      else if (shortfallMinutes > 0) toast(`Checked out ${shortfallMinutes}m early`, { icon: '⚠️' });
      else toast.success('Checked Out Successfully!');
      setShowReportModal(false);
      fetchToday();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-out failed');
    } finally { setActionLoading(false); }
  };

  const toggleParticipant = (id) =>
    setReportData(p => ({
      ...p,
      reportParticipants: p.reportParticipants.includes(id)
        ? p.reportParticipants.filter(x => x !== id)
        : [...p.reportParticipants, id],
    }));

  const isCheckedIn  = !!todayRecord?.inTime;
  const isCheckedOut = !!todayRecord?.outTime;
  const fmtT = (s) => s ? new Date(s).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';
  const canAct = (isBypassUser || geoStatus === 'valid') && !actionLoading && (isBypassUser || coords);

  return (
    <AppShell>
      <div className="page-wrapper fade-in att-page">

        {/* ── Page Header ── */}
        <div className="att-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              onClick={() => navigate('/dashboard')}
              className="btn-icon"
              style={{ background: '#fff', border: '1px solid #EEF0F8', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
              title="Back to Dashboard"
            >
              <ArrowLeft size={18} color="#2076C7" />
            </button>
            <div>
              <h1 className="att-title">Attendance</h1>
              <p className="att-date">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>
          <div className="att-header-actions">
            {isBypassUser ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '7px',
                  background: 'rgba(139, 92, 246, 0.12)', color: '#8B5CF6',
                  padding: '7px 14px', borderRadius: 'var(--radius-full)',
                  fontSize: '0.78rem', fontWeight: 700,
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  whiteSpace: 'nowrap',
                }}
              >
                <Zap size={13} /> Remote Access Active
              </motion.div>
            ) : (
              <GeoStatus status={geoStatus} distance={geoDistance} />
            )}
            <button
              className="btn-icon"
              onClick={() => fetchGeo(officeSettings)}
              title="Refresh Location"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <MapPin size={15} />
            </button>
          </div>
        </div>

        {/* ── Permission Banners ── */}
        <AnimatePresence>
          {geoStatus === 'permission_denied' && (
            <LocationPermissionBanner key="geo-banner" onRetry={() => fetchGeo(officeSettings)} />
          )}
          {cameraPermDenied && (
            <CameraPermissionBanner key="cam-banner" onClose={() => setCameraPermDenied(false)} />
          )}
        </AnimatePresence>

        {/* ── Main Grid ── */}
        <div className="att-grid">

          {/* ── Hero Action Card ── */}
          <div className="att-hero-card">
            {/* Gradient mesh overlay */}
            <div className="att-hero-glow att-hero-glow-1" />
            <div className="att-hero-glow att-hero-glow-2" />

            <div className="att-hero-inner">
              {loading ? (
                <Loader2 size={40} className="animate-spin" style={{ color: 'rgba(255,255,255,0.3)' }} />
              ) : (
                <AnimatePresence mode="wait">
                  {isCheckedIn && !isCheckedOut && (
                    <motion.div key="timer" initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="att-timer-section">
                      <span className="att-timer-label">{isOvertime ? '⏱ Overtime Running' : 'Shift Time Remaining'}</span>
                      <div className={`att-timer-value ${isOvertime ? 'att-overtime' : ''}`}>
                        {isOvertime && '+'}{formatDuration(remainingMs)}
                      </div>
                      <p className="att-timer-foot">Clocked in at {fmtT(todayRecord?.inTime)}</p>
                    </motion.div>
                  )}

                  {!isCheckedIn && (
                    <motion.div key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="att-state-section">
                      <div className="att-state-icon">
                        <Clock size={34} />
                      </div>
                      <h2>Ready to Begin?</h2>
                      <p>Ensure you're within the office zone, then check in securely.</p>
                    </motion.div>
                  )}

                  {isCheckedOut && (
                    <motion.div key="done" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="att-state-section">
                      <div className="att-state-icon att-state-icon-done">
                        <CheckCircle size={34} />
                      </div>
                      <h2>Day Complete!</h2>
                      <p>Attendance securely logged. See you tomorrow!</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}

              {!loading && (
                <div className="att-action-buttons">
                  {!isCheckedIn && (
                    <motion.button
                      whileHover={{ scale: canAct ? 1.03 : 1 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleCheckIn}
                      disabled={!canAct}
                      className={`att-action-btn att-btn-checkin ${!canAct ? 'att-btn-disabled' : ''}`}
                    >
                      {actionLoading ? <Loader2 size={22} className="animate-spin" /> : <Shield size={22} />}
                      <span>Secure Check In</span>
                    </motion.button>
                  )}

                  {isCheckedIn && !isCheckedOut && (
                    <motion.button
                      whileHover={{ scale: canAct ? 1.03 : 1 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={async () => {
                        if (!coords && !isBypassUser) {
                          toast.error('Location unavailable');
                          if (geoStatus === 'permission_denied') fetchGeo(officeSettings);
                          return;
                        }
                        if (geoStatus === 'invalid' && !isBypassUser) { toast.error('Out of zone!'); return; }
                        if (!user.faceDescriptor?.length) { toast.error('Face ID not registered!'); return; }
                        if (!modelsLoaded) await loadModels();
                        setFaceOp('checkout');
                        setShowFaceModal(true);
                        setTimeout(startVideo, 100);
                      }}
                      disabled={!canAct}
                      className={`att-action-btn att-btn-checkout ${!canAct ? 'att-btn-disabled' : ''}`}
                    >
                      {actionLoading ? <Loader2 size={22} className="animate-spin" /> : <LogOut size={22} />}
                      <span>Check Out</span>
                    </motion.button>
                  )}

                  {/* Geo hint when out of range or checking */}
                  {!canAct && !actionLoading && !loading && (
                    <p className="att-geo-hint">
                      {geoStatus === 'checking' && '📡 Verifying your location…'}
                      {geoStatus === 'invalid' && `📍 You are ${geoDistance}m from office (out of range)`}
                      {geoStatus === 'permission_denied' && '🔒 Location blocked — see banner above'}
                      {geoStatus === 'error' && '⚠️ GPS unavailable — tap refresh'}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Side Panel ── */}
          <div className="att-side-panel">

            {/* Today's Metrics */}
            <div className="att-metrics-card">
              <p className="section-title">Today's Metrics</p>
              <div className="att-metrics-list">
                <div className="att-metric-row">
                  <span className="att-metric-label">Check In</span>
                  <span className="att-metric-val" style={{ color: 'var(--color-success)' }}>
                    {loading ? '—' : fmtT(todayRecord?.inTime)}
                  </span>
                </div>
                <div className="att-divider" />
                <div className="att-metric-row">
                  <span className="att-metric-label">Check Out</span>
                  <span className="att-metric-val" style={{ color: isCheckedOut ? 'var(--color-primary)' : 'var(--color-text-tertiary)' }}>
                    {loading ? '—' : isCheckedOut ? fmtT(todayRecord?.outTime) : 'Pending'}
                  </span>
                </div>
                {todayRecord?.totalHours && (
                  <>
                    <div className="att-divider" />
                    <div className="att-metric-row">
                      <span className="att-metric-label">Total Hours</span>
                      <span className="att-metric-val" style={{ color: '#8B5CF6' }}>
                        {todayRecord.totalHours.toFixed(1)}h
                      </span>
                    </div>
                  </>
                )}
                {todayRecord?.isLate && (
                  <div className="att-late-badge">
                    <AlertCircle size={14} />
                    <span>Late by {todayRecord.lateMinutes} min</span>
                  </div>
                )}
              </div>
            </div>

            {/* History Link */}
            <motion.a href="/attendance/summary" whileHover={{ y: -3 }} className="att-history-link">
              <div className="att-history-card">
                <div className="att-history-icon">
                  <FileText size={19} color="#fff" />
                </div>
                <div>
                  <p className="att-history-title">Attendance History</p>
                  <p className="att-history-sub">View monthly logs &amp; reports</p>
                </div>
                <ChevronRight size={16} style={{ marginLeft: 'auto', color: 'var(--color-text-tertiary)' }} />
              </div>
            </motion.a>

            {/* Zone Info */}
            {officeSettings && (
              <div className="att-zone-card">
                <p className="section-title">Office Zone</p>
                <div className="att-zone-row">
                  <div className={`att-zone-dot ${geoStatus === 'valid' ? 'att-zone-dot-ok' : 'att-zone-dot-err'}`}>
                    <MapPin size={15} />
                  </div>
                  <div>
                    <p className="att-zone-radius">Radius: {officeSettings.radius}m</p>
                    <p className="att-zone-dist">You are {geoDistance}m away</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════
            CHECKOUT REPORT MODAL
        ══════════════════════════════════════ */}
        <AnimatePresence>
          {showReportModal && (
            <div className="modal-backdrop">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowReportModal(false)}
                style={{ position: 'absolute', inset: 0 }}
              />
              <motion.div
                initial={{ scale: 0.92, opacity: 0, y: 24 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: 24 }}
                transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                className="att-modal"
              >
                {/* Modal Header */}
                <div className="att-modal-header">
                  <div className="att-modal-header-icon">
                    <Send size={16} color="#fff" />
                  </div>
                  <div>
                    <h2>Check-out Report</h2>
                    <p>Complete your daily EOD before leaving</p>
                  </div>
                  <button className="btn-icon att-modal-close" onClick={() => setShowReportModal(false)}>
                    <X size={17} />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="att-modal-body">
                  {[
                    { key: 'todayWork',    label: "Today's Completed Work *", icon: CheckCircle, placeholder: 'What specific tasks did you complete today?', rows: 3 },
                    { key: 'pendingWork',  label: 'Pending / Carry-over Tasks',  icon: Clock,        placeholder: 'Any tasks to carry forward to tomorrow?',     rows: 2 },
                    { key: 'issuesFaced',  label: 'Blockers / Issues Faced',     icon: AlertTriangle, placeholder: 'Any blockers, challenges, or escalations?',  rows: 2 },
                  ].map(({ key, label, icon: LIcon, placeholder, rows }) => (
                    <div key={key} className="form-group">
                      <label className="form-label"><LIcon size={13} /> {label}</label>
                      <textarea
                        className="input-field"
                        placeholder={placeholder}
                        rows={rows}
                        value={reportData[key]}
                        onChange={(e) => setReportData({ ...reportData, [key]: e.target.value })}
                      />
                    </div>
                  ))}

                  {managementEmployees.length > 0 && (
                    <div className="form-group">
                      <label className="form-label"><Users size={13} /> Share Report With</label>
                      <div className="att-participants-grid">
                        {managementEmployees.map(emp => {
                          const sel = reportData.reportParticipants.includes(emp._id);
                          return (
                            <button
                              key={emp._id}
                              onClick={() => toggleParticipant(emp._id)}
                              className={`att-participant-chip ${sel ? 'att-chip-sel' : ''}`}
                            >
                              <UserCircle size={13} />
                              <span>{emp.name}</span>
                              <span className="att-chip-role">({emp.role})</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="att-modal-actions">
                    <button className="btn-secondary" onClick={() => setShowReportModal(false)}>Cancel</button>
                    <button className="btn-primary" onClick={handleCheckOutSubmit} disabled={actionLoading}>
                      {actionLoading ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                      Submit &amp; Check Out
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ══════════════════════════════════════
            FACE VERIFICATION MODAL
        ══════════════════════════════════════ */}
        <AnimatePresence>
          {showFaceModal && (
            <div className="modal-backdrop">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => { setShowFaceModal(false); stopVideo(); }}
                style={{ position: 'absolute', inset: 0 }}
              />
              <motion.div
                initial={{ scale: 0.88, opacity: 0, y: 28 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.88, opacity: 0 }}
                transition={{ type: 'spring', damping: 28, stiffness: 380 }}
                className="att-face-modal"
              >
                <button className="btn-icon att-face-close" onClick={() => { setShowFaceModal(false); stopVideo(); }}>
                  <X size={15} />
                </button>

                <div className="att-face-icon">
                  <Shield size={24} color="#fff" />
                </div>
                <h2>Security Verification</h2>
                <p>Verifying identity for <strong>{faceOp === 'checkin' ? 'Check In' : 'Check Out'}</strong></p>

                <div className="att-camera-ring">
                  <video ref={videoRef} autoPlay muted playsInline className="att-camera-video" />
                  <div className="att-scan-line" />
                  {/* Corner brackets */}
                  <div className="att-cam-corner att-cam-tl" />
                  <div className="att-cam-corner att-cam-tr" />
                  <div className="att-cam-corner att-cam-bl" />
                  <div className="att-cam-corner att-cam-br" />
                </div>

                <p className="att-face-hint">Position your face in the circle</p>

                <div className="att-face-actions">
                  <button className="btn-secondary" onClick={() => { setShowFaceModal(false); stopVideo(); }}>Cancel</button>
                  <button className="btn-primary" onClick={handleVerifyFaceAndProceed} disabled={verifyingFace}>
                    {verifyingFace ? <Loader2 size={17} className="animate-spin" /> : <Shield size={17} />}
                    {verifyingFace ? 'Verifying…' : 'Verify Identity'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>

      <style>{`
        /* ─── Page Layout ─────────────────────────────── */
        .att-page {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 16px;
        }

        .att-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          flex-wrap: wrap;
          gap: 14px;
          margin-bottom: 24px;
        }

        .att-title {
          font-size: clamp(1.5rem, 4vw, 2rem);
          font-weight: 900;
          letter-spacing: -0.04em;
          color: var(--color-text);
          margin-bottom: 2px;
        }

        .att-date {
          color: var(--color-text-secondary);
          font-weight: 500;
          font-size: 0.9rem;
        }

        .att-header-actions {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }

        /* ─── Permission Banners ──────────────────────── */
        .att-permission-banner {
          display: flex;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 14px;
          background: rgba(220,38,38,0.07);
          border: 1px solid rgba(220,38,38,0.22);
          border-radius: var(--radius-xl);
          padding: 16px 18px;
          margin-bottom: 20px;
        }

        .att-perm-camera {
          background: rgba(139,92,246,0.07);
          border-color: rgba(139,92,246,0.22);
        }

        .att-perm-left {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          flex: 1;
        }

        .att-perm-icon {
          width: 34px;
          height: 34px;
          min-width: 34px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .att-perm-title {
          font-weight: 800;
          font-size: 0.9rem;
          margin-bottom: 3px;
          color: var(--color-text);
        }

        .att-perm-desc {
          font-size: 0.8rem;
          color: var(--color-text-secondary);
          line-height: 1.5;
        }

        .att-perm-toggle {
          background: none;
          border: none;
          color: var(--color-primary);
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          padding: 4px 0;
          font-family: inherit;
          margin-top: 4px;
        }

        .att-perm-retry-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--gradient-primary);
          border: none;
          border-radius: var(--radius-lg);
          padding: 10px 18px;
          color: #fff;
          font-weight: 700;
          font-size: 0.82rem;
          cursor: pointer;
          flex-shrink: 0;
          font-family: inherit;
          transition: opacity 0.2s;
          white-space: nowrap;
        }
        .att-perm-retry-btn:hover { opacity: 0.9; }

        .att-perm-details {
          width: 100%;
          margin-top: 8px;
          padding-top: 12px;
          border-top: 1px solid rgba(220,38,38,0.15);
          font-size: 0.8rem;
        }

        /* ─── Main Grid ───────────────────────────────── */
        .att-grid {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 18px;
          align-items: start;
        }

        /* ─── Hero Card ───────────────────────────────── */
        .att-hero-card {
          background: linear-gradient(135deg, #2076C7, #1CADA3);
          border-radius: var(--radius-2xl);
          padding: clamp(28px, 6vw, 52px);
          color: #fff;
          position: relative;
          overflow: hidden;
          min-height: 340px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 0 20px 60px rgba(32,118,199,0.25), 0 8px 24px rgba(28,173,163,0.2);
        }

        .att-hero-glow {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }

        .att-hero-glow-1 {
          top: -80px; right: -60px;
          width: 300px; height: 300px;
          background: radial-gradient(circle, rgba(32,118,199,0.22) 0%, transparent 70%);
          filter: blur(40px);
        }

        .att-hero-glow-2 {
          bottom: -80px; left: -60px;
          width: 250px; height: 250px;
          background: radial-gradient(circle, rgba(28,173,163,0.2) 0%, transparent 70%);
          filter: blur(35px);
        }

        .att-hero-inner {
          position: relative;
          z-index: 1;
          text-align: center;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        /* ─── Timer ─────────────────────────────────── */
        .att-timer-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 32px;
        }

        .att-timer-label {
          font-size: 0.7rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: rgba(255,255,255,0.45);
          margin-bottom: 8px;
        }

        .att-timer-value {
          font-size: clamp(2.5rem, 9vw, 4.2rem);
          font-weight: 900;
          font-variant-numeric: tabular-nums;
          letter-spacing: -4px;
          line-height: 1;
          color: #fff;
        }

        .att-timer-value.att-overtime { color: #FCD34D; }

        .att-timer-foot {
          font-size: 0.78rem;
          color: rgba(255,255,255,0.35);
          margin-top: 6px;
        }

        /* ─── Idle / Done State ──────────────────────── */
        .att-state-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 32px;
        }

        .att-state-icon {
          width: 76px;
          height: 76px;
          border-radius: 22px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 18px;
        }

        .att-state-icon-done {
          background: rgba(16,185,129,0.15);
          border-color: rgba(16,185,129,0.3);
        }

        .att-state-section h2 {
          font-size: 1.4rem;
          font-weight: 800;
          margin-bottom: 12px;
          letter-spacing: 0.2rem;
          text-transform: uppercase;
        }

        .att-state-section p {
          color: rgba(255,255,255,0.45);
          max-width: 600px;
          font-size: 0.88rem;
          line-height: 1.8;
          letter-spacing: 0.08rem;
        }

        /* ─── Action Buttons ─────────────────────────── */
        .att-action-buttons {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          width: 100%;
        }

        .att-action-btn {
          padding: 16px 44px;
          border-radius: var(--radius-xl);
          border: none;
          font-size: 1.05rem;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          transition: all 0.25s;
          cursor: pointer;
          font-family: inherit;
          letter-spacing: -0.01em;
          min-width: 220px;
          justify-content: center;
        }

        .att-btn-checkin {
          background: #fff;
          color: #2076C7;
          box-shadow: 0 10px 28px rgba(0,0,0,0.12);
        }

        .att-btn-checkout {
          background: #1CADA3;
          color: #fff;
          box-shadow: 0 10px 28px rgba(28,173,163,0.3);
        }

        .att-btn-disabled {
          background: rgba(255,255,255,0.08) !important;
          box-shadow: none !important;
          opacity: 0.5;
          cursor: not-allowed;
        }

        .att-geo-hint {
          font-size: 0.78rem;
          color: rgba(255,255,255,0.45);
          margin-top: 4px;
          text-align: center;
          max-width: 280px;
        }

        /* ─── Side Panel ─────────────────────────────── */
        .att-side-panel {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .att-metrics-card, .att-zone-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          padding: 20px;
          box-shadow: var(--shadow-sm);
        }

        .att-metrics-list { display: flex; flex-direction: column; gap: 10px; }

        .att-metric-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .att-metric-label { font-size: 0.85rem; color: var(--color-text-secondary); font-weight: 500; }
        .att-metric-val   { font-weight: 800; font-size: 0.92rem; }

        .att-divider { height: 1px; background: var(--color-border); margin: 2px 0; }

        .att-late-badge {
          display: flex;
          align-items: center;
          gap: 7px;
          background: var(--color-warning-light);
          border-radius: var(--radius-md);
          padding: 8px 12px;
          border: 1px solid #FDE68A;
          margin-top: 4px;
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--color-warning);
        }

        /* History Card */
        .att-history-link { text-decoration: none; }

        .att-history-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          padding: 16px 18px;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: var(--shadow-sm);
        }

        .att-history-card:hover {
          border-color: var(--color-primary);
          box-shadow: var(--shadow-md);
        }

        .att-history-icon {
          width: 42px;
          height: 42px;
          border-radius: var(--radius-md);
          background: linear-gradient(135deg, #2076C7, #1CADA3);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .att-history-title {
          font-weight: 700;
          color: var(--color-text);
          font-size: 0.9rem;
        }

        .att-history-sub {
          font-size: 0.76rem;
          color: var(--color-text-tertiary);
          margin-top: 2px;
        }

        /* Zone Card */
        .att-zone-row { display: flex; align-items: center; gap: 10px; }

        .att-zone-dot {
          width: 36px; height: 36px;
          min-width: 36px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .att-zone-dot-ok  { background: var(--color-success-light); color: var(--color-success); }
        .att-zone-dot-err { background: var(--color-error-light);   color: var(--color-error);   }

        .att-zone-radius { font-weight: 700; font-size: 0.85rem; }
        .att-zone-dist   { font-size: 0.75rem; color: var(--color-text-tertiary); }

        /* ─── Report Modal ────────────────────────────── */
        .att-modal {
          position: relative;
          background: var(--color-surface);
          border-radius: var(--radius-2xl);
          width: calc(100% - 32px);
          max-width: 560px;
          max-height: 92dvh;
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow-2xl);
          overflow: hidden;
        }

        .att-modal-header {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 22px 24px;
          border-bottom: 1px solid var(--color-border);
        }

        .att-modal-header-icon {
          width: 38px; height: 38px;
          min-width: 38px;
          border-radius: var(--radius-md);
          background: linear-gradient(135deg, #2076C7, #1CADA3);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .att-modal-header h2 {
          font-size: 1.2rem;
          font-weight: 900;
          letter-spacing: -0.02em;
          color: var(--color-text);
        }

        .att-modal-header p {
          font-size: 0.82rem;
          color: var(--color-text-secondary);
          margin-top: 1px;
        }

        .att-modal-close { margin-left: auto; flex-shrink: 0; }

        .att-modal-body {
          padding: 20px 24px 24px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .att-participants-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 12px;
          border: 1.5px solid var(--color-border);
          border-radius: var(--radius-lg);
          background: var(--color-surface-alt);
        }

        .att-participant-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 7px 13px;
          border-radius: var(--radius-full);
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          border: 1.5px solid var(--color-border);
          background: var(--color-surface);
          color: var(--color-text-secondary);
          transition: all 0.2s;
          font-family: inherit;
        }

        .att-participant-chip:hover { border-color: var(--color-primary); color: var(--color-primary); }

        .att-chip-sel {
          background: var(--gradient-primary);
          color: #fff;
          border-color: transparent;
        }

        .att-chip-role { opacity: 0.65; font-size: 0.68rem; }

        .att-modal-actions {
          display: flex;
          gap: 12px;
          padding-top: 4px;
        }

        .att-modal-actions button { flex: 1; }

        /* ─── Face Modal ──────────────────────────────── */
        .att-face-modal {
          position: relative;
          background: var(--color-surface);
          border-radius: var(--radius-2xl);
          width: calc(100% - 32px);
          max-width: 380px;
          padding: 36px 28px 28px;
          text-align: center;
          box-shadow: var(--shadow-2xl);
          overflow: hidden;
        }

        .att-face-close { position: absolute; top: 16px; right: 16px; }

        .att-face-icon {
          width: 54px; height: 54px;
          border-radius: var(--radius-lg);
          background: linear-gradient(135deg, #2076C7, #1CADA3);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 14px;
          box-shadow: 0 8px 24px rgba(32,118,199,0.35);
        }

        .att-face-modal h2 {
          font-size: 1.25rem;
          font-weight: 900;
          letter-spacing: -0.02em;
          margin-bottom: 4px;
        }

        .att-face-modal p {
          color: var(--color-text-secondary);
          font-size: 0.85rem;
          margin-bottom: 20px;
        }

        .att-face-hint {
          font-size: 0.75rem !important;
          color: var(--color-text-tertiary) !important;
          margin-top: -8px !important;
          margin-bottom: 18px !important;
        }

        /* Camera ring */
        .att-camera-ring {
          position: relative;
          width: clamp(160px, 55vw, 210px);
          height: clamp(160px, 55vw, 210px);
          margin: 0 auto 16px;
          border-radius: 50%;
          overflow: hidden;
          border: 3px solid transparent;
          background: linear-gradient(var(--color-surface), var(--color-surface)) padding-box,
                      linear-gradient(135deg, #2076C7, #1CADA3) border-box;
          box-shadow: 0 0 0 6px rgba(32,118,199,0.1), var(--shadow-lg);
        }

        .att-camera-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scaleX(-1);
        }

        .att-scan-line {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(32,118,199,0) 0%, rgba(32,118,199,0.18) 48%, rgba(32,118,199,0) 100%);
          animation: att-scan 2.2s ease-in-out infinite;
        }

        /* Camera corner brackets */
        .att-cam-corner {
          position: absolute;
          width: 20px; height: 20px;
          border-color: rgba(255,255,255,0.7);
          border-style: solid;
        }

        .att-cam-tl { top: 8px;  left: 8px;  border-width: 2px 0 0 2px; border-radius: 3px 0 0 0; }
        .att-cam-tr { top: 8px;  right: 8px; border-width: 2px 2px 0 0; border-radius: 0 3px 0 0; }
        .att-cam-bl { bottom: 8px; left: 8px;  border-width: 0 0 2px 2px; border-radius: 0 0 0 3px; }
        .att-cam-br { bottom: 8px; right: 8px; border-width: 0 2px 2px 0; border-radius: 0 0 3px 0; }

        @keyframes att-scan {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }

        .att-face-actions { display: flex; gap: 10px; }
        .att-face-actions button { flex: 1; }

        /* ─── Responsive ──────────────────────────────── */
        @media (max-width: 900px) {
          .att-grid {
            grid-template-columns: 1fr;
          }

          .att-hero-card {
            min-height: 300px;
            padding: 28px 20px;
          }
        }

        @media (max-width: 640px) {
          .att-page { padding: 0 12px; }

          .att-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .att-action-btn {
            width: 100%;
            padding: 15px 20px;
          }

          .att-timer-value {
            font-size: 2.2rem;
            letter-spacing: -2px;
          }

          .att-modal, .att-face-modal {
            width: calc(100% - 16px);
            max-height: 95dvh;
            border-radius: var(--radius-xl);
          }

          .att-modal-header { padding: 18px 18px; }
          .att-modal-body   { padding: 16px 18px 18px; }

          .att-modal-actions {
            flex-direction: column-reverse;
          }

          .att-face-modal { padding: 30px 20px 22px; }
        }
      `}</style>
    </AppShell>
  );
};

export default AttendancePage;