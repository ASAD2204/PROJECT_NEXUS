import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Alert } from '@mui/material';
import { Email, ArrowBack } from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email) {
      // Simulate sending reset email
      setSuccess(true);
      setTimeout(() => {
        navigate('/otp', { state: { email } });
      }, 2000);
    }
  };

  return (
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

        <Email sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
        
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Forgot Password?
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Enter your email address and we'll send you a verification code to reset your password.
        </Typography>

        {success && (
          <Alert severity="success" sx={{ mb: 3, borderRadius: '12px' }}>
            Verification code sent! Redirecting to OTP verification...
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mb: 3 }}
            placeholder="your.email@university.edu"
            required
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            sx={{ py: 1.5 }}
          >
            Send Verification Code
          </Button>
        </form>
      </Box>
    </Box>
  );
};

export default ForgotPassword;
