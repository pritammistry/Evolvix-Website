import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const submitContact = (payload) => axios.post(`${API}/contact`, payload);
export const submitNewsletter = (payload) => axios.post(`${API}/newsletter`, payload);
export const createCheckout = (payload) => axios.post(`${API}/payments/checkout`, payload);
export const fetchPaymentStatus = (sessionId) => axios.get(`${API}/payments/status/${sessionId}`);
export const fetchPaymentDownloads = (sessionId) => axios.get(`${API}/payments/${sessionId}/downloads`);
export const fetchSiteContent = () => axios.get(`${API}/site-content`);
export const adminLogin = (payload) => axios.post(`${API}/admin/login`, payload);
export const fetchAdminDashboard = (token) => axios.get(`${API}/admin/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
export const saveAdminContent = (token, content) => axios.put(`${API}/admin/content`, { content }, { headers: { Authorization: `Bearer ${token}` } });
export const saveAdminList = (token, kind, items) => axios.put(`${API}/admin/${kind}`, { items }, { headers: { Authorization: `Bearer ${token}` } });
export const resetAdminContent = (token) => axios.post(`${API}/admin/reset`, {}, { headers: { Authorization: `Bearer ${token}` } });
export const uploadProductFile = (token, productId, payload) => axios.post(`${API}/admin/products/${productId}/files`, payload, { headers: { Authorization: `Bearer ${token}` } });
export const deleteProductFile = (token, productId, fileId) => axios.delete(`${API}/admin/products/${productId}/files/${fileId}`, { headers: { Authorization: `Bearer ${token}` } });
export const trackAnalyticsEvent = (payload) => axios.post(`${API}/analytics/events`, payload);
export const fetchAdminAnalytics = (token, params) => axios.get(`${API}/admin/analytics`, { params, headers: { Authorization: `Bearer ${token}` } });
export const fetchAdminAnalyticsOptions = (token) => axios.get(`${API}/admin/analytics/options`, { headers: { Authorization: `Bearer ${token}` } });