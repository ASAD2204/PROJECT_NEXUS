import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Switch,
  FormControlLabel,
  Link as MuiLink,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  Paper,
} from '@mui/material';
import { School, Login as LoginIcon, Person, Group, AdminPanelSettings } from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState('student');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    const result = login(email, password, userType);
    if (result.success) {
      // Navigate based on user type
      switch (userType) {
        case 'admin':
          navigate('/admin/dashboard');
          break;
        case 'teacher':
          navigate('/teacher/dashboard');
          break;
        default:
          navigate('/dashboard');
      }
    } else {
      setError(result.message);
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Left Side - Image with Overlay */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          width: '50%',
          position: 'relative',
          backgroundImage: 'url(https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(25, 118, 210, 0.85)',
          },
        }}
      >
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            color: 'white',
            p: 6,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <School sx={{ fontSize: 80, mb: 3 }} />
          <Typography variant="h2" fontWeight="bold" gutterBottom>
            Project Nexus
          </Typography>
          <Typography variant="h5" sx={{ mb: 3 }}>
            Unified Intelligent Campus Platform
          </Typography>
          <Typography variant="body1" sx={{ maxWidth: 500, lineHeight: 1.8 }}>
            Access your academic life in one place. Track attendance, manage courses,
            submit assignments, pay fees, and connect with AI-powered support.
          </Typography>
        </Box>
      </Box>

      {/* Right Side - Login Form */}
      <Box
        sx={{
          width: { xs: '100%', md: '50%' },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4,
          backgroundColor: 'background.paper',
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 400 }}>
          {/* Logo for mobile */}
          <Box sx={{ display: { md: 'none' }, textAlign: 'center', mb: 4 }}>
            <School sx={{ fontSize: 60, color: 'primary.main', mb: 1 }} />
            <Typography variant="h4" fontWeight="bold" color="primary">
              Project Nexus
            </Typography>
          </Box>

          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Welcome Back!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Sign in to continue to your account
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            {/* User Type Selection */}
            <Paper elevation={0} sx={{ p: 2, mb: 3, backgroundColor: 'background.default' }}>
              <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                Select User Type
              </Typography>
              <ToggleButtonGroup
                value={userType}
                exclusive
                onChange={(e, newType) => newType && setUserType(newType)}
                fullWidth
                size="small"
              >
                <ToggleButton value="student">
                  <Person sx={{ mr: 0.5 }} fontSize="small" />
                  Student
                </ToggleButton>
                <ToggleButton value="teacher">
                  <Group sx={{ mr: 0.5 }} fontSize="small" />
                  Teacher
                </ToggleButton>
                <ToggleButton value="admin">
                  <AdminPanelSettings sx={{ mr: 0.5 }} fontSize="small" />
                  Admin
                </ToggleButton>
              </ToggleButtonGroup>
            </Paper>

            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ mb: 3 }}
              placeholder="user@university.edu"
            />

            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 2 }}
              placeholder="Enter your password"
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
              <MuiLink
                component={Link}
                to="/forgot-password"
                variant="body2"
                underline="hover"
                color="primary"
              >
                Forgot Password?
              </MuiLink>
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              startIcon={<LoginIcon />}
              sx={{ mb: 2, py: 1.5 }}
            >
              Sign In as {userType.charAt(0).toUpperCase() + userType.slice(1)}
            </Button>
          </form>

          <Box sx={{ mt: 4, p: 2, backgroundColor: 'background.default', borderRadius: '12px' }}>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              <strong>Demo Credentials:</strong>
              <br />
              Email: any@email.com | Password: any
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Login;
