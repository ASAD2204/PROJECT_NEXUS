import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Alert } from '@mui/material';
import { VpnKey, ArrowBack } from '@mui/icons-material';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import PageTransition from '../../components/Common/PageTransition';
import { authAPI } from '../../api/auth';

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const resetToken = location.state?.resetToken || '';
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!resetToken) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5" color="error">Invalid session. Please start over.</Typography>
        <Button component={Link} to="/forgot-password" sx={{ mt: 2 }}>Forgot Password</Button>
      </Box>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
        setError('Password must be at least 8 characters long');
        return;
    }

    setError('');
    setSubmitting(true);
    try {
      await authAPI.resetPassword(resetToken, password);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageTransition>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'background.default',
          p: 3,
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 500,
            backgroundColor: 'background.paper',
            borderRadius: '12px',
            p: 4,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          }}
        >
        <Button
          component={Link}
          to="/login"
          startIcon={<ArrowBack />}
          sx={{ mb: 3 }}
        >
          Back to Login
        </Button>

        <VpnKey sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
        
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Reset Password
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Enter your new password below.
        </Typography>

        {success && (
          <Alert severity="success" sx={{ mb: 3, borderRadius: '12px' }}>
            Password reset successful! Redirecting to login...
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="New Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mb: 3 }}
            required
          />

          <TextField
            fullWidth
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            sx={{ mb: 4 }}
            required
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={submitting || success}
            sx={{ py: 1.5 }}
          >
            {submitting ? 'Resetting...' : 'Reset Password'}
          </Button>
        </form>
        </Box>
      </Box>
    </PageTransition>
  );
};

export default ResetPassword;
