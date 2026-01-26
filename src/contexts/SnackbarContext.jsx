import { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Alert, Slide } from '@mui/material';
import PropTypes from 'prop-types';

/**
 * Snackbar Context
 * Provides global toast notifications throughout the application
 * Usage: const { showSnackbar } = useSnackbar();
 *        showSnackbar('Success!', 'success');
 */

const SnackbarContext = createContext();

export const useSnackbar = () => {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within SnackbarProvider');
  }
  return context;
};

function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export const SnackbarProvider = ({ children }) => {
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success', // 'success' | 'error' | 'warning' | 'info'
  });

  const showSnackbar = useCallback((message, severity = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  }, []);

  const hideSnackbar = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  return (
    <SnackbarContext.Provider value={{ showSnackbar, hideSnackbar }}>
      {children}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={hideSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        TransitionComponent={SlideTransition}
      >
        <Alert
          onClose={hideSnackbar}
          severity={snackbar.severity}
          variant="filled"
          elevation={6}
          sx={{
            borderRadius: '12px',
            fontWeight: 500,
            minWidth: 300,
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
};

SnackbarProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default SnackbarContext;
