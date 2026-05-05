import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  Clock, MapPin, CheckCircle, LogOut, Loader2,
  AlertCircle, ChevronRight, Send, UserCircle, X,
  FileText, AlertTriangle, Users, Camera, Wifi, WifiOff,
  Shield, Zap, Info, ExternalLink, CameraOff, ArrowLeft,
  Fingerprint, Activity, TrendingUp, Star
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
    checking:         { color: '#2076C7', bg: 'rgba(32,118,199,0.12)', border: 'rgba(32,118,199,0.3)', Icon: Wifi,        text: 'Verifying location…' },
    valid:            { color: '#059669', bg: 'rgba(5,150,105,0.12)',  border: 'rgba(5,150,105,0.3)',  Icon: CheckCircle, text: `In zone · ${distance}m` },
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
      className="geo-status-pill"
      style={{ color: c.color, background: c.bg, border: `1px solid ${c.border}` }}
    >
      <CIcon size={12} />
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
      exit={{ opacity: 0, y: -10 }}
      className="att-permission-banner"
    >
      <div className="att-perm-left">
        <div className="att-perm-icon" style={{ background: 'linear-gradient(135deg, #DC2626, #B91C1C)' }}>
          <MapPin size={15} color="#fff" />
        </div>
        <div>
          <p className="att-perm-title">Location access required</p>
          <p className="att-perm-desc">Attendance requires your location to verify office zone.</p>
          <button onClick={() => setShowDetails(!showDetails)} className="att-perm-toggle">
            {showDetails ? 'Hide instructions ↑' : 'How to enable location →'}
          </button>
        </div>
      </div>
      <button onClick={onRetry} className="att-perm-retry-btn">
        <MapPin size={14} /> Retry
      </button>
      {showDetails && (
        <div className="att-perm-details">
          <p style={{ fontWeight: 700, marginBottom: '8px', color: 'var(--color-text)' }}>🔧 Enable location:</p>
          <ul style={{ margin: 0, paddingLeft: '16px', color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
            <li>Click the <strong>lock icon 🔒</strong> in address bar</li>
            <li>Set <strong>Location</strong> → <strong>Allow</strong></li>
            <li>Refresh or tap <strong>"Retry"</strong></li>
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
    exit={{ opacity: 0, y: -10 }}
    className="att-permission-banner att-perm-camera"
  >
    <div className="att-perm-left">
      <div className="att-perm-icon" style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}>
        <CameraOff size={15} color="#fff" />
      </div>
      <div>
        <p className="att-perm-title">Camera access blocked</p>
        <p className="att-perm-desc">Face verification needs camera. Enable it in browser settings.</p>
        <div style={{ marginTop: '6px', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
          <strong>Steps:</strong> Address bar → 🔒 Lock → Camera → Allow → Refresh
        </div>
      </div>
    </div>
    <button onClick={onClose} className="btn-icon">
      <X size={14} />
    </button>
  </motion.div>
);

/* ── Bypass user fixed coordinates ── */
const BYPASS_LAT = 18.534202;
const BYPASS_LNG = 73.839556;
const BYPASS_CODE = 'IA00117';

const AttendancePage = () => {
  const { user, refreshProfile } = useAuth();
  const isBypassUser = user?.employeeCode === BYPASS_CODE;

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
  const [modelsLoading, setModelsLoading]     = useState(false);
  const [faceOp, setFaceOp]                   = useState(null);
  const [cameraPermDenied, setCameraPermDenied] = useState(false);
  const [faceDetected, setFaceDetected]       = useState(false);
  const [faceConfidence, setFaceConfidence]   = useState(0);
  const [autoVerifyCountdown, setAutoVerifyCountdown] = useState(null);
  const [verifyStatus, setVerifyStatus]       = useState('idle'); // idle | scanning | detected | verifying | success | fail

  const [workMode, setWorkMode]               = useState('Office');
  const [trackingActive, setTrackingActive]   = useState(false);

  const navigate = useNavigate();
  const videoRef = useRef();
  const detectionIntervalRef = useRef(null);
  const autoVerifyTimerRef = useRef(null);
  const verifyLockRef = useRef(false);        // prevent double-invoke
  const faceOpRef = useRef(null);             // mirror of faceOp state — always fresh in closures
  const handleVerifyFaceFnRef = useRef(null); // always-fresh fn ref so stale intervals call latest ver

  /* ── Face Models ── */
  const loadModels = async () => {
    if (modelsLoaded) return true;
    if (modelsLoading) return false;
    setModelsLoading(true);
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
      ]);
      setModelsLoaded(true);
      setModelsLoading(false);
      return true;
    } catch (err) {
      toast.error('Failed to load face verification models');
      setModelsLoading(false);
      return false;
    }
  };

  /* ── Camera with permission fallback ── */
  const startVideo = async () => {
    try {
      if (navigator.permissions?.query) {
        try {
          const camPerm = await navigator.permissions.query({ name: 'camera' });
          if (camPerm.state === 'denied') {
            setCameraPermDenied(true);
            setShowFaceModal(false);
            toast.error('Camera blocked. Enable it in browser settings.');
            return;
          }
        } catch (_) {}
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          startFaceDetectionLoop();
        };
      }
      setCameraPermDenied(false);
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraPermDenied(true);
        setShowFaceModal(false);
        toast.error('Camera permission denied.');
      } else if (err.name === 'NotFoundError') {
        toast.error('No camera found on this device.');
        setShowFaceModal(false);
      } else {
        toast.error('Could not access camera. Please try again.');
      }
    }
  };

  const stopVideo = () => {
    stopFaceDetectionLoop();
    if (videoRef.current?.srcObject)
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
    setFaceDetected(false);
    setFaceConfidence(0);
    setAutoVerifyCountdown(null);
    setVerifyStatus('idle');
    verifyLockRef.current = false;
  };

  /* ── Continuous face detection loop ── */
  const startFaceDetectionLoop = () => {
    stopFaceDetectionLoop();
    setVerifyStatus('scanning');

    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });

    detectionIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || verifyLockRef.current) return;
      try {
        const detection = await faceapi
          .detectSingleFace(videoRef.current, options)
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection) {
          const score = detection.detection.score;
          setFaceConfidence(Math.round(score * 100));
          setFaceDetected(true);

          if (!verifyLockRef.current) {
            setVerifyStatus('detected');
            // Auto-trigger verification after face is stably detected
            if (!autoVerifyTimerRef.current) {
              setAutoVerifyCountdown(2);
              let count = 2;
              autoVerifyTimerRef.current = setInterval(() => {
                count -= 1;
                setAutoVerifyCountdown(count);
                if (count <= 0) {
                  clearInterval(autoVerifyTimerRef.current);
                  autoVerifyTimerRef.current = null;
                  setAutoVerifyCountdown(null);
                  handleVerifyFaceFnRef.current?.();
                }
              }, 1000);
            }
          }
        } else {
          setFaceDetected(false);
          setFaceConfidence(0);
          setVerifyStatus('scanning');
          // Cancel auto-verify if face lost
          if (autoVerifyTimerRef.current) {
            clearInterval(autoVerifyTimerRef.current);
            autoVerifyTimerRef.current = null;
            setAutoVerifyCountdown(null);
          }
        }
      } catch (_) {}
    }, 500);
  };

  const stopFaceDetectionLoop = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    if (autoVerifyTimerRef.current) {
      clearInterval(autoVerifyTimerRef.current);
      autoVerifyTimerRef.current = null;
    }
  };

  /* ── Face Verification ── */
  const handleVerifyFaceAndProceed = async () => {
    if (!videoRef.current || verifyLockRef.current) return;
    verifyLockRef.current = true;
    // ✅ DEFINITIVE FIX: read from faceOpRef — a mutable ref that is ALWAYS
    // updated synchronously (not async like setState). This is immune to:
    //   1. Stale closures (interval callbacks holding old function refs)
    //   2. React batching delays (setState is async, ref writes are sync)
    //   3. Re-render timing (ref reads are always current-cycle)
    const op = faceOpRef.current;
    stopFaceDetectionLoop();

    setVerifyingFace(true);
    setVerifyStatus('verifying');

    try {
      if (!user.faceDescriptor?.length) {
        toast.error('Face ID not registered. Visit your Profile to set it up.');
        setVerifyStatus('fail');
        verifyLockRef.current = false;
        setVerifyingFace(false);
        return;
      }

      const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.45 });
      const detection = await faceapi
        .detectSingleFace(videoRef.current, options)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        toast.error('No face detected. Reposition and try again.');
        setVerifyStatus('fail');
        verifyLockRef.current = false;
        setVerifyingFace(false);
        setTimeout(() => { startFaceDetectionLoop(); }, 1500);
        return;
      }

      const dist = faceapi.euclideanDistance(
        detection.descriptor,
        new Float32Array(user.faceDescriptor)
      );

      if (dist > 0.50) {
        toast.error('Face mismatch. Please try again.');
        setVerifyStatus('fail');
        verifyLockRef.current = false;
        setVerifyingFace(false);
        setTimeout(() => {
          setVerifyStatus('scanning');
          startFaceDetectionLoop();
        }, 2000);
        return;
      }

      setVerifyStatus('success');
      toast.success('Identity Verified ✓');
      await new Promise(r => setTimeout(r, 800));

      // ✅ Use local `op` — NOT the possibly-stale `faceOp` state
      setShowFaceModal(false);
      stopVideo();

      if (op === 'checkin') {
        await proceedWithCheckIn();
      } else if (op === 'checkout') {
        setShowReportModal(true);
      }
    } catch (err) {
      console.error('[FaceVerify] error:', err);
      toast.error('Face verification failed. Please try again.');
      setVerifyStatus('fail');
      verifyLockRef.current = false;
      setTimeout(() => {
        setVerifyStatus('scanning');
        startFaceDetectionLoop();
      }, 2000);
    } finally {
      setVerifyingFace(false);
    }
  };
  // ✅ Keep the fn-ref in sync on every render so interval closures always
  // dispatch to the latest version of handleVerifyFaceAndProceed.
  handleVerifyFaceFnRef.current = handleVerifyFaceAndProceed;

  /* ── Cleanup on unmount ── */
  useEffect(() => {
    return () => { stopFaceDetectionLoop(); };
  }, []);

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

  /* ── Optimized geolocation — low accuracy first, then high ── */
  const fetchGeo = useCallback(async (office) => {
    if (!office || !navigator.geolocation) { setGeoStatus('error'); return; }
    setGeoStatus('checking');

    if (navigator.permissions?.query) {
      try {
        const perm = await navigator.permissions.query({ name: 'geolocation' });
        if (perm.state === 'denied') {
          setGeoStatus('permission_denied');
          setCoords(null);
          return;
        }
        perm.onchange = () => {
          if (perm.state === 'granted') fetchGeo(office);
          else if (perm.state === 'denied') { setGeoStatus('permission_denied'); setCoords(null); }
        };
      } catch (_) {}
    }

    const calcAndSet = ({ latitude, longitude }) => {
      setCoords({ latitude, longitude });
      const R = 6371000, tr = v => (v * Math.PI) / 180;
      const dLat = tr(latitude - office.lat), dLng = tr(longitude - office.lng);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(tr(office.lat)) * Math.cos(tr(latitude)) * Math.sin(dLng / 2) ** 2;
      const d = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
      setGeoDistance(d);
      setGeoStatus(d <= office.radius ? 'valid' : 'invalid');
    };

    const onError = (err) => {
      if (err.code === 1) {
        setGeoStatus('permission_denied');
        toast.error('Location permission denied.', { id: 'geo-denied' });
      } else if (err.code === 2) {
        setGeoStatus('error');
        toast.error('Location unavailable. Check your GPS.', { id: 'geo-unavail' });
      } else {
        setGeoStatus('error');
        toast.error('Location timed out. Tap refresh.', { id: 'geo-timeout' });
      }
      setCoords(null);
    };

    // Try cached/low-accuracy first for instant result, then refine
    navigator.geolocation.getCurrentPosition(
      ({ coords: c }) => calcAndSet(c),
      onError,
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 30000 },
    );

    // Follow up with high-accuracy fix
    setTimeout(() => {
      navigator.geolocation.getCurrentPosition(
        ({ coords: c }) => calcAndSet(c),
        () => {}, // silent fail on high-accuracy followup
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    }, 150);

  }, []);

  const fetchToday = useCallback(async () => {
    try {
      const { data } = await api.get('/attendance/today');
      setTodayRecord(data.data.record);
      if (data.data.office) {
        setOfficeSettings(data.data.office);
        if (!isBypassUser) fetchGeo(data.data.office);
      }
    } catch (err) {
      console.error('[fetchToday] failed:', err);
      // Don't show a toast for background refreshes — only on first load
    } finally {
      setLoading(false);
    }
  }, [fetchGeo, isBypassUser]);

  const fetchManagement = useCallback(async () => {
    try {
      const { data } = await api.get('/employees/management');
      setManagementEmployees(data.data);
    } catch (_) {}
  }, []);

  useEffect(() => { fetchToday(); fetchManagement(); }, [fetchToday, fetchManagement]);

  const handleCheckIn = async () => {
    const needsGeo = workMode === 'Office' && !isBypassUser;
    if (!coords && needsGeo) {
      toast.error('Location not available. Please allow location access.');
      if (geoStatus === 'permission_denied') fetchGeo(officeSettings);
      return;
    }
    if (geoStatus === 'invalid' && needsGeo) { toast.error(`Out of Zone: ${geoDistance}m away.`); return; }
    if (!user.faceDescriptor?.length) { toast.error('Register Face ID from Profile first!'); return; }
    const ok = await loadModels();
    if (!ok) return;
    // ✅ Write ref FIRST (sync), then setState (async) — ref is what matters
    faceOpRef.current = 'checkin';
    setFaceOp('checkin');
    setVerifyStatus('idle');
    setShowFaceModal(true);
    setTimeout(startVideo, 200);
  };

  const proceedWithCheckIn = async () => {
    setActionLoading(true);
    try {
      // ✅ FIX: bypass user always gets fixed office coordinates
      const latitude  = isBypassUser ? BYPASS_LAT : (coords?.latitude  ?? null);
      const longitude = isBypassUser ? BYPASS_LNG : (coords?.longitude ?? null);
      await api.post('/attendance/check-in', { latitude, longitude, workMode });
      toast.success('Checked In Successfully! 🎉');
      await fetchToday();
    } catch (err) {
      const msg = err.response?.data?.message || 'Check-in failed. Please try again.';
      toast.error(msg);
      // Reset lock so user can retry without page reload
      verifyLockRef.current = false;
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOutSubmit = async () => {
    if (!reportData.todayWork.trim()) {
      toast.error("Please describe today's work before checking out.");
      return;
    }
    setActionLoading(true);
    try {
      // ✅ FIX: bypass user always gets fixed office coordinates
      const latitude  = isBypassUser ? BYPASS_LAT : (coords?.latitude  ?? null);
      const longitude = isBypassUser ? BYPASS_LNG : (coords?.longitude ?? null);
      const { data } = await api.post('/attendance/check-out', {
        latitude,
        longitude,
        ...reportData,
      });
      const { overtimeMinutes, shortfallMinutes } = data.data;
      if (overtimeMinutes > 0)       toast.success(`Checked out! Overtime: ${overtimeMinutes}m 🚀`);
      else if (shortfallMinutes > 0) toast(`Checked out ${shortfallMinutes}m early`, { icon: '⚠️' });
      else                           toast.success('Checked Out Successfully! 👋');
      setShowReportModal(false);
      await fetchToday();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-out failed. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleParticipant = (id) =>
    setReportData(p => ({
      ...p,
      reportParticipants: p.reportParticipants.includes(id)
        ? p.reportParticipants.filter(x => x !== id)
        : [...p.reportParticipants, id],
    }));

  const isCheckedIn     = !!todayRecord?.inTime;
  const isCheckedOut    = !!todayRecord?.outTime;
  const currentWorkMode = todayRecord?.workMode || workMode;

  const fmtT = useCallback(
    (s) => s ? new Date(s).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—',
    []
  );

  // ✅ useMemo prevents recomputing on every keystroke / animation frame
  const canAct = useMemo(() => {
    if (actionLoading) return false;
    if (isBypassUser)  return true;
    if (currentWorkMode !== 'Office') return true;
    return geoStatus === 'valid' && !!coords;
  }, [actionLoading, isBypassUser, currentWorkMode, geoStatus, coords]);

  /* ── Periodic tracking for Field mode ── */
  useEffect(() => {
    let intervalId;
    if (isCheckedIn && !isCheckedOut && todayRecord?.workMode === 'Field') {
      setTrackingActive(true);
      const track = async () => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(async ({ coords: c }) => {
          try {
            await api.post('/attendance/track', {
              latitude: c.latitude,
              longitude: c.longitude
            });
          } catch (err) {
            console.error('Tracking failed', err);
          }
        }, (err) => {
          console.error('Geolocation error during tracking', err);
        }, { enableHighAccuracy: true });
      };
      
      // Track immediately on start, then every 30 mins
      track();
      intervalId = setInterval(track, 10 * 60 * 1000);
    } else {
      setTrackingActive(false);
    }
    return () => clearInterval(intervalId);
  }, [isCheckedIn, isCheckedOut, todayRecord?.workMode]);

  /* ── Face modal ring color by status ── */
  const ringColor = {
    idle: '#94A3B8',
    scanning: '#2076C7',
    detected: '#F59E0B',
    verifying: '#8B5CF6',
    success: '#059669',
    fail: '#DC2626',
  }[verifyStatus];

  const verifyStatusText = {
    idle: 'Initializing camera…',
    scanning: 'Scanning for face…',
    detected: autoVerifyCountdown ? `Verifying in ${autoVerifyCountdown}s…` : 'Face detected!',
    verifying: 'Verifying identity…',
    success: 'Identity confirmed ✓',
    fail: 'Verification failed',
  }[verifyStatus];

  return (
    <AppShell>
      <div className="page-wrapper fade-in att-page">

        {/* ── Page Header ── */}
        <div className="att-header">
          <div className="att-header-left">
            <button
              onClick={() => navigate('/dashboard')}
              className="att-back-btn"
              title="Back to Dashboard"
            >
              <ArrowLeft size={17} />
            </button>
            <div>
              <div className="att-header-eyebrow">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              <h1 className="att-title">Attendance</h1>
            </div>
          </div>
          <div className="att-header-right">
            {isBypassUser ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="att-bypass-badge"
              >
                <Zap size={12} /> Remote Access
              </motion.div>
            ) : (
              <GeoStatus status={geoStatus} distance={geoDistance} />
            )}
            <button
              className="att-refresh-btn"
              onClick={() => fetchGeo(officeSettings)}
              title="Refresh Location"
            >
              <MapPin size={14} />
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
          {trackingActive && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="att-tracking-banner"
            >
              <div className="att-tracking-dot" />
              <span>Location tracking active (Field Mode). <strong>Keep this tab active</strong> for reliable tracking.</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Main Grid ── */}
        <div className="att-grid">

          {/* ── Hero Action Card ── */}
          <div className="att-hero-card">
            <div className="att-hero-mesh" />
            <div className="att-hero-orb att-orb-1" />
            <div className="att-hero-orb att-orb-2" />

            <div className="att-hero-inner">
              {loading ? (
                <div className="att-hero-loading">
                  <Loader2 size={36} className="animate-spin" style={{ color: 'rgba(255,255,255,0.5)' }} />
                  <span>Loading your attendance…</span>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  {isCheckedIn && !isCheckedOut && (
                    <motion.div
                      key="timer"
                      initial={{ scale: 0.85, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="att-timer-section"
                    >
                      <div className="att-timer-ring">
                        <div className="att-timer-ring-pulse" />
                      </div>
                      <div className="att-timer-badge">
                        {isOvertime ? '⏱ Overtime Running' : 'Shift Time Remaining'}
                      </div>
                      <div className={`att-timer-value ${isOvertime ? 'att-overtime' : ''}`}>
                        {isOvertime && <span className="att-overtime-plus">+</span>}
                        {formatDuration(remainingMs)}
                      </div>
                      <p className="att-timer-foot">
                        <Clock size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                        Clocked in at {fmtT(todayRecord?.inTime)}
                      </p>
                      <div className="att-progress-track">
                        <div
                          className="att-progress-fill"
                          style={{
                            width: (() => {
                              if (!todayRecord?.inTime) return '0%';
                              const inMs = new Date(todayRecord.inTime).getTime();
                              const shiftHrs = new Date(todayRecord.inTime).getDay() === 6 ? 7 : 8.5;
                              const pct = ((Date.now() - inMs) / (shiftHrs * 3600000)) * 100;
                              return `${Math.min(100, Math.max(0, pct)).toFixed(1)}%`;
                            })()
                          }}
                        />
                      </div>
                    </motion.div>
                  )}

                  {!isCheckedIn && (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="att-state-section"
                    >
                      <div className="att-icon-pulse-wrapper">
                        <div className="att-icon-pulse-ring" />
                        <div className="att-icon-pulse-ring att-ring-2" />
                        <div className="att-state-icon">
                          <Fingerprint size={32} />
                        </div>
                      </div>
                      <h2 className="att-state-heading">Ready to Begin?</h2>
                      <p className="att-state-sub">Ensure you're within the office zone, then check in securely with face verification.</p>
                    </motion.div>
                  )}

                  {isCheckedOut && (
                    <motion.div
                      key="done"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="att-state-section"
                    >
                      <div className="att-icon-pulse-wrapper att-done-wrapper">
                        <div className="att-state-icon att-state-done">
                          <CheckCircle size={32} />
                        </div>
                      </div>
                      <h2 className="att-state-heading">Day Complete! 🎉</h2>
                      <p className="att-state-sub">Great work today! Your attendance has been securely recorded.</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}

              {!loading && (
                <div className="att-action-buttons">
                  {!isCheckedIn && (
                    <div className="work-mode-selector">
                      {['Office', 'Field', 'WFH'].map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setWorkMode(mode)}
                          className={`work-mode-btn ${workMode === mode ? 'active' : ''}`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  )}
                  {!isCheckedIn && (
                    <motion.button
                      whileHover={{ scale: canAct ? 1.04 : 1 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleCheckIn}
                      disabled={!canAct}
                      className={`att-action-btn att-btn-checkin ${!canAct ? 'att-btn-disabled' : ''}`}
                    >
                      {actionLoading ? <Loader2 size={20} className="animate-spin" /> : <Shield size={20} />}
                      <span>Secure Check In</span>
                    </motion.button>
                  )}

                  {isCheckedIn && !isCheckedOut && (
                    <motion.button
                      whileHover={{ scale: canAct ? 1.04 : 1 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={async () => {
                        if (!coords && !isBypassUser) { toast.error('Location unavailable'); return; }
                        if (geoStatus === 'invalid' && !isBypassUser) { toast.error('Out of zone!'); return; }
                        if (!user.faceDescriptor?.length) { toast.error('Face ID not registered!'); return; }
                        const ok = await loadModels();
                        if (!ok) return;
                        // ✅ Write ref FIRST (sync), then setState (async)
                        faceOpRef.current = 'checkout';
                        setFaceOp('checkout');
                        setVerifyStatus('idle');
                        setShowFaceModal(true);
                        setTimeout(startVideo, 200);
                      }}
                      disabled={!canAct}
                      className={`att-action-btn att-btn-checkout ${!canAct ? 'att-btn-disabled' : ''}`}
                    >
                      {actionLoading ? <Loader2 size={20} className="animate-spin" /> : <LogOut size={20} />}
                      <span>Check Out</span>
                    </motion.button>
                  )}

                  {!canAct && !actionLoading && !loading && !isCheckedOut && (
                    <motion.p
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="att-geo-hint"
                    >
                      {geoStatus === 'checking' && '📡 Verifying your location…'}
                      {geoStatus === 'invalid' && `📍 You are ${geoDistance}m from office (out of range)`}
                      {geoStatus === 'permission_denied' && '🔒 Location blocked — see banner above'}
                      {geoStatus === 'error' && '⚠️ GPS unavailable — tap refresh'}
                    </motion.p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Side Panel ── */}
          <div className="att-side-panel">

            {/* Today's Metrics Card */}
            <div className="att-metrics-card">
              <p className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Activity size={12} /> Today's Metrics
              </p>
              <div className="att-metrics-list">
                <div className="att-metric-row">
                  <span className="att-metric-label">Check In</span>
                  <span className="att-metric-val att-val-success">
                    {loading ? <span className="att-skeleton" style={{ width: 60 }} /> : fmtT(todayRecord?.inTime)}
                  </span>
                </div>
                <div className="att-divider" />
                <div className="att-metric-row">
                  <span className="att-metric-label">Check Out</span>
                  <span className="att-metric-val" style={{ color: isCheckedOut ? 'var(--color-primary)' : 'var(--color-text-tertiary)' }}>
                    {loading ? <span className="att-skeleton" style={{ width: 60 }} /> : isCheckedOut ? fmtT(todayRecord?.outTime) : 'Pending'}
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
                    <AlertCircle size={13} />
                    <span>Late by {todayRecord.lateMinutes} min</span>
                  </div>
                )}
              </div>
            </div>

            {/* History Link */}
            <motion.a href="/attendance/summary" whileHover={{ y: -2 }} className="att-history-link">
              <div className="att-history-card">
                <div className="att-history-icon">
                  <FileText size={18} color="#fff" />
                </div>
                <div>
                  <p className="att-history-title">Attendance History</p>
                  <p className="att-history-sub">View monthly logs & reports</p>
                </div>
                <ChevronRight size={15} className="att-history-arrow" />
              </div>
            </motion.a>

            {/* Zone Info */}
            {officeSettings && (
              <div className="att-zone-card">
                <p className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={12} /> Office Zone
                </p>
                <div className="att-zone-row">
                  <div className={`att-zone-dot ${geoStatus === 'valid' ? 'att-zone-ok' : 'att-zone-err'}`}>
                    <MapPin size={14} />
                  </div>
                  <div>
                    <p className="att-zone-radius">Radius: {officeSettings.radius}m</p>
                    <p className="att-zone-dist">You are {geoDistance}m away</p>
                  </div>
                  <div className="att-zone-pulse-wrapper">
                    {geoStatus === 'valid' && <div className="att-zone-pulse" />}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Tips */}
            <div className="att-tips-card">
              <p className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Star size={12} /> Quick Tips
              </p>
              <ul className="att-tips-list">
                <li><Shield size={12} /> Face ID auto-verifies when detected</li>
                <li><MapPin size={12} /> Stay within {officeSettings?.radius || 500}m of office</li>
                <li><FileText size={12} /> Submit full EOD report on check-out</li>
              </ul>
            </div>

          </div>
        </div>

        {/* ══════════════════════════════════════
            CHECKOUT REPORT MODAL
        ══════════════════════════════════════ */}
        <AnimatePresence>
          {showReportModal && (
            <div
              className="att-modal-backdrop"
              onClick={(e) => { if (e.target === e.currentTarget) setShowReportModal(false); }}
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0, y: 24 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: 24 }}
                transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                className="att-modal"
              >
                <div className="att-modal-header">
                  <div className="att-modal-header-icon">
                    <Send size={15} color="#fff" />
                  </div>
                  <div>
                    <h2>Check-out Report</h2>
                    <p>Complete your daily EOD before leaving</p>
                  </div>
                  <button className="btn-icon att-modal-close" onClick={() => setShowReportModal(false)}>
                    <X size={16} />
                  </button>
                </div>

                <div className="att-modal-body">
                  {[
                    { key: 'todayWork',   label: "Today's Completed Work *", icon: CheckCircle, placeholder: 'What specific tasks did you complete today?', rows: 3 },
                    { key: 'pendingWork', label: 'Pending / Carry-over Tasks',  icon: Clock,        placeholder: 'Any tasks to carry forward to tomorrow?',   rows: 2 },
                    { key: 'issuesFaced', label: 'Blockers / Issues Faced',     icon: AlertTriangle, placeholder: 'Any blockers, challenges, or escalations?', rows: 2 },
                  ].map(({ key, label, icon: LIcon, placeholder, rows }) => (
                    <div key={key} className="form-group">
                      <label className="form-label"><LIcon size={12} /> {label}</label>
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
                      <label className="form-label"><Users size={12} /> Share Report With</label>
                      <div className="att-participants-grid">
                        {managementEmployees.map(emp => {
                          const sel = reportData.reportParticipants.includes(emp._id);
                          return (
                            <button
                              key={emp._id}
                              onClick={() => toggleParticipant(emp._id)}
                              className={`att-participant-chip ${sel ? 'att-chip-sel' : ''}`}
                            >
                              <UserCircle size={12} />
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
                      {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                      Submit & Check Out
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
            <div
              className="att-modal-backdrop"
              onClick={(e) => { if (e.target === e.currentTarget) { setShowFaceModal(false); stopVideo(); } }}
            >
              <motion.div
                initial={{ scale: 0.88, opacity: 0, y: 28 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.88, opacity: 0, y: 24 }}
                transition={{ type: 'spring', damping: 28, stiffness: 380 }}
                className="att-face-modal"
              >
                {/* Close */}
                <button
                  className="att-face-close"
                  onClick={() => { setShowFaceModal(false); stopVideo(); }}
                >
                  <X size={16} />
                </button>

                {/* Header */}
                <div className="att-face-header">
                  <div className="att-face-icon" style={{ background: `linear-gradient(135deg, ${ringColor}, ${ringColor}88)` }}>
                    <Shield size={22} color="#fff" />
                  </div>
                  <h2 className="att-face-title">Identity Verification</h2>
                  <p className="att-face-subtitle">
                    {faceOp === 'checkin' ? 'Secure Check In' : 'Secure Check Out'}
                  </p>
                </div>

                {/* Camera */}
                <div
                  className="att-camera-ring"
                  style={{ borderColor: ringColor, boxShadow: `0 0 0 6px ${ringColor}1F, 0 10px 15px -3px rgba(0,0,0,0.08)` }}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="att-camera-video"
                  />
                  {/* Scan animation */}
                  {(verifyStatus === 'scanning' || verifyStatus === 'detected') && (
                    <div className="att-scan-line" style={{ background: `linear-gradient(180deg, transparent 0%, ${ringColor}44 48%, transparent 100%)` }} />
                  )}
                  {/* Corner brackets */}
                  <div className="att-cam-corner att-cam-tl" style={{ borderColor: ringColor }} />
                  <div className="att-cam-corner att-cam-tr" style={{ borderColor: ringColor }} />
                  <div className="att-cam-corner att-cam-bl" style={{ borderColor: ringColor }} />
                  <div className="att-cam-corner att-cam-br" style={{ borderColor: ringColor }} />

                  {/* Success overlay */}
                  {verifyStatus === 'success' && (
                    <div className="att-success-overlay">
                      <CheckCircle size={52} color="#059669" />
                    </div>
                  )}
                  {/* Fail overlay */}
                  {verifyStatus === 'fail' && (
                    <div className="att-fail-overlay">
                      <AlertCircle size={52} color="#DC2626" />
                    </div>
                  )}
                </div>

                {/* Status indicator */}
                <div className="att-verify-status-row">
                  <div
                    className="att-verify-dot"
                    style={{ background: ringColor, boxShadow: `0 0 8px ${ringColor}66` }}
                  >
                    {verifyingFace && <Loader2 size={10} className="animate-spin" style={{ color: '#fff' }} />}
                  </div>
                  <span className="att-verify-status-text" style={{ color: ringColor }}>
                    {verifyStatusText}
                  </span>
                </div>

                {/* Confidence bar */}
                {faceConfidence > 0 && verifyStatus !== 'success' && verifyStatus !== 'fail' && (
                  <div className="att-confidence-bar-wrap">
                    <div className="att-confidence-bar">
                      <div
                        className="att-confidence-fill"
                        style={{ width: `${faceConfidence}%`, background: faceConfidence > 70 ? '#059669' : faceConfidence > 40 ? '#F59E0B' : '#DC2626' }}
                      />
                    </div>
                    <span className="att-confidence-label">{faceConfidence}% confidence</span>
                  </div>
                )}

                {/* Manual verify fallback */}
                <div className="att-face-footer">
                  {verifyStatus !== 'success' && (
                    <>
                      <p className="att-face-hint">
                        {verifyStatus === 'scanning' ? 'Position your face clearly in the frame' : ''}
                        {verifyStatus === 'detected' ? `Auto-verifying in ${autoVerifyCountdown ?? '…'}s` : ''}
                        {verifyStatus === 'verifying' ? 'Comparing with registered face ID…' : ''}
                        {verifyStatus === 'fail' ? 'Scanning will restart automatically' : ''}
                        {verifyStatus === 'idle' ? 'Starting camera…' : ''}
                      </p>
                      <div className="att-face-actions">
                        <button
                          className="btn-secondary"
                          onClick={() => { setShowFaceModal(false); stopVideo(); }}
                        >
                          Cancel
                        </button>
                        {(verifyStatus === 'detected' || verifyStatus === 'scanning') && (
                          <button
                            className="btn-primary"
                            onClick={handleVerifyFaceAndProceed}
                            disabled={verifyingFace}
                          >
                            {verifyingFace ? <Loader2 size={16} className="animate-spin" /> : <Fingerprint size={16} />}
                            Verify Now
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>

      <style>{`
        /* ─────────────────────────────────────────────────
           ATTENDANCE PAGE — PREMIUM REDESIGN
        ───────────────────────────────────────────────── */

        .att-page {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 20px 40px;
        }

        /* ─── Modal Backdrop (Fixed + Centered) ── */
        .att-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.72);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        /* ─── Header ── */
        .att-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 28px;
          padding: 6px 0;
        }

        .att-header-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .att-back-btn {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-md);
          background: var(--color-surface);
          border: 1.5px solid var(--color-border);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--color-primary);
          transition: all var(--transition-fast);
          box-shadow: var(--shadow-sm);
          flex-shrink: 0;
        }

        .att-back-btn:hover {
          background: var(--color-primary-light);
          border-color: var(--color-primary);
          transform: translateX(-2px);
        }

        .att-header-eyebrow {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--color-text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 4px;
        }

        .att-title {
          font-size: clamp(1.65rem, 4vw, 2.2rem);
          font-weight: 900;
          letter-spacing: -0.05em;
          color: var(--color-text);
          line-height: 1;
        }

        .att-header-right {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }

        .geo-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 700;
          white-space: nowrap;
        }

        .att-bypass-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(139,92,246,0.12);
          color: #8B5CF6;
          padding: 7px 14px;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 700;
          border: 1px solid rgba(139,92,246,0.3);
          white-space: nowrap;
        }

        .att-refresh-btn {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-md);
          background: var(--color-surface);
          border: 1.5px solid var(--color-border);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--color-text-secondary);
          transition: all var(--transition-fast);
        }

        .att-refresh-btn:hover {
          background: var(--color-primary-light);
          color: var(--color-primary);
          border-color: var(--color-primary);
        }

        /* ─── Permission Banners ── */
        .att-permission-banner {
          display: flex;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 12px;
          background: rgba(220,38,38,0.06);
          border: 1px solid rgba(220,38,38,0.2);
          border-radius: var(--radius-xl);
          padding: 16px 18px;
          margin-bottom: 20px;
        }

        .att-perm-camera {
          background: rgba(139,92,246,0.06);
          border-color: rgba(139,92,246,0.2);
        }

        .att-perm-left {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          flex: 1;
          min-width: 200px;
        }

        .att-perm-icon {
          width: 32px;
          height: 32px;
          min-width: 32px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .att-perm-title { font-weight: 800; font-size: 0.88rem; margin-bottom: 2px; color: var(--color-text); }
        .att-perm-desc  { font-size: 0.78rem; color: var(--color-text-secondary); line-height: 1.5; }

        .att-perm-toggle {
          background: none;
          border: none;
          color: var(--color-primary);
          font-size: 0.73rem;
          font-weight: 700;
          cursor: pointer;
          padding: 3px 0;
          font-family: inherit;
          margin-top: 4px;
        }

        .att-perm-retry-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: var(--gradient-primary);
          border: none;
          border-radius: var(--radius-lg);
          padding: 9px 16px;
          color: #fff;
          font-weight: 700;
          font-size: 0.8rem;
          cursor: pointer;
          flex-shrink: 0;
          font-family: inherit;
          transition: opacity 0.2s;
          white-space: nowrap;
        }

        .att-perm-retry-btn:hover { opacity: 0.88; }

        .att-perm-details {
          width: 100%;
          padding-top: 12px;
          border-top: 1px solid rgba(220,38,38,0.12);
          font-size: 0.78rem;
          margin-top: 4px;
        }

        /* ─── Main Grid ── */
        .att-grid {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 20px;
          align-items: start;
        }

        /* ─── Hero Card ── */
        .att-hero-card {
          background-size: 200% 200%;
          background-image: linear-gradient(-45deg, #0F1E3C, #183e7a, #0D4A48, #0F1E3C);
          animation: smoothGradient 10s ease infinite;
          border-radius: var(--radius-2xl);
          padding: clamp(32px, 6vw, 56px) clamp(24px, 5vw, 48px);
          color: #fff;
          position: relative;
          overflow: hidden;
          min-height: 360px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow:
            0 24px 64px rgba(15,30,60,0.35),
            0 8px 24px rgba(28,173,163,0.15),
            inset 0 1px 0 rgba(255,255,255,0.06);
        }

        @keyframes smoothGradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .att-hero-mesh {
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(circle at 20% 80%, rgba(32,118,199,0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(28,173,163,0.12) 0%, transparent 50%);
          pointer-events: none;
        }

        .att-hero-orb {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(60px);
        }

        .att-orb-1 {
          top: -60px; right: -40px;
          width: 280px; height: 280px;
          background: radial-gradient(circle, rgba(32,118,199,0.25) 0%, transparent 70%);
        }

        .att-orb-2 {
          bottom: -80px; left: -40px;
          width: 240px; height: 240px;
          background: radial-gradient(circle, rgba(28,173,163,0.2) 0%, transparent 70%);
        }

        .att-hero-inner {
          position: relative;
          z-index: 1;
          text-align: center;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
        }

        .att-hero-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          color: rgba(255,255,255,0.4);
          font-size: 0.85rem;
          font-weight: 500;
        }

        /* ─── Timer Section ── */
        .att-timer-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
          margin-bottom: 32px;
          width: 100%;
        }

        .att-timer-ring {
          position: relative;
          width: 12px;
          height: 12px;
          margin-bottom: 16px;
        }

        .att-timer-ring-pulse {
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          background: rgba(5,150,105,0.4);
          animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }

        .att-timer-badge {
          font-size: 0.65rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          color: rgba(255,255,255,0.4);
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          padding: 5px 14px;
          border-radius: var(--radius-full);
          margin-bottom: 12px;
        }

        .att-timer-value {
          font-size: clamp(2.8rem, 10vw, 4.5rem);
          font-weight: 900;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.06em;
          line-height: 1;
          color: #fff;
          margin-bottom: 10px;
          text-shadow: 0 4px 24px rgba(0,0,0,0.2);
        }

        .att-overtime { color: #FCD34D; text-shadow: 0 0 32px rgba(252,211,77,0.4); }
        .att-overtime-plus { color: inherit; opacity: 0.7; }

        .att-timer-foot {
          font-size: 0.78rem;
          color: rgba(255,255,255,0.35);
          margin-bottom: 20px;
        }

        .att-progress-track {
          width: 160px;
          height: 4px;
          background: rgba(255,255,255,0.1);
          border-radius: 99px;
          overflow: hidden;
        }

        .att-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #2076C7, #1CADA3);
          border-radius: 99px;
          transition: width 1s linear;
        }

        /* ─── Idle / Done States ── */
        .att-state-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 32px;
        }

        .att-icon-pulse-wrapper {
          position: relative;
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }

        .att-icon-pulse-ring {
          position: absolute;
          inset: -12px;
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.1);
          animation: att-ring-pulse 2.4s ease-in-out infinite;
        }

        .att-ring-2 {
          inset: -24px;
          border-color: rgba(255,255,255,0.05);
          animation-delay: 0.6s;
        }

        @keyframes att-ring-pulse {
          0%,100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 0.15; transform: scale(1.08); }
        }

        .att-state-icon {
          width: 72px;
          height: 72px;
          border-radius: 22px;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 1;
          backdrop-filter: blur(4px);
        }

        .att-done-wrapper .att-state-icon,
        .att-state-done {
          background: rgba(5,150,105,0.15);
          border-color: rgba(5,150,105,0.35);
        }

        .att-state-heading {
          font-size: clamp(1.2rem, 4vw, 1.5rem);
          font-weight: 800;
          margin-bottom: 10px;
          letter-spacing: -0.03em;
        }

        .att-state-sub {
          color: rgba(255,255,255,0.4);
          max-width: 380px;
          font-size: 0.85rem;
          line-height: 1.7;
        }

        /* ─── Action Buttons ── */
        .att-action-buttons {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          width: 100%;
        }

        .att-action-btn {
          padding: 16px 40px;
          border-radius: var(--radius-xl);
          border: none;
          font-size: 1rem;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
          cursor: pointer;
          font-family: inherit;
          letter-spacing: -0.02em;
          width: 100%;
          max-width: 340px;
          justify-content: center;
          position: relative;
          overflow: hidden;
          touch-action: manipulation;
          min-height: 54px;
        }

        .att-action-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 100%);
          pointer-events: none;
        }

        .att-btn-checkin {
          background: #fff;
          color: #0F1E3C;
          box-shadow: 0 12px 32px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.1);
        }

        .att-btn-checkin:hover:not(:disabled) {
          box-shadow: 0 16px 40px rgba(0,0,0,0.22), 0 4px 12px rgba(0,0,0,0.1);
          transform: translateY(-2px);
        }

        .att-btn-checkout {
          background: linear-gradient(135deg, #1CADA3, #059669);
          color: #fff;
          box-shadow: 0 12px 32px rgba(28,173,163,0.4);
        }

        .att-btn-checkout:hover:not(:disabled) {
          box-shadow: 0 16px 40px rgba(28,173,163,0.5);
          transform: translateY(-2px);
        }

        .att-btn-disabled {
          background: rgba(255,255,255,0.08) !important;
          box-shadow: none !important;
          opacity: 0.45;
          cursor: not-allowed;
          transform: none !important;
        }

        .att-geo-hint {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.35);
          margin-top: 2px;
          text-align: center;
          max-width: 280px;
          line-height: 1.5;
        }

        /* ─── Side Panel ── */
        .att-side-panel {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .att-metrics-card,
        .att-zone-card,
        .att-tips-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          padding: 20px;
          box-shadow: var(--shadow-sm);
          transition: box-shadow var(--transition-fast);
        }

        .att-metrics-card:hover,
        .att-zone-card:hover { box-shadow: var(--shadow-md); }

        .att-metrics-list { display: flex; flex-direction: column; gap: 10px; }

        .att-metric-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .att-metric-label { font-size: 0.82rem; color: var(--color-text-secondary); font-weight: 500; }
        .att-metric-val   { font-weight: 800; font-size: 0.9rem; color: var(--color-text); }
        .att-val-success  { color: var(--color-success); }

        .att-skeleton {
          display: inline-block;
          height: 14px;
          border-radius: 4px;
          background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
          background-size: 200% 100%;
          animation: skeleton-loading 1.5s infinite;
        }

        .att-divider { height: 1px; background: var(--color-border); }

        .att-late-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #FFFBEB;
          border-radius: var(--radius-md);
          padding: 7px 11px;
          border: 1px solid #FDE68A;
          margin-top: 4px;
          font-size: 0.78rem;
          font-weight: 700;
          color: #B45309;
        }

        /* History Card */
        .att-history-link { text-decoration: none; display: block; }

        .att-history-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          padding: 16px 18px;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: all var(--transition-fast);
          box-shadow: var(--shadow-sm);
        }

        .att-history-card:hover {
          border-color: var(--color-primary);
          box-shadow: var(--shadow-md);
          transform: translateY(-2px);
        }

        .att-history-icon {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-md);
          background: var(--gradient-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .att-history-title { font-weight: 700; color: var(--color-text); font-size: 0.88rem; }
        .att-history-sub   { font-size: 0.73rem; color: var(--color-text-tertiary); margin-top: 2px; }
        .att-history-arrow { margin-left: auto; color: var(--color-text-tertiary); flex-shrink: 0; }

        /* Zone Card */
        .att-zone-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .att-zone-dot {
          width: 36px; height: 36px;
          min-width: 36px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .att-zone-ok  { background: var(--color-success-light); color: var(--color-success); }
        .att-zone-err { background: var(--color-error-light);   color: var(--color-error);   }
        .att-zone-radius { font-weight: 700; font-size: 0.83rem; }
        .att-zone-dist   { font-size: 0.72rem; color: var(--color-text-tertiary); margin-top: 2px; }

        .att-zone-pulse-wrapper { margin-left: auto; }

        .att-zone-pulse {
          width: 10px; height: 10px;
          border-radius: 50%;
          background: var(--color-success);
          animation: att-pulse-dot 2s ease-in-out infinite;
        }

        @keyframes att-pulse-dot {
          0%,100% { opacity: 1; transform: scale(1); box-shadow: 0 0 0 0 rgba(5,150,105,0.4); }
          50%      { opacity: 0.7; transform: scale(1.2); box-shadow: 0 0 0 6px rgba(5,150,105,0); }
        }

        /* Tips Card */
        .att-tips-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin: 0;
          padding: 0;
        }

        .att-tips-list li {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.77rem;
          color: var(--color-text-secondary);
          font-weight: 500;
          line-height: 1.4;
        }

        .att-tips-list li svg { color: var(--color-primary); flex-shrink: 0; }

        /* ─── Report Modal ── */
        .att-modal {
          position: relative;
          background: var(--color-surface);
          border-radius: var(--radius-2xl);
          width: 100%;
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
          background: var(--color-surface);
        }

        .att-modal-header-icon {
          width: 36px; height: 36px;
          min-width: 36px;
          border-radius: var(--radius-md);
          background: var(--gradient-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .att-modal-header h2 {
          font-size: 1.12rem;
          font-weight: 900;
          letter-spacing: -0.03em;
          color: var(--color-text);
        }

        .att-modal-header p {
          font-size: 0.78rem;
          color: var(--color-text-secondary);
          margin-top: 1px;
        }

        .att-modal-close { margin-left: auto; flex-shrink: 0; }

        .att-modal-body {
          padding: 20px 24px 24px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .att-participants-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          padding: 12px;
          border: 1.5px solid var(--color-border);
          border-radius: var(--radius-lg);
          background: var(--color-surface-alt);
        }

        .att-participant-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 12px;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          border: 1.5px solid var(--color-border);
          background: var(--color-surface);
          color: var(--color-text-secondary);
          transition: all var(--transition-fast);
          font-family: inherit;
        }

        .att-participant-chip:hover { border-color: var(--color-primary); color: var(--color-primary); }
        .att-chip-sel { background: var(--gradient-primary); color: #fff; border-color: transparent; }
        .att-chip-role { opacity: 0.6; font-size: 0.65rem; }

        .att-modal-actions {
          display: flex;
          gap: 10px;
          padding-top: 4px;
        }

        .att-modal-actions button { flex: 1; }

        /* ─── Face Modal ── */
        /* ─── Face Modal ─── */
        .att-face-modal {
          position: relative;
          background: var(--color-surface);
          border-radius: var(--radius-2xl);
          width: 100%;
          max-width: 420px;
          padding: 28px 28px 24px;
          text-align: center;
          box-shadow:
            0 32px 80px rgba(0,0,0,0.22),
            0 8px 24px rgba(0,0,0,0.08),
            inset 0 1px 0 rgba(255,255,255,0.8);
          /* ✅ FIX: prevent overflow and ensure it can scroll on very small screens */
          max-height: 95dvh;
          overflow-y: auto;
          margin: auto;
          overscroll-behavior: contain;
        }

        .att-face-close {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 32px;
          height: 32px;
          border-radius: var(--radius-md);
          background: var(--color-surface-alt);
          border: 1px solid var(--color-border);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--color-text-secondary);
          transition: all var(--transition-fast);
        }

        .att-face-close:hover {
          background: var(--color-error-light);
          color: var(--color-error);
          border-color: var(--color-error);
        }

        .att-face-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 20px;
        }

        .att-face-icon {
          width: 52px;
          height: 52px;
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 12px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
          transition: background 0.4s ease;
        }

        .att-face-title {
          font-size: 1.15rem;
          font-weight: 900;
          letter-spacing: -0.03em;
          color: var(--color-text);
          margin-bottom: 3px;
        }

        .att-face-subtitle {
          color: var(--color-text-secondary);
          font-size: 0.8rem;
          font-weight: 600;
        }

        /* Camera ring */
        .att-camera-ring {
          position: relative;
          width: clamp(160px, 45vw, 220px);
          height: clamp(160px, 45vw, 220px);
          margin: 0 auto 16px;
          border-radius: 50%;
          overflow: hidden;
          border: 3px solid var(--ring-color, #94A3B8);
          box-shadow:
            0 0 0 6px color-mix(in srgb, var(--ring-color, #94A3B8) 12%, transparent),
            0 12px 24px rgba(0,0,0,0.12);
          transition: border-color 0.35s ease, box-shadow 0.35s ease;
          background: #000;
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
          animation: att-scan 2s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes att-scan {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }

        /* Camera corner brackets */
        .att-cam-corner {
          position: absolute;
          width: 22px;
          height: 22px;
          border-style: solid;
          transition: border-color 0.3s ease;
        }

        .att-cam-tl { top: 8px;    left: 8px;    border-width: 2px 0 0 2px; border-radius: 3px 0 0 0; }
        .att-cam-tr { top: 8px;    right: 8px;   border-width: 2px 2px 0 0; border-radius: 0 3px 0 0; }
        .att-cam-bl { bottom: 8px; left: 8px;    border-width: 0 0 2px 2px; border-radius: 0 0 0 3px; }
        .att-cam-br { bottom: 8px; right: 8px;   border-width: 0 2px 2px 0; border-radius: 0 0 3px 0; }

        /* Success / Fail overlays */
        .att-success-overlay,
        .att-fail-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }

        .att-success-overlay {
          background: rgba(5,150,105,0.75);
          animation: att-overlay-in 0.35s ease;
        }

        .att-fail-overlay {
          background: rgba(220,38,38,0.7);
          animation: att-overlay-in 0.35s ease;
        }

        @keyframes att-overlay-in {
          from { opacity: 0; transform: scale(0.8); }
          to   { opacity: 1; transform: scale(1); }
        }

        /* Status row */
        .att-verify-status-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .att-verify-dot {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background 0.3s ease;
        }

        .att-verify-status-text {
          font-size: 0.82rem;
          font-weight: 700;
          transition: color 0.3s ease;
        }

        /* Confidence bar */
        .att-confidence-bar-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
          padding: 0 4px;
        }

        .att-confidence-bar {
          flex: 1;
          height: 5px;
          background: var(--color-border);
          border-radius: 99px;
          overflow: hidden;
        }

        .att-confidence-fill {
          height: 100%;
          border-radius: 99px;
          transition: width 0.3s ease, background 0.3s ease;
        }

        .att-confidence-label {
          font-size: 0.68rem;
          font-weight: 700;
          color: var(--color-text-tertiary);
          white-space: nowrap;
        }

        /* Face footer */
        .att-face-footer { width: 100%; }

        .att-face-hint {
          font-size: 0.75rem;
          color: var(--color-text-tertiary);
          margin-bottom: 14px;
          min-height: 20px;
        }

        .att-face-actions {
          display: flex;
          gap: 10px;
          width: 100%;
        }

        .att-face-actions button { flex: 1; }

        /* ─── Responsive ── */
        /* ─── Responsive ─── */
        @media (max-width: 900px) {
          .att-grid {
            grid-template-columns: 1fr;
          }

          .att-side-panel {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }

          .att-side-panel > .att-history-link {
            grid-column: span 2;
          }

          .att-hero-card {
            min-height: 300px;
          }
        }

        @media (max-width: 640px) {
          .att-page { padding: 0 12px 32px; }

          .att-header {
            flex-direction: row;
            align-items: center;
            gap: 8px;
            margin-bottom: 20px;
          }

          .att-title { font-size: 1.4rem; }

          .att-action-btn {
            max-width: 100%;
            padding: 15px 24px;
          }

          .att-timer-value {
            font-size: 2.4rem;
            letter-spacing: -0.04em;
          }

          .att-modal,
          .att-face-modal {
            max-height: 95dvh;
            border-radius: var(--radius-xl);
          }

          .att-modal { max-width: 100%; }
          .att-face-modal {
            max-width: 100%;
            padding: 22px 18px 20px;
          }

          .att-modal-header { padding: 18px; }
          .att-modal-body   { padding: 16px 18px 20px; }

          .att-modal-actions { flex-direction: column-reverse; }

          .att-side-panel {
            grid-template-columns: 1fr;
          }

          .att-side-panel > .att-history-link {
            grid-column: span 1;
          }

          /* ✅ Modal always centered on mobile — even with keyboard open */
          .att-modal-backdrop {
            padding: 12px;
            align-items: center;
            justify-content: center;
          }

          .work-mode-btn {
            min-height: 44px; /* WCAG touch target */
            font-size: 0.8rem;
          }

          .att-camera-ring {
            width: clamp(150px, 60vw, 220px);
            height: clamp(150px, 60vw, 220px);
          }
        }

        @media (max-width: 380px) {
          .att-header-eyebrow { display: none; }
          .att-bypass-badge span:last-child { display: none; }
          .att-action-btn { font-size: 0.9rem; }
        }
      `}</style>
    </AppShell>
  );
};

export default AttendancePage;