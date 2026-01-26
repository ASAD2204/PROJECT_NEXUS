/**
 * Theme Context
 * 
 * Manages application-wide theme mode (light/dark).
 * Persists user's theme preference in localStorage.
 * 
 * Features:
 * - Theme toggle between light and dark modes
 * - Persistent theme preference across sessions
 * - Easy access via custom hook
 */

import React, { createContext, useState, useEffect, useContext } from 'react';

// Create Theme Context
const ThemeContext = createContext();

/**
 * Theme Provider Component
 * Wraps the app to provide theme management functionality
 */
export const ThemeProvider = ({ children }) => {
  /**
   * Initialize theme mode from localStorage
   * Defaults to 'light' if no preference is saved
   */
  const [mode, setMode] = useState(() => {
    const savedMode = localStorage.getItem('nexus-theme');
    return savedMode || 'light';
  });

  /**
   * Toggle Theme Function
   * Switches between light and dark modes
   * Automatically saves preference to localStorage
   */
  const toggleTheme = () => {
    setMode((prevMode) => {
      const newMode = prevMode === 'light' ? 'dark' : 'light';
      // Persist theme preference
      localStorage.setItem('nexus-theme', newMode);
      return newMode;
    });
  };

  /**
   * Sync theme mode with localStorage whenever it changes
   * Ensures persistence across page reloads
   */
  useEffect(() => {
    localStorage.setItem('nexus-theme', mode);
  }, [mode]);

  // Provide theme context to child components
  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Custom Hook: useThemeMode
 * Provides easy access to theme context
 * 
 * Usage: const { mode, toggleTheme } = useThemeMode();
 * 
 * @returns {Object} - { mode: 'light'|'dark', toggleTheme: Function }
 * @throws {Error} if used outside ThemeProvider
 */
export const useThemeMode = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
