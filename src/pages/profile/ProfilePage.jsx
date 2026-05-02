import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import * as faceapi from 'face-api.js';
import {
  User, Mail, Phone, MapPin, Briefcase, Hash,
  Shield, Camera, Loader2, Save, KeyRound, Droplet,
  ChevronRight, AlertCircle, ShieldCheck, UserCheck,
  CheckCircle, Smartphone
} from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import { motion, AnimatePresence } from 'framer-motion';

const ProfilePage = () => {
  const { user, refreshProfile } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  // Forms
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [registeringFace, setRegisteringFace] = useState(false);
  const [showFaceModal, setShowFaceModal] = useState(false);

  const [form, setForm] = useState({
    mobileNumber: '',
    currentAddress: '',
    permanentAddress: '',
    bloodGroup: '',
    emergencyContactName: '',
    emergencyContactMobile: '',
  });

  const [passForm, setPassForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [avatarPreview, setAvatarPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    fetchProfile();
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchProfile = async () => {
    try {
      const { data } = await api.get('/auth/me');
      const emp = data.data;
      setProfile(emp);
      setForm({
        mobileNumber: emp.mobileNumber || '',
        currentAddress: emp.currentAddress || '',
        permanentAddress: emp.permanentAddress || '',
        bloodGroup: emp.bloodGroup || '',
        emergencyContactName: emp.emergencyContactName || '',
        emergencyContactMobile: emp.emergencyContactMobile || '',
      });
      setAvatarPreview(emp.profileImageUrl);
    } catch (err) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handlePassChange = (e) => setPassForm({ ...passForm, [e.target.name]: e.target.value });

  const handleAvatarSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      setSelectedFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const saveProfile = async () => {
    if (!form.mobileNumber) {
      toast.error('Mobile Number is required');
      return;
    }

    setSavingProfile(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (selectedFile) fd.append('profileImage', selectedFile);

      const { data } = await api.put('/auth/profile', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Profile updated successfully');
      setProfile({ ...profile, ...data.data });
      await refreshProfile();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setSavingPassword(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: passForm.currentPassword,
        newPassword: passForm.newPassword,
      });
      toast.success('Password changed successfully');
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  const videoRef = useRef();
  const [modelsLoaded, setModelsLoaded] = useState(false);

  const loadModels = async () => {
    try {
      const MODEL_URL = '/models';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);
      setModelsLoaded(true);
    } catch (err) {
      console.error("Error loading models", err);
      toast.error("Failed to load face recognition models");
    }
  };

  const startVideo = () => {
    navigator.mediaDevices.getUserMedia({ video: {} })
      .then(stream => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(err => toast.error("Webcam access denied"));
  };

  const stopVideo = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
  };

  const handleRegisterFace = async () => {
    if (!modelsLoaded) await loadModels();
    setShowFaceModal(true);
    setTimeout(startVideo, 100);
  };

  const captureFace = async () => {
    if (!videoRef.current) return;
    setRegisteringFace(true);

    try {
      const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        toast.error("No face detected. Please reposition yourself.");
        setRegisteringFace(false);
        return;
      }

      const descriptor = Array.from(detection.descriptor);
      await api.put('/employees/profile/face-descriptor', { faceDescriptor: descriptor });

      toast.success("Face ID registered successfully!");
      setShowFaceModal(false);
      stopVideo();
      await refreshProfile();
      fetchProfile();
    } catch (err) {
      toast.error(err.response?.data?.message || "Face registration failed");
    } finally {
      setRegisteringFace(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div style={{ padding: '100px 20px', textAlign: 'center' }}>
          <Loader2 size={42} className="spin" style={{ margin: '0 auto', color: 'var(--color-primary)' }} />
          <p style={{ marginTop: '16px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Syncing your profile...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="page-wrapper fade-in profile-page-container">

        {/* Header Section */}
        <div className="profile-header-area">
          <div>
            <h1 className="profile-main-title">My Profile</h1>
            <p className="profile-main-subtitle">Manage your personal information and security settings</p>
          </div>
        </div>

        <div className="profile-content-grid">

          {/* LEFT PANEL - Personal Identity & Quick Actions */}
          <div className="profile-left-panel">

            {/* 1. Identity Premium Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="premium-card profile-id-card"
            >
              <div className="profile-id-gradient" />

              <div className="profile-avatar-section">
                <div className="avatar-ring">
                  <img
                    src={avatarPreview || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name)}&background=2076C7&color=fff&size=200`}
                    alt="Profile"
                    className="main-avatar-img"
                  />
                  <label className="avatar-upload-btn">
                    <Camera size={18} />
                    <input type="file" hidden accept="image/*" onChange={handleAvatarSelect} />
                  </label>
                </div>

                <h2 className="profile-name-text">{profile?.name}</h2>
                <div className="profile-role-badge">
                  <UserCheck size={14} />
                  <span>{profile?.role}</span>
                </div>
              </div>

              <div className="profile-quick-stats">
                <div className="stat-row">
                  <div className="stat-icon-box"><Briefcase size={16} /></div>
                  <div className="stat-info">
                    <p className="stat-label">Position</p>
                    <p className="stat-value">{profile?.department || 'N/A'} &middot; {profile?.position || 'N/A'}</p>
                  </div>
                </div>
                <div className="stat-row">
                  <div className="stat-icon-box"><Mail size={16} /></div>
                  <div className="stat-info">
                    <p className="stat-label">Official Email</p>
                    <p className="stat-value">{profile?.email}</p>
                  </div>
                </div>
                <div className="stat-row">
                  <div className="stat-icon-box"><Hash size={16} /></div>
                  <div className="stat-info">
                    <p className="stat-label">Employee ID</p>
                    <p className="stat-value employee-code">{profile?.employeeCode}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 2. Security Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="premium-card security-card"
            >
              <div className="section-title-wrap">
                <div className="title-icon-box purple"><ShieldCheck size={18} /></div>
                <h3>Security & Access</h3>
              </div>

              <form onSubmit={savePassword} className="security-form">
                <div className="form-group-compact">
                  <label>Current Password</label>
                  <div className="input-with-icon">
                    <KeyRound size={16} className="field-icon" />
                    <input type="password" name="currentPassword" value={passForm.currentPassword} onChange={handlePassChange} required />
                  </div>
                </div>
                <div className="form-group-compact">
                  <label>New Password</label>
                  <div className="input-with-icon">
                    <KeyRound size={16} className="field-icon" />
                    <input type="password" name="newPassword" value={passForm.newPassword} onChange={handlePassChange} required minLength={6} />
                  </div>
                </div>
                <button type="submit" className="btn-primary full-width" disabled={savingPassword}>
                  {savingPassword ? <Loader2 size={18} className="spin" /> : 'Update Password'}
                </button>
              </form>
            </motion.div>






            {/* 3. Face ID Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="premium-card faceid-card"
            >
              <div className="section-title-wrap">
                <div className="title-icon-box blue"><Camera size={18} /></div>
                <h3>Face ID Verification</h3>
              </div>
              <p className="section-hint">
                {profile?.faceDescriptor?.length > 0
                  ? "Your biometric face profile is active and secured."
                  : "Register your face data to enable secure, touchless check-ins."}
              </p>


              {!profile?.faceDescriptor || profile.faceDescriptor.length === 0 ? (
                <button
                  onClick={handleRegisterFace}
                  className="btn-primary full-width"
                >
                  <Camera size={16} />
                  <span>Register Face ID</span>
                </button>
              ) : null}





              {/* <button 
                onClick={handleRegisterFace} 
                className={profile?.faceDescriptor?.length > 0 ? "btn-secondary full-width" : "btn-primary full-width"} 
              >
                {profile?.faceDescriptor?.length > 0 ? <ShieldCheck size={16} /> : <Camera size={16} />}
                <span>{profile?.faceDescriptor?.length > 0 ? "Update biometric data" : "Register Face ID"}</span>
              </button> */}
            </motion.div>



          </div>

          {/* RIGHT PANEL - Detailed Information */}
          <div className="profile-right-panel">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="premium-card info-card"
            >
              {/* Personal Info Header */}
              <div className="info-header-gradient">
                <div className="header-glass-content">
                  <div className="header-text">
                    <h3>Personal Information</h3>
                    <p>Contact details and essential employee data</p>
                  </div>
                  <User size={24} className="header-icon" />
                </div>
              </div>

              <div className="info-form-body">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="premium-label">Mobile Number</label>
                    <div className="input-with-icon">
                      <Phone size={18} className="field-icon" />
                      <input type="tel" name="mobileNumber" value={form.mobileNumber} onChange={handleProfileChange} maxLength={15} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="premium-label">Blood Group</label>
                    <div className="input-with-icon">
                      <Droplet size={18} className="field-icon" />
                      <select name="bloodGroup" value={form.bloodGroup} onChange={handleProfileChange}>
                        <option value="">Select Blood Group</option>
                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                      </select>
                      <ChevronRight size={16} className="select-arrow" />
                    </div>
                  </div>

                  <div className="form-group col-span-2">
                    <label className="premium-label">Current Residence</label>
                    <div className="input-with-icon align-top">
                      <MapPin size={18} className="field-icon" />
                      <textarea name="currentAddress" value={form.currentAddress} onChange={handleProfileChange} rows={3} placeholder="Full address..." />
                    </div>
                  </div>

                  <div className="form-group col-span-2">
                    <label className="premium-label">Permanent Residence</label>
                    <div className="input-with-icon align-top">
                      <MapPin size={18} className="field-icon" />
                      <textarea name="permanentAddress" value={form.permanentAddress} onChange={handleProfileChange} rows={3} placeholder="Permanent address as per records..." />
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="form-divider">
                  <div className="divider-line" />
                  <span>EMERGENCY CONTACT</span>
                  <div className="divider-line" />
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="premium-label">Contact Person Name</label>
                    <div className="input-with-icon">
                      <User size={18} className="field-icon" />
                      <input type="text" name="emergencyContactName" value={form.emergencyContactName} onChange={handleProfileChange} placeholder="Name" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="premium-label">Emergency Mobile No.</label>
                    <div className="input-with-icon">
                      <Smartphone size={18} className="field-icon" />
                      <input type="tel" name="emergencyContactMobile" value={form.emergencyContactMobile} onChange={handleProfileChange} placeholder="Mobile number" maxLength={15} />
                    </div>
                  </div>
                </div>

                <div className="profile-action-footer">
                  <button onClick={saveProfile} className="btn-save-profile" disabled={savingProfile}>
                    {savingProfile ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* BORDERLESS FACE ID MODAL */}
        <AnimatePresence>
          {showFaceModal && (
            <div className="profile-modal-overlay">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="face-registration-modal"
              >
                <h2>Register biometrics</h2>
                <p>Position your face within the frame</p>

                <div className="camera-container">
                  <video ref={videoRef} autoPlay muted playsInline />
                  <div className="camera-mask" />
                  <div className="camera-scanning-line" />
                </div>

                <div className="modal-actions">
                  <button className="btn-cancel" onClick={() => { setShowFaceModal(false); stopVideo(); }}>Cancel</button>
                  <button className="btn-capture" onClick={captureFace} disabled={registeringFace}>
                    {registeringFace ? <Loader2 size={20} className="spin" /> : "Capture Data"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>

      <style>{`
        .profile-page-container {
          max-width: 1300px;
          margin: 0 auto;
          padding: 0 16px;
        }

        .profile-header-area {
          margin-bottom: 28px;
          padding: 0 8px;
        }

        .profile-main-title {
          font-size: clamp(1.6rem, 4vw, 2.2rem);
          font-weight: 900;
          color: #111827;
          letter-spacing: -0.04em;
          margin-bottom: 4px;
        }

        .profile-main-subtitle {
          color: #64748B;
          font-size: 0.95rem;
          font-weight: 500;
        }

        .profile-content-grid {
          display: grid;
          grid-template-columns: 360px 1fr;
          gap: 24px;
          align-items: start;
        }

        .premium-card {
          background: #fff;
          border-radius: 24px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 4px 15px rgba(0,0,0,0.02);
          overflow: hidden;
          margin-bottom: 24px;
        }

        /* Identity Card */
        .profile-id-card {
          position: relative;
          text-align: center;
          padding: 32px 24px;
        }

        .profile-id-gradient {
          position: absolute;
          top: 0; left: 0; right: 0; height: 100px;
          background: var(--gradient-primary);
          opacity: 0.1;
        }

        .profile-avatar-section {
          position: relative;
          z-index: 1;
        }

        .avatar-ring {
          width: 140px; height: 140px;
          margin: 0 auto 20px;
          border-radius: 50%;
          padding: 6px;
          background: #fff;
          box-shadow: 0 10px 25px rgba(0,0,0,0.08);
          position: relative;
        }

        .main-avatar-img {
          width: 100%; height: 100%;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid #E2E8F0;
        }

        .avatar-upload-btn {
          position: absolute;
          bottom: 4px; right: 4px;
          width: 36px; height: 36px;
          background: var(--color-primary);
          color: #fff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border: 3px solid #fff;
          box-shadow: 0 4px 10px rgba(32, 118, 199, 0.4);
          transition: all 0.2s;
        }
        .avatar-upload-btn:hover { transform: scale(1.1); }

        .profile-name-text {
          font-size: 1.5rem;
          font-weight: 900;
          color: #111827;
          letter-spacing: -0.02em;
          margin-bottom: 8px;
        }

        .profile-role-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 16px;
          background: rgba(32, 118, 199, 0.08);
          color: var(--color-primary);
          border-radius: 99px;
          font-size: 0.8rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .profile-quick-stats {
          margin-top: 32px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          text-align: left;
          padding: 24px 0 0;
          border-top: 1px solid #F1F5F9;
        }

        .stat-row { display: flex; gap: 14px; align-items: flex-start; }
        .stat-icon-box {
          width: 34px; height: 34px;
          border-radius: 10px;
          background: #F8FAFC;
          display: flex; align-items: center; justify-content: center;
          color: #64748B;
          flex-shrink: 0;
        }
        .stat-label { font-size: 0.72rem; color: #94A3B8; font-weight: 700; text-transform: uppercase; margin-bottom: 2px; }
        .stat-value { font-size: 0.9rem; color: #334155; font-weight: 600; }
        .employee-code { font-family: 'JetBrains Mono', monospace; letter-spacing: 1px; color: var(--color-primary); }

        /* Titles & Common Components */
        .section-title-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
          padding: 24px 24px 0;
        }

        .section-title-wrap h3 { font-size: 1.15rem; font-weight: 800; color: #111827; margin: 0; }

        .title-icon-box {
          width: 40px; height: 40px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
        }
        .title-icon-box.purple { background: #FAF5FF; color: #8B5CF6; }
        .title-icon-box.blue   { background: #EFF6FF; color: #3B82F6; }

        .security-form, .faceid-card { padding: 0 24px 24px; }
        .section-hint { font-size: 0.85rem; color: #64748B; margin-bottom: 20px; line-height: 1.5; }

        .form-group-compact { margin-bottom: 16px; }
        .form-group-compact label { display: block; font-size: 0.8rem; font-weight: 700; color: #64748B; margin-bottom: 6px; }

        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-with-icon.align-top { align-items: flex-start; }
        .input-with-icon.align-top .field-icon { margin-top: 14px; }

        .field-icon {
          position: absolute;
          left: 14px;
          color: #94A3B8;
          z-index: 5;
        }

        .input-with-icon input, .input-with-icon select, .input-with-icon textarea {
          width: 100%;
          padding: 12px 14px 12px 42px;
          border: 1.5px solid #E2E8F0;
          border-radius: 12px;
          font-size: 0.92rem;
          color: #111827;
          background: #fff;
          transition: all 0.2s;
          font-family: inherit;
        }

        .input-with-icon input:focus, .input-with-icon select:focus, .input-with-icon textarea:focus {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 4px rgba(32, 118, 199, 0.08);
          outline: none;
        }

        .select-arrow { pointer-events: none; position: absolute; right: 14px; color: #94A3B8; }

        /* Right Panel Info Card */
        .info-header-gradient {
          background: var(--gradient-primary);
          padding: 32px;
          position: relative;
        }

        .header-glass-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #fff;
        }

        .header-text h3 { font-size: 1.4rem; font-weight: 900; margin-bottom: 4px; letter-spacing: -0.02em; }
        .header-text p  { font-size: 0.88rem; opacity: 0.85; font-weight: 500; }
        .header-icon   { opacity: 0.2; transform: scale(1.8); }

        .info-form-body { padding: 32px; }
        .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .col-span-2 { grid-column: span 2; }

        .premium-label {
          display: block;
          font-size: 0.82rem;
          font-weight: 800;
          color: #475569;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .form-divider {
          display: flex;
          align-items: center;
          gap: 16px;
          margin: 40px 0 32px;
          color: #94A3B8;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.15em;
        }
        .divider-line { flex: 1; height: 1px; background: #E2E8F0; }

        .profile-action-footer {
          margin-top: 40px;
          padding-top: 32px;
          border-top: 1px solid #F1F5F9;
          display: flex;
          justify-content: flex-end;
        }

        .btn-save-profile {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--gradient-primary);
          color: #fff;
          border: none;
          padding: 14px 42px;
          border-radius: 14px;
          font-size: 1rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 10px 25px rgba(32, 118, 199, 0.25);
        }

        .btn-save-profile:hover { transform: translateY(-3px); box-shadow: 0 15px 35px rgba(32, 118, 199, 0.35); }
        .btn-save-profile:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        /* Modal */
        .profile-modal-overlay {
          position: fixed; inset: 0; z-index: 10000;
          background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
        }

        .face-registration-modal {
          background: #fff;
          width: 100%; max-width: 440px;
          border-radius: 32px;
          padding: 40px;
          text-align: center;
          box-shadow: 0 40px 100px rgba(0,0,0,0.5);
        }

        .face-registration-modal h2 { font-size: 1.6rem; font-weight: 900; margin-bottom: 8px; }
        .face-registration-modal p  { color: #64748B; margin-bottom: 32px; font-weight: 500; }

        .camera-container {
          position: relative;
          width: 280px; height: 280px;
          margin: 0 auto 32px;
          border-radius: 50%;
          overflow: hidden;
          background: #000;
        }

        .camera-container video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
        .camera-mask { position: absolute; inset: 0; border: 10px solid #fff; border-radius: 50%; }
        .camera-scanning-line {
          position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: var(--color-primary);
          box-shadow: 0 0 15px var(--color-primary);
          animation: scan 2s linear infinite;
        }

        @keyframes scan {
          0% { top: 0; }
          100% { top: 100%; }
        }

        .modal-actions { display: flex; gap: 12px; }
        .modal-actions button { flex: 1; padding: 14px; border-radius: 14px; font-weight: 800; font-family: inherit; cursor: pointer; }
        .btn-cancel { background: #F1F5F9; border: none; color: #475569; }
        .btn-capture { background: var(--gradient-primary); border: none; color: #fff; }

        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }

        /* RESPONSIVE */
        @media (max-width: 1024px) {
          .profile-content-grid { grid-template-columns: 1fr; }
          .profile-right-panel { order: 2; }
          .profile-left-panel  { order: 1; }
          .profile-page-container { padding: 0 12px 40px; }
        }

        @media (max-width: 640px) {
          .form-grid-2 { grid-template-columns: 1fr; }
          .col-span-2 { grid-column: span 1; }
          .info-header-gradient { padding: 24px; }
          .info-form-body { padding: 20px; }
          .header-icon { display: none; }
          .profile-action-footer { flex-direction: column; }
          .btn-save-profile { width: 100%; justify-content: center; }
          .face-registration-modal { padding: 30px 20px; }
          .camera-container { width: 220px; height: 220px; }
        }
      `}</style>
    </AppShell>
  );
};

export default ProfilePage;
