import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Checkbox,
  FormControlLabel,
  Link as MuiLink,
  Alert,
  Paper,
  Chip,
  Stack,
} from '@mui/material';
import { 
  School, 
  Login as LoginIcon, 
  Person, 
  Group, 
  AdminPanelSettings,
  LocalLibrary,
  People,
} from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import PageTransition from '../../components/Common/PageTransition';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState('student');
  const [rememberMe, setRememberMe] = useState(false);
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
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
        localStorage.setItem('userEmail', email);
      } else {
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('userEmail');
      }

      switch (userType) {
        case 'admin':
          navigate('/admin/dashboard');
          break;
        case 'teacher':
          navigate('/teacher/dashboard');
          break;
        case 'librarian':
          navigate('/librarian/dashboard');
          break;
        case 'alumni':
          navigate('/alumni/network');
          break;
        default:
          navigate('/dashboard');
      }
    } else {
      setError(result.message);
    }
  };

  const userTypes = [
    { value: 'student', icon: Person, label: 'Student', color: '#1976D2' },
    { value: 'teacher', icon: Group, label: 'Teacher', color: '#00796B' },
    { value: 'admin', icon: AdminPanelSettings, label: 'Admin', color: '#D32F2F' },
    { value: 'librarian', icon: LocalLibrary, label: 'Librarian', color: '#7B1FA2' },
    { value: 'alumni', icon: People, label: 'Alumni', color: '#F57C00' },
  ];

  return (
    <PageTransition>
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        {/* Left Side - Image */}
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
          <Box sx={{ position: 'relative', zIndex: 1, color: 'white', p: 6, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <School sx={{ fontSize: 80, mb: 3 }} />
            <Typography variant="h2" fontWeight="bold" gutterBottom>
              Project Nexus
            </Typography>
            <Typography variant="h5" sx={{ mb: 3 }}>
              Unified Intelligent Campus Platform
            </Typography>
            <Typography variant="body1" sx={{ maxWidth: 500, lineHeight: 1.8 }}>
              Access your academic life in one place. Track attendance, manage courses, submit assignments, pay fees, and connect with AI-powered support.
            </Typography>
          </Box>
        </Box>

        {/* Right Side - Compact Form */}
        <Box sx={{ width: { xs: '100%', md: '50%' }, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, backgroundColor: 'background.paper' }}>
          <Box sx={{ width: '100%', maxWidth: 420 }}>
            <Box sx={{ display: { md: 'none' }, textAlign: 'center', mb: 2 }}>
              <School sx={{ fontSize: 48, color: 'primary.main', mb: 0.5 }} />
              <Typography variant="h5" fontWeight="bold" color="primary">
                Project Nexus
              </Typography>
            </Box>

            <Typography variant="h4" fontWeight="bold">
              Welcome Back!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Sign in to continue to your account
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              {/* User Type Selection with Cards */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom textAlign="center" fontWeight={600}>
                  I am a...
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: 1,
                  }}
                >
                  {userTypes.map(({ value, icon: Icon, label, color }) => (
                    <Button
                      key={value}
                      onClick={() => setUserType(value)}
                      variant={userType === value ? 'contained' : 'outlined'}
                      sx={{
                        py: 1.5,
                        px: 1,
                        flexDirection: 'column',
                        gap: 0.5,
                        minHeight: 85,
                        borderRadius: 2,
                        border: '2px solid',
                        borderColor: userType === value ? color : 'divider',
                        backgroundColor: userType === value ? `${color}15` : 'background.paper',
                        color: userType === value ? color : 'text.primary',
                        '&:hover': {
                          borderColor: color,
                          backgroundColor: `${color}10`,
                          transform: 'translateY(-2px)',
                        },
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <Icon sx={{ fontSize: 28, color: color }} />
                      <Typography variant="caption" fontWeight={700} sx={{ color: color }}>
                        {label}
                      </Typography>
                      {userType === value && (
                        <Box
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            bgcolor: color,
                            mt: 0.5,
                          }}
                        />
                      )}
                    </Button>
                  ))}
                </Box>
              </Box>

              <TextField fullWidth label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} size="small" sx={{ mb: 2 }} placeholder="user@university.edu" />
              <TextField fullWidth label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} size="small" sx={{ mb: 1.5 }} placeholder="Enter your password" />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <FormControlLabel
                  control={<Checkbox checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} size="small" color="primary" />}
                  label={<Typography variant="caption">Remember Me</Typography>}
                />
                <MuiLink component={Link} to="/forgot-password" variant="caption" underline="hover" color="primary">
                  Forgot Password?
                </MuiLink>
              </Box>

              <Button type="submit" fullWidth variant="contained" size="large" startIcon={<LoginIcon />} sx={{ mb: 2, py: 1.2 }}>
                Sign In as {userType.charAt(0).toUpperCase() + userType.slice(1)}
              </Button>
            </form>

            <Box sx={{ mt: 2, p: 1.5, backgroundColor: 'background.default', borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" textAlign="center" display="block">
                <strong>Demo Credentials:</strong> Email: any@email.com | Password: any
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </PageTransition>
  );
};

export default Login;
