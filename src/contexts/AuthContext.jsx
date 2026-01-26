/**
 * Authentication Context
 * 
 * Manages user authentication state across the application.
 * Handles login, logout, and user data persistence using localStorage.
 * 
 * Features:
 * - User authentication state management
 * - Session persistence across page reloads
 * - Role-based access (student, teacher, admin, alumni, librarian)
 * - User profile updates
 */

import React, { createContext, useState, useContext, useEffect } from 'react';
import { currentUser } from '../data/dummyData';

// Create authentication context
const AuthContext = createContext(null);

/**
 * Authentication Provider Component
 * Wraps the app to provide authentication functionality
 */
export const AuthProvider = ({ children }) => {
  // State management for authentication
  const [user, setUser] = useState(null); // Current logged-in user data
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Authentication status
  const [userType, setUserType] = useState('student'); // User role: 'student', 'teacher', 'admin', 'alumni', 'librarian'

  /**
   * Initialize authentication state from localStorage on mount
   * Restores user session if previously logged in
   */
  useEffect(() => {
    const storedUser = localStorage.getItem('nexus_user');
    const storedUserType = localStorage.getItem('nexus_user_type');
    
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
      setUserType(storedUserType || 'student');
    }
  }, []);

  /**
   * Login Function
   * Authenticates user and stores session data
   * 
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {string} type - User role (student/teacher/admin/alumni/librarian)
   * @returns {Object} - Success status and user data
   * 
   * Note: This is a mock implementation. In production, this would:
   * - Send credentials to backend API
   * - Receive JWT token
   * - Validate credentials
   */
  const login = (email, password, type = 'student') => {
    // Mock validation - accepts any non-empty credentials
    if (email && password) {
      // Create user object with role-specific data
      const userData = {
        ...currentUser,
        role: type,
      };
      
      // Update state
      setUser(userData);
      setIsAuthenticated(true);
      setUserType(type);
      
      // Persist session in localStorage
      localStorage.setItem('nexus_user', JSON.stringify(userData));
      localStorage.setItem('nexus_user_type', type);
      
      return { success: true, user: userData };
    }
    
    return { success: false, message: 'Invalid credentials' };
  };

  /**
   * Logout Function
   * Clears user session and removes stored data
   */
  const logout = () => {
    // Clear state
    setUser(null);
    setIsAuthenticated(false);
    setUserType('student');
    
    // Clear localStorage
    localStorage.removeItem('nexus_user');
    localStorage.removeItem('nexus_user_type');
  };

  /**
   * Update User Function
   * Updates user profile data in state and localStorage
   * 
   * @param {Object} updatedData - Partial user data to update
   */
  const updateUser = (updatedData) => {
    const updatedUser = { ...user, ...updatedData };
    setUser(updatedUser);
    localStorage.setItem('nexus_user', JSON.stringify(updatedUser));
  };

  // Provide authentication context to child components
  return (
    <AuthContext.Provider
      value={{
        user,              // Current user object
        isAuthenticated,   // Boolean: is user logged in?
        userType,          // User role/type
        login,             // Login function
        logout,            // Logout function
        updateUser,        // Update user profile function
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
