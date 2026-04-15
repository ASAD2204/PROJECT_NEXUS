/**
 * Authentication Context
 * 
 * Manages user authentication state across the application.
 * Handles login, logout, and user data persistence using localStorage + real backend API.
 * 
 * Features:
 * - Real backend authentication via POST /auth/login
 * - JWT token storage and auto-refresh
 * - Session persistence across page reloads via GET /auth/me
 * - Role-based access (student, teacher/faculty, admin, alumni, librarian)
 * - User profile updates via PUT /auth/profile
 */

import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../api/auth';

// Create authentication context
const AuthContext = createContext(null);

/**
 * Map backend role names to frontend role names
 * Backend uses: student, faculty, admin, alumni, librarian, hod
 * Frontend uses: student, teacher, admin, alumni, librarian
 */
const mapRole = (backendRole) => {
  const roleMap = { faculty: 'teacher', hod: 'teacher' };
  return roleMap[backendRole] || backendRole;
};

/**
 * Authentication Provider Component
 * Wraps the app to provide authentication functionality
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userType, setUserType] = useState('student');
  const [loading, setLoading] = useState(true); // true while restoring session

  /**
   * Initialize: restore session from stored JWT token on mount
   */
  useEffect(() => {
    const token = localStorage.getItem('nexus_token');
    if (token) {
      authAPI.getMe()
        .then((res) => {
          const u = res.data;
          const role = mapRole(u.role);
          const userData = {
            id: u.user_id,
            user_id: u.user_id,
            email: u.email,
            name: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email,
            first_name: u.first_name,
            last_name: u.last_name,
            phone: u.phone,
            is_active: u.is_active,
            role,
          };
          setUser(userData);
          setIsAuthenticated(true);
          setUserType(role);
          localStorage.setItem('nexus_user', JSON.stringify(userData));
          localStorage.setItem('nexus_user_type', role);
        })
        .catch(() => {
          // Token expired or invalid — clear everything
          localStorage.removeItem('nexus_token');
          localStorage.removeItem('nexus_user');
          localStorage.removeItem('nexus_user_type');
        })
        .finally(() => setLoading(false));
    } else {
      // No token — check for legacy stored user (fallback)
      const storedUser = localStorage.getItem('nexus_user');
      const storedUserType = localStorage.getItem('nexus_user_type');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
        setUserType(storedUserType || 'student');
      }
      setLoading(false);
    }
  }, []);

  /**
   * Login Function — calls POST /auth/login
   * 
   * @param {string} email
   * @param {string} password
   * @param {string} type - unused now (role determined by backend)
   * @returns {Promise<Object>} { success, user?, message? }
   */
  const login = async (email, password, type = 'student') => {
    try {
      const res = await authAPI.login(email, password);
      const { access_token, role: backendRole } = res.data;

      // Store JWT
      localStorage.setItem('nexus_token', access_token);

      // Fetch full profile
      const meRes = await authAPI.getMe();
      const u = meRes.data;
      const role = mapRole(backendRole);

      const userData = {
        id: u.user_id,
        user_id: u.user_id,
        email: u.email,
        name: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email,
        first_name: u.first_name,
        last_name: u.last_name,
        phone: u.phone,
        is_active: u.is_active,
        role,
      };

      setUser(userData);
      setIsAuthenticated(true);
      setUserType(role);
      localStorage.setItem('nexus_user', JSON.stringify(userData));
      localStorage.setItem('nexus_user_type', role);

      return { success: true, user: userData };
    } catch (err) {
      const msg = err.response?.data?.detail || 'Invalid email or password';
      return { success: false, message: msg };
    }
  };

  /**
   * Logout Function — calls POST /auth/logout then clears local state
   */
  const logout = async () => {
    try { await authAPI.logout(); } catch { /* ignore */ }
    setUser(null);
    setIsAuthenticated(false);
    setUserType('student');
    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_user');
    localStorage.removeItem('nexus_user_type');
  };

  /**
   * Update User Function — calls PUT /auth/profile then updates local state
   */
  const updateUser = async (updatedData) => {
    try {
      await authAPI.updateProfile(updatedData);
      const meRes = await authAPI.getMe();
      const u = meRes.data;
      const role = mapRole(u.role);
      const userData = {
        id: u.user_id,
        user_id: u.user_id,
        email: u.email,
        name: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email,
        first_name: u.first_name,
        last_name: u.last_name,
        phone: u.phone,
        is_active: u.is_active,
        role,
      };
      setUser(userData);
      localStorage.setItem('nexus_user', JSON.stringify(userData));
    } catch {
      // Optimistic fallback — update local only
      const updatedUser = { ...user, ...updatedData };
      setUser(updatedUser);
      localStorage.setItem('nexus_user', JSON.stringify(updatedUser));
    }
  };

  // Provide authentication context to child components
  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        userType,
        loading,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom Hook: useAuth
 * Provides easy access to authentication context
 * 
 * Usage: const { user, login, logout } = useAuth();
 * 
 * @throws {Error} if used outside AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;
