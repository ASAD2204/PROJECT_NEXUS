/**
 * Login Page
 * 
 * Authentication page for user login with role selection.
 * Supports multiple user roles and redirects based on role.
 * 
 * Features:
 * - Email/password authentication
 * - Role selection dropdown (Student, Teacher, Admin, Alumni, Librarian)
 * - Remember me functionality
 * - Forgot password link
 * - Input validation and error handling
 * - Animated gradient background
 * - Responsive design
 * 
 * @component
 */

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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { 
  School, 
  Login as LoginIcon, 
  Person, 
  Group, 
  AdminPanelSettings,
  LocalLibrary,
  People,
  KeyboardArrowDown,
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
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setSubmitting(true);
    try {
      const result = await login(email, password, userType);
      if (result.success) {
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
          localStorage.setItem('userEmail', email);
        } else {
          localStorage.removeItem('rememberMe');
          localStorage.removeItem('userEmail');
        }

        const role = result.user.role;
        switch (role) {
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
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
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

            <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
              Welcome Back!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Sign in to continue to your account
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              {/* User Type Selection with Beautiful Dropdown */}
              <FormControl fullWidth sx={{ mb: 2.5 }}>
                <InputLabel id="user-type-label" sx={{ fontWeight: 600, fontSize: '0.95rem' }}>Select User Type</InputLabel>
                <Select
                  labelId="user-type-label"
                  value={userType}
                  label="Select User Type"
                  onChange={(e) => setUserType(e.target.value)}
                  IconComponent={KeyboardArrowDown}
                  sx={{
                    '& .MuiSelect-select': {
                      py: 1.75,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      fontSize: '1rem',
                    },
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderWidth: '2px',
                    },
                    '&:hover': {
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main',
                      },
                    },
                  }}
                  renderValue={(selected) => {
                    const selectedType = userTypes.find(type => type.value === selected);
                    const Icon = selectedType.icon;
                    return (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Icon sx={{ fontSize: 20, color: selectedType.color }} />
                        <Typography fontWeight={600} color={selectedType.color}>
                          {selectedType.label}
                        </Typography>
                      </Box>
                    );
                  }}
                >
                  {userTypes.map(({ value, icon: Icon, label, color }) => (
                    <MenuItem 
                      key={value} 
                      value={value}
                      sx={{
                        py: 1.5,
                        '&:hover': {
                          backgroundColor: `${color}15`,
                        },
                        '&.Mui-selected': {
                          backgroundColor: `${color}20`,
                          '&:hover': {
                            backgroundColor: `${color}30`,
                          },
                        },
                      }}
                    >
                      <ListItemIcon>
                        <Icon sx={{ color: color }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary={label}
                        primaryTypographyProps={{
                          fontWeight: userType === value ? 700 : 500,
                          color: color,
                        }}
                      />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField 
                fullWidth 
                label="Email Address" 
                type="email" 
                required
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                sx={{ 
                  mb: 2.5,
                  '& .MuiInputLabel-root': {
                    fontWeight: 600,
                    fontSize: '0.95rem',
                  },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      borderWidth: '2px',
                    },
                  },
                  '& .MuiInputBase-input': {
                    py: 1.75,
                    fontSize: '1rem',
                  },
                }} 
                placeholder="user@university.edu" 
                inputProps={{ maxLength: 254 }}
              />
              <TextField 
                fullWidth 
                label="Password" 
                type="password" 
                required
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                sx={{ 
                  mb: 2,
                  '& .MuiInputLabel-root': {
                    fontWeight: 600,
                    fontSize: '0.95rem',
                  },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      borderWidth: '2px',
                    },
                  },
                  '& .MuiInputBase-input': {
                    py: 1.75,
                    fontSize: '1rem',
                  },
                }} 
                placeholder="Enter your password" 
                inputProps={{ minLength: 8, maxLength: 128 }}
              />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <FormControlLabel
                  control={<Checkbox checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} color="primary" />}
                  label={<Typography variant="body2" fontWeight={500}>Remember Me</Typography>}
                />
                <MuiLink component={Link} to="/forgot-password" variant="body2" underline="hover" color="primary" fontWeight={600}>
                  Forgot Password?
                </MuiLink>
              </Box>

              <Button 
                type="submit" 
                fullWidth 
                variant="contained" 
                size="large" 
                disabled={submitting}
                startIcon={<LoginIcon />} 
                sx={{ 
                  mb: 2.5, 
                  py: 1.75,
                  fontSize: '1rem',
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: 2,
                  boxShadow: '0 4px 14px 0 rgba(25, 118, 210, 0.39)',
                  '&:hover': {
                    boxShadow: '0 6px 20px rgba(25, 118, 210, 0.5)',
                    transform: 'translateY(-2px)',
                  },
                  transition: 'all 0.3s',
                }}
              >
                {submitting ? 'Signing In...' : `Sign In as ${userType.charAt(0).toUpperCase() + userType.slice(1)}`}
              </Button>
            </form>
          </Box>
        </Box>
      </Box>
    </PageTransition>
  );
};

export default Login;
