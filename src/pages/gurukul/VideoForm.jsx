// src/pages/gurukul/VideoForm.jsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { X, Loader2, Upload } from 'lucide-react';
import { createVideo, updateVideo }  from "../../api/gurukulApi";

const VideoForm = ({ video, onClose, onSuccess }) => {
  const [title, setTitle] = useState(video?.title || '');
  const [description, setDescription] = useState(video?.description || '');
  const [videoFile, setVideoFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return toast.error('Title is required');
    if (!video && !videoFile) return toast.error('Please select a video file');

    setLoading(true);
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    if (videoFile) formData.append('video', videoFile);

    try {
      if (video) {
        await updateVideo(video._id, formData);
        toast.success('Video updated');
      } else {
        await createVideo(formData);
        toast.success('Video uploaded');
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="modal-backdrop" onClick={onClose}>
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="card" style={{ maxWidth: '500px', width: '100%', padding: '32px' }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>{video ? 'Edit Video' : 'Upload New Video'}</h2>
            <button className="btn-icon" onClick={onClose}><X size={20} /></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label className="form-label">Title *</label>
              <input type="text" className="input-field" value={title} onChange={e => setTitle(e.target.value)} required />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label className="form-label">Description</label>
              <textarea className="input-field" rows={3} value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            {!video && (
              <div style={{ marginBottom: '24px' }}>
                <label className="form-label">Video File *</label>
                <div style={{ border: '2px dashed var(--color-border)', borderRadius: '16px', padding: '20px', textAlign: 'center', cursor: 'pointer' }} onClick={() => document.getElementById('videoInput').click()}>
                  <Upload size={32} color="var(--color-text-tertiary)" />
                  <p style={{ marginTop: '8px', fontSize: '0.9rem' }}>{videoFile ? videoFile.name : 'Click or drag to upload video'}</p>
                  <input id="videoInput" type="file" accept="video/*" style={{ display: 'none' }} onChange={e => setVideoFile(e.target.files[0])} />
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" size={18} /> : (video ? 'Save Changes' : 'Upload')}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default VideoForm;