import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { connectSocket, disconnectSocket } from "../services/socket";
import { clearStoredAuth, getStoredAuth, setStoredAuth, updateStoredUser } from "../utils/authStorage";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const applyAuth = ({ user: nextUser, accessToken: nextAccess, refreshToken: nextRefresh }) => {
    setUser(nextUser || null);
    setAccessToken(nextAccess || null);
    setRefreshToken(nextRefresh || null);
    setStoredAuth({ user: nextUser, accessToken: nextAccess, refreshToken: nextRefresh });
    if (nextAccess) {
      connectSocket(nextAccess);
    }
  };

  const clearAuth = () => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    clearStoredAuth();
    disconnectSocket();
  };

  const fetchCurrentUser = async () => {
    setLoading(true);
    try {
      const response = await api.get("/auth/me");
      const currentUser = response.data?.user || null;
      setUser(currentUser);
      updateStoredUser(currentUser);
      return currentUser;
    } catch (error) {
      clearAuth();
      return null;
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload) => {
    const response = await api.post("/auth/register", payload);
    return response.data;
  };

  const login = async (payload) => {
    const response = await api.post("/auth/login", payload);
    const { user: responseUser, accessToken: token, refreshToken: refresh } = response.data || {};
    applyAuth({ user: responseUser, accessToken: token, refreshToken: refresh });
    return response.data;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      clearAuth();
    }
  };

  useEffect(() => {
    const stored = getStoredAuth();
    if (stored.accessToken) {
      setAccessToken(stored.accessToken);
      setRefreshToken(stored.refreshToken);
      setUser(stored.user || null);
      connectSocket(stored.accessToken);
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleLogout = () => clearAuth();
    window.addEventListener("auth:logout", handleLogout);
    return () => window.removeEventListener("auth:logout", handleLogout);
  }, []);

  useEffect(() => {
    if (accessToken && user) {
      connectSocket(accessToken);
    } else {
      disconnectSocket();
    }
  }, [accessToken, user?._id]);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: Boolean(user && accessToken),
      loading,
      login,
      register,
      logout,
      fetchCurrentUser
    }),
    [user, accessToken, refreshToken, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
