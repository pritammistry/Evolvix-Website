import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;
axios.defaults.withCredentials = true;

// Belt-and-suspenders alongside the httpOnly session cookie: some browsers (notably Safari,
// due to cross-site cookie/tracking-prevention policies) won't reliably resend a Secure cookie
// on the very next cross-port request right after signup/login. An explicit Bearer header,
// held in memory only (not persisted), works regardless of cookie policy.
export function setVisitorAuthToken(token) {
  if (token) {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common["Authorization"];
  }
}

export const fetchIndianStates = () => axios.get(`${API}/meta/states`);
export const signupVisitor = (payload) => axios.post(`${API}/auth/signup`, payload);
export const loginVisitor = (payload) => axios.post(`${API}/auth/login`, payload);
export const verifyVisitorOtp = (payload) => axios.post(`${API}/auth/verify-email`, payload);
export const resendVisitorOtp = (payload) => axios.post(`${API}/auth/resend-otp`, payload);
export const logoutVisitor = () => axios.post(`${API}/auth/logout`);
export const fetchCurrentVisitor = () => axios.get(`${API}/auth/me`);
export const submitContact = (payload) => axios.post(`${API}/contact`, payload);
export const submitNewsletter = (payload) => axios.post(`${API}/newsletter`, payload);
export const createCheckout = (payload) => axios.post(`${API}/payments/checkout`, payload);
export const fetchPaymentStatus = (sessionId) => axios.get(`${API}/payments/status/${sessionId}`);
export const fetchPaymentDownloads = (sessionId) => axios.get(`${API}/payments/${sessionId}/downloads`);
export const paymentInvoiceUrl = (sessionId) => `${API}/payments/${sessionId}/invoice`;
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
export const fetchAdminLeadsContacts = () => axios.get(`${API}/admin/leads/contacts`);
export const exportAdminLeadsContacts = () => axios.get(`${API}/admin/leads/contacts/export`, { responseType: "blob" });
export const fetchAdminLeadsNewsletter = () => axios.get(`${API}/admin/leads/newsletter`);
export const exportAdminLeadsNewsletter = () => axios.get(`${API}/admin/leads/newsletter/export`, { responseType: "blob" });
export const fetchPlayground = () => axios.get(`${API}/playground`);
export const fetchAdminPlayground = () => axios.get(`${API}/admin/playground`);
export const createPlaygroundItem = (payload) => axios.post(`${API}/admin/playground`, payload);
export const updatePlaygroundItem = (id, payload) => axios.put(`${API}/admin/playground/${id}`, payload);
export const deletePlaygroundItem = (id) => axios.delete(`${API}/admin/playground/${id}`);
export const forgotPassword = (payload) => axios.post(`${API}/auth/forgot-password`, payload);
export const resetPassword = (payload) => axios.post(`${API}/auth/reset-password`, payload);
export const fetchVisitorOrders = () => axios.get(`${API}/visitor/orders`);