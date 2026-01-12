import React, { createContext, useState, useContext, useEffect } from 'react';
import { currentUser } from '../data/dummyData';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userType, setUserType] = useState('student'); // 'student', 'teacher', or 'admin'

  // Check if user is already logged in (from localStorage)
  useEffect(() => {
    const storedUser = localStorage.getItem('nexus_user');
    const storedUserType = localStorage.getItem('nexus_user_type');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
      setUserType(storedUserType || 'student');
    }
  }, []);

  const login = (email, password, type = 'student') => {
    // Mock login - In real app, this would call backend API
    // For now, accept any email/password and use currentUser data
    if (email && password) {
      // Create appropriate user object based on type
      const userData = {
        ...currentUser,
        role: type,
      };
      
      setUser(userData);
      setIsAuthenticated(true);
      setUserType(type);
      
      // Store in localStorage for persistence
      localStorage.setItem('nexus_user', JSON.stringify(userData));
      localStorage.setItem('nexus_user_type', type);
      
      return { success: true, user: userData };
    }
    return { success: false, message: 'Invalid credentials' };
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setUserType('student');
    localStorage.removeItem('nexus_user');
    localStorage.removeItem('nexus_user_type');
  };

  const updateUser = (updatedData) => {
    const updatedUser = { ...user, ...updatedData };
    setUser(updatedUser);
    localStorage.setItem('nexus_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        userType,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for using auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;
