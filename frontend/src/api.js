import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;
axios.defaults.withCredentials = true;

export const submitContact = (payload) => axios.post(`${API}/contact`, payload);
export const submitNewsletter = (payload) => axios.post(`${API}/newsletter`, payload);
export const createCheckout = (payload) => axios.post(`${API}/payments/checkout`, payload);
export const fetchPaymentStatus = (sessionId) => axios.get(`${API}/payments/status/${sessionId}`);
export const fetchPaymentDownloads = (sessionId) => axios.get(`${API}/payments/${sessionId}/downloads`);
export const fetchSiteContent = () => axios.get(`${API}/site-content`);
export const adminLogin = (payload) => axios.post(`${API}/admin/login`, payload);
export const adminLogout = () => axios.post(`${API}/admin/logout`);
export const fetchAdminDashboard = () => axios.get(`${API}/admin/dashboard`);
export const saveAdminContent = (content) => axios.put(`${API}/admin/content`, { content });
export const saveAdminList = (kind, items) => axios.put(`${API}/admin/${kind}`, { items });
export const resetAdminContent = () => axios.post(`${API}/admin/reset`, {});
export const uploadProductFile = (productId, payload) => axios.post(`${API}/admin/products/${productId}/files`, payload);
export const deleteProductFile = (productId, fileId) => axios.delete(`${API}/admin/products/${productId}/files/${fileId}`);
export const trackAnalyticsEvent = (payload) => axios.post(`${API}/analytics/events`, payload);
export const fetchAdminAnalytics = (params) => axios.get(`${API}/admin/analytics`, { params });
export const fetchAdminAnalyticsOptions = () => axios.get(`${API}/admin/analytics/options`);
export const adminAnalyticsExportUrl = (params = {}) => `${API}/admin/analytics/export?${new URLSearchParams(params).toString()}`;
export const exportAdminAnalytics = (params) => axios.get(`${API}/admin/analytics/export`, { params, responseType: "blob" });