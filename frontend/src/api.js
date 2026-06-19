import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const submitContact = (payload) => axios.post(`${API}/contact`, payload);
export const submitNewsletter = (payload) => axios.post(`${API}/newsletter`, payload);
export const createCheckout = (payload) => axios.post(`${API}/payments/checkout`, payload);
export const fetchPaymentStatus = (sessionId) => axios.get(`${API}/payments/status/${sessionId}`);
export const fetchSiteContent = () => axios.get(`${API}/site-content`);