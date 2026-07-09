import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { fetchCurrentVisitor, forgotPassword as forgotPasswordApi, loginVisitor, logoutVisitor, resendVisitorOtp, resetPassword as resetPasswordApi, setVisitorAuthToken, signupVisitor, verifyVisitorOtp } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrentVisitor()
      .then(({ data }) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // login/signup return either {status: "verification_required", email} or {token, user}
  const login = useCallback(async (email, password) => {
    const { data } = await loginVisitor({ email, password });
    if (data.status === "verification_required") return data;
    setVisitorAuthToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const signup = useCallback(async (email, password, name, state) => {
    const { data } = await signupVisitor({ email, password, name, state });
    if (data.status === "verification_required") return data;
    setVisitorAuthToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const verifyOtp = useCallback(async (email, otp) => {
    const { data } = await verifyVisitorOtp({ email, otp });
    setVisitorAuthToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const resendOtp = useCallback(async (email) => {
    const { data } = await resendVisitorOtp({ email });
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutVisitor();
    } finally {
      setVisitorAuthToken(null);
      setUser(null);
    }
  }, []);

  const forgotPassword = useCallback(async (email) => {
    const { data } = await forgotPasswordApi({ email });
    return data;
  }, []);

  const resetPassword = useCallback(async (email, otp, newPassword) => {
    const { data } = await resetPasswordApi({ email, otp, new_password: newPassword });
    setVisitorAuthToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, signup, verifyOtp, resendOtp, logout, forgotPassword, resetPassword }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
