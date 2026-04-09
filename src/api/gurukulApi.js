// src/pages/gurukul/gurukulApi.js
import api from './axios';

const BASE_URL = '/v1/gurukul';

export const fetchVideos = (page = 1, limit = 10, search = '') =>
  api.get(`${BASE_URL}/videos`, { params: { page, limit, search } });

export const fetchVideoById = (id) => api.get(`${BASE_URL}/videos/${id}`);

export const createVideo = (formData) =>
  api.post(`${BASE_URL}/videos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const updateVideo = (id, formData) =>
  api.put(`${BASE_URL}/videos/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const deleteVideo = (id) => api.delete(`${BASE_URL}/videos/${id}`);

// Sections
export const fetchSections = (videoId) => api.get(`${BASE_URL}/videos/${videoId}/sections`);
export const createSection = (videoId, data) => api.post(`${BASE_URL}/videos/${videoId}/sections`, data);
export const updateSection = (sectionId, data) => api.put(`${BASE_URL}/sections/${sectionId}`, data);
export const deleteSection = (sectionId) => api.delete(`${BASE_URL}/sections/${sectionId}`);

// Subsections
export const fetchSubsections = (sectionId) => api.get(`${BASE_URL}/sections/${sectionId}/subsections`);
export const createSubsection = (sectionId, data) => api.post(`${BASE_URL}/sections/${sectionId}/subsections`, data);
export const updateSubsection = (subsectionId, data) => api.put(`${BASE_URL}/subsections/${subsectionId}`, data);
export const deleteSubsection = (subsectionId) => api.delete(`${BASE_URL}/subsections/${subsectionId}`);