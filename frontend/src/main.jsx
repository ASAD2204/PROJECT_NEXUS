/**
 * Main Entry Point for Project Nexus Application
 * 
 * This file initializes the React application and sets up all necessary providers:
 * - Theme Provider: Manages light/dark mode theme switching
 * - Auth Provider: Handles user authentication and authorization
 * - Router: Enables client-side routing
 * - Snackbar Provider: Manages global notifications
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { GlobalStyles as MuiGlobalStyles } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App.jsx';
import { getTheme } from './theme.js';
import { ThemeProvider, useThemeMode } from './contexts/ThemeContext.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { SnackbarProvider } from './contexts/SnackbarContext.jsx';
import globalStyles from './styles/globalStyles.js';

/**
 * Theme Wrapper Component
 * Wraps the app with MUI theme and applies global styles
 */
const ThemedApp = () => {
  // Get current theme mode (light/dark) from context
  const { mode } = useThemeMode();
  const theme = getTheme(mode);

  return (
    <MuiThemeProvider theme={theme}>
      {/* CssBaseline: Normalizes CSS across browsers */}
      <CssBaseline />
      {/* Apply global custom styles */}
      <MuiGlobalStyles styles={globalStyles} />
      {/* Snackbar for notifications */}
      <SnackbarProvider>
        {/* Router for navigation */}
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          {/* Authentication context */}
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </SnackbarProvider>
    </MuiThemeProvider>
  );
};

// Render the application to the DOM
createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Outermost theme provider for theme mode management */}
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  </StrictMode>
);