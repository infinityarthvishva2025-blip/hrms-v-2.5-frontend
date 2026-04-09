// src/pages/gurukul/VideoDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2, Edit2, Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchVideoById, deleteVideo }  from "../../api/gurukulApi";
import AppShell from '../../components/layout/AppShell';
import SectionManager from './SectionManager';
import VideoForm from './VideoForm';

const ADMIN_ROLES = ['SuperUser', 'HR', 'GM', 'VP', 'Director'];

const VideoDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = ADMIN_ROLES.includes(user?.role);

  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadVideo();
  }, [id]);

  const loadVideo = async () => {
    setLoading(true);
    try {
      const { data } = await fetchVideoById(id);
      setVideo(data.data);
    } catch (err) {
      toast.error('Video not found');
      navigate('/gurukul');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this video permanently? All sections will be lost.')) return;
    setDeleting(true);
    try {
      await deleteVideo(id);
      toast.success('Video deleted');
      navigate('/gurukul');
    } catch (err) {
      toast.error('Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-wrapper" style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
        <Loader2 className="animate-spin" size={48} />
      </div>
    );
  }

  if (!video) return null;

  return (

    <AppShell>
    <div className="page-wrapper">
      <button className="btn-secondary" onClick={() => navigate('/gurukul')} style={{ marginBottom: '24px' }}>
        <ArrowLeft size={16} /> Back to Library
      </button>

      {/* Video Player */}
      <div className="card" style={{ overflow: 'hidden', borderRadius: '32px', marginBottom: '32px' }}>
        <video src={video.cloudinaryUrl} controls style={{ width: '100%', maxHeight: '500px', background: '#000' }} poster={video.thumbnail} />
      </div>

      {/* Video Info + Admin Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>{video.title}</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '8px' }}>{video.description}</p>
          <div style={{ marginTop: '12px', fontSize: '0.8rem', color: 'var(--color-text-tertiary)' }}>
            Uploaded by {video.createdBy?.name} on {new Date(video.createdAt).toLocaleDateString()}
          </div>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn-secondary" onClick={() => setShowEditModal(true)}><Edit2 size={16} /> Edit Video</button>
            <button className="btn-danger" onClick={handleDelete} disabled={deleting}>{deleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />} Delete</button>
          </div>
        )}
      </div>

      {/* Sections & Subsections */}
      <SectionManager videoId={id} isAdmin={isAdmin} />

      {/* Edit Modal */}
      {showEditModal && <VideoForm video={video} onClose={() => setShowEditModal(false)} onSuccess={loadVideo} />}
    </div>

    </AppShell>
  );
};

export default VideoDetail;