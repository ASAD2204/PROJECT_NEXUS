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
import globalStyles from './styles/globalStyles.js';

// Theme Wrapper Component
const ThemedApp = () => {
  const { mode } = useThemeMode();
  const theme = getTheme(mode);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <MuiGlobalStyles styles={globalStyles} />
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </MuiThemeProvider>
  );
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  </StrictMode>
);