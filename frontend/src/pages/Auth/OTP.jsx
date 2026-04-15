import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Alert } from '@mui/material';
import { LockReset, ArrowBack } from '@mui/icons-material';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import PageTransition from '../../components/Common/PageTransition';
import { authAPI } from '../../api/auth';

const OTP = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (index, value) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      // Auto-focus next input
      if (value && index < 5) {
        document.getElementById(`otp-${index + 1}`)?.focus();
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');
    
    if (otpCode.length !== 6) {
      setError('Please enter complete 6-digit code');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await authAPI.verifyOTP(email, otpCode);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired verification code.');
      setSuccess(false);
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
            textAlign: 'center',
          }}
        >
        <Button
          component={Link}
          to="/forgot-password"
          startIcon={<ArrowBack />}
          sx={{ mb: 3, alignSelf: 'flex-start' }}
        >
          Back
        </Button>

        <LockReset sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
        
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Enter Verification Code
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
          We've sent a 6-digit code to
        </Typography>
        <Typography variant="body1" fontWeight="bold" color="primary" sx={{ mb: 4 }}>
          {email}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3, borderRadius: '12px' }}>
            Verification successful! Redirecting to login...
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 4 }}>
            {otp.map((digit, index) => (
              <TextField
                key={index}
                id={`otp-${index}`}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                inputProps={{
                  maxLength: 1,
                  style: { textAlign: 'center', fontSize: '24px', fontWeight: 'bold' },
                }}
                sx={{
                  width: 60,
                  '& .MuiOutlinedInput-root': {
                    height: 60,
                  },
                }}
              />
            ))}
          </Box>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={submitting}
            sx={{ py: 1.5, mb: 2 }}
          >
            {submitting ? 'Verifying...' : 'Verify Code'}
          </Button>

          <Button
            variant="text"
            size="small"
            sx={{ textTransform: 'none' }}
          >
            Didn't receive code? Resend
          </Button>
        </form>
        </Box>
      </Box>
    </PageTransition>
  );
};

export default OTP;
