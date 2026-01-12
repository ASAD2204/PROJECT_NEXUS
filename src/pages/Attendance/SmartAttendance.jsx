import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stepper,
  Step,
  StepLabel,
  LinearProgress,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Tooltip,
  Stack,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Videocam,
  CheckCircle,
  LocationOn,
  AccessTime,
  Map as MapIcon,
  Camera,
  Person,
  LocalFireDepartment,
  ArrowForward,
  Help,
  History,
  CheckCircleOutline,
  RadioButtonUnchecked,
  Visibility,
  Lightbulb,
  RemoveRedEye,
  Face,
  Edit,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { courses, markAttendance, currentUser, attendanceStats } from '../../data/dummyData';
import { pageTransition } from '../../utils/animations';

const SmartAttendance = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [locationVerified, setLocationVerified] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [goodLighting, setGoodLighting] = useState(false);
  const [livenessVerified, setLivenessVerified] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [capturedImage, setCapturedImage] = useState(false);
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [loading, setLoading] = useState(true);

  const steps = ['Location Verification', 'Face Detection', 'Confirmation'];

  // Loading effect
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Mock today's classes
  const todaysClasses = [
    { id: 'CS101', code: 'CS101', title: 'Data Structures', time: '09:00 AM', room: 'Lab 301', faculty: 'Dr. Sarah Ahmed' },
    { id: 'CS202', code: 'CS202', title: 'Database Management', time: '11:00 AM', room: 'Room 205', faculty: 'Prof. Ali Raza' },
    { id: 'CS303', code: 'CS303', title: 'Web Engineering', time: '02:00 PM', room: 'Lab 102', faculty: 'Dr. Fatima Malik' },
  ];

  // Simulate location verification
  useEffect(() => {
    if (activeStep === 0) {
      setTimeout(() => {
        setLocationVerified(true);
      }, 1500);
    }
  }, [activeStep]);

  // Simulate face detection process
  useEffect(() => {
    if (activeStep === 1) {
      setTimeout(() => setFaceDetected(true), 1000);
      setTimeout(() => setGoodLighting(true), 1500);
      setTimeout(() => {
        setLivenessVerified(true);
        // Animate confidence
        let current = 0;
        const interval = setInterval(() => {
          current += 5;
          setConfidence(current);
          if (current >= 95) clearInterval(interval);
        }, 50);
      }, 2000);
    }
  }, [activeStep]);

  // Countdown for redirect
  useEffect(() => {
    if (attendanceMarked && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (attendanceMarked && countdown === 0) {
      navigate('/dashboard');
    }
  }, [attendanceMarked, countdown, navigate]);

  // Show loading skeleton
  if (loading) {
    return (
      <Box sx={{ pb: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Smart Attendance
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Loading attendance system...
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  const handleProceedToFace = () => {
    if (locationVerified) {
      setActiveStep(1);
    }
  };

  const handleCapture = () => {
    if (confidence >= 95) {
      setCapturedImage(true);
      setActiveStep(2);
    }
  };

  const handleConfirmAttendance = () => {
    if (selectedCourse) {
      markAttendance(selectedCourse, 'Present');
      setAttendanceMarked(true);
    }
  };

  const handleReset = () => {
    setActiveStep(0);
    setSelectedCourse('');
    setLocationVerified(false);
    setFaceDetected(false);
    setGoodLighting(false);
    setLivenessVerified(false);
    setConfidence(0);
    setCapturedImage(false);
    setAttendanceMarked(false);
    setCountdown(3);
  };

  return (
    <motion.div {...pageTransition}>
    <Box className="page-container">
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Smart Attendance System
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Mark your attendance using AI-powered facial recognition and location verification
        </Typography>
      </Box>

      <Box>
        {/* Success Animation */}
        {attendanceMarked && (
          <Card
            sx={{
              mb: 3,
              background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
              color: 'white',
              textAlign: 'center',
              animation: 'scaleIn 0.5s ease-out',
            }}
          >
            <CardContent sx={{ py: 6 }}>
              <Box
                sx={{
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  backgroundColor: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                  animation: 'pulse 1s infinite',
                  '@keyframes pulse': {
                    '0%, 100%': { transform: 'scale(1)' },
                    '50%': { transform: 'scale(1.1)' },
                  },
                }}
              >
                <CheckCircle sx={{ fontSize: 60, color: '#43e97b' }} />
              </Box>
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                Attendance Marked Successfully! ✅
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9, mb: 2 }}>
                {todaysClasses.find(c => c.id === selectedCourse)?.code} - {todaysClasses.find(c => c.id === selectedCourse)?.title}
              </Typography>
              <Typography variant="body1">
                Time: {new Date().toLocaleTimeString()} • Status: Present
              </Typography>
              <Typography variant="body2" sx={{ mt: 2, opacity: 0.8 }}>
                Redirecting to dashboard in {countdown} seconds...
              </Typography>
            </CardContent>
          </Card>
        )}

        {!attendanceMarked && (
          <Grid container spacing={3}>
            {/* Main Content */}
            <Grid size={{ xs: 12, lg: 8 }}>
              {/* Course Selection */}
              <Card sx={{ mb: 3 }} className="glass-morphism">
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Select Today's Class
                  </Typography>
                  {todaysClasses.length === 0 ? (
                    <Alert severity="info" sx={{ borderRadius: 2 }}>
                      No classes scheduled for today
                    </Alert>
                  ) : (
                    <FormControl fullWidth>
                      <Select
                        value={selectedCourse}
                        onChange={(e) => setSelectedCourse(e.target.value)}
                        displayEmpty
                        sx={{ borderRadius: 2 }}
                      >
                        <MenuItem value="" disabled>
                          Choose a course
                        </MenuItem>
                        {todaysClasses.map((course) => (
                          <MenuItem key={course.id} value={course.id}>
                            <Box>
                              <Typography fontWeight={600}>
                                {course.code} - {course.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {course.time} • {course.room} • {course.faculty}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                </CardContent>
              </Card>

              {/* Stepper */}
              {selectedCourse && (
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Stepper activeStep={activeStep} alternativeLabel>
                      {steps.map((label) => (
                        <Step key={label}>
                          <StepLabel>{label}</StepLabel>
                        </Step>
                      ))}
                    </Stepper>
                  </CardContent>
                </Card>
              )}

              {/* Step Content */}
              {selectedCourse && (
                <Card className="glass-morphism">
                  <CardContent>
                    {/* STEP 1: Location Verification */}
                    {activeStep === 0 && (
                      <Box>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                          Step 1: Location Verification
                        </Typography>
                        
                        {/* Map Placeholder */}
                        <Box
                          sx={{
                            height: 400,
                            backgroundColor: '#e0e0e0',
                            borderRadius: 3,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 3,
                            position: 'relative',
                            overflow: 'hidden',
                          }}
                        >
                          <MapIcon sx={{ fontSize: 100, color: '#9e9e9e' }} />
                          {locationVerified && (
                            <Box
                              sx={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                animation: 'ping 1s ease-out',
                                '@keyframes ping': {
                                  '0%': { transform: 'translate(-50%, -50%) scale(0)', opacity: 1 },
                                  '100%': { transform: 'translate(-50%, -50%) scale(2)', opacity: 0 },
                                },
                              }}
                            >
                              <Box
                                sx={{
                                  width: 60,
                                  height: 60,
                                  borderRadius: '50%',
                                  backgroundColor: 'success.main',
                                  border: '4px solid white',
                                }}
                              />
                            </Box>
                          )}
                        </Box>

                        {/* GPS Info */}
                        <Grid container spacing={2} sx={{ mb: 3 }}>
                          <Grid size={{ xs: 12, md: 6 }}>
                            <Card variant="outlined">
                              <CardContent>
                                <Typography variant="caption" color="text.secondary">
                                  GPS Coordinates
                                </Typography>
                                <Typography variant="body1" fontWeight={600}>
                                  31.5204° N, 74.3587° E
                                </Typography>
                              </CardContent>
                            </Card>
                          </Grid>
                          <Grid size={{ xs: 12, md: 6 }}>
                            <Card variant="outlined">
                              <CardContent>
                                <Typography variant="caption" color="text.secondary">
                                  Distance from Class
                                </Typography>
                                <Typography variant="body1" fontWeight={600}>
                                  15 meters
                                </Typography>
                              </CardContent>
                            </Card>
                          </Grid>
                        </Grid>

                        {/* Status Indicator */}
                        <Alert 
                          severity={locationVerified ? "success" : "info"}
                          icon={locationVerified ? <CheckCircle /> : <CircularProgress size={20} />}
                          sx={{ mb: 3, borderRadius: 2 }}
                        >
                          {locationVerified ? (
                            <>
                              <strong>Location Verified</strong>
                              <br />
                              You are in Computer Science Block - Ready to proceed
                            </>
                          ) : (
                            <>
                              <strong>Verifying Location...</strong>
                              <br />
                              Please wait while we confirm your location
                            </>
                          )}
                        </Alert>

                      </Box>
                    )}

                    {/* STEP 2: Face Detection */}
                    {activeStep === 1 && (
                      <Box>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                          Step 2: Face Detection
                        </Typography>

                        <Grid container spacing={3}>
                          {/* Camera Viewport */}
                          <Grid size={{ xs: 12, md: 8 }}>
                            <Box
                              sx={{
                                height: 450,
                                backgroundColor: '#1a1a1a',
                                borderRadius: 3,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                                overflow: 'hidden',
                              }}
                            >
                              <Camera sx={{ fontSize: 80, color: '#666', opacity: 0.3 }} />
                              
                              {/* Face Detection Box */}
                              {faceDetected && (
                                <Box
                                  sx={{
                                    position: 'absolute',
                                    width: 250,
                                    height: 330,
                                    border: '4px solid #4caf50',
                                    borderRadius: 3,
                                    animation: 'scanPulse 2s infinite',
                                    '@keyframes scanPulse': {
                                      '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                                      '50%': { opacity: 0.8, transform: 'scale(1.02)' },
                                    },
                                  }}
                                >
                                  {/* Corner Circles */}
                                  {[
                                    { top: -8, left: -8 },
                                    { top: -8, right: -8 },
                                    { bottom: -8, left: -8 },
                                    { bottom: -8, right: -8 },
                                  ].map((pos, i) => (
                                    <Box
                                      key={i}
                                      sx={{
                                        position: 'absolute',
                                        ...pos,
                                        width: 16,
                                        height: 16,
                                        borderRadius: '50%',
                                        backgroundColor: '#4caf50',
                                        animation: 'cornerPulse 1s infinite',
                                        animationDelay: `${i * 0.2}s`,
                                        '@keyframes cornerPulse': {
                                          '0%, 100%': { transform: 'scale(1)' },
                                          '50%': { transform: 'scale(1.5)' },
                                        },
                                      }}
                                    />
                                  ))}
                                </Box>
                              )}

                              {/* Scanning Line */}
                              {faceDetected && (
                                <Box
                                  sx={{
                                    position: 'absolute',
                                    width: 250,
                                    height: 2,
                                    backgroundColor: '#4caf50',
                                    boxShadow: '0 0 10px #4caf50',
                                    animation: 'scan 2s linear infinite',
                                    '@keyframes scan': {
                                      '0%': { top: '30%' },
                                      '100%': { top: '70%' },
                                    },
                                  }}
                                />
                              )}
                            </Box>

                            {/* Confidence Meter */}
                            <Box sx={{ mt: 2 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                  Match Confidence
                                </Typography>
                                <Typography variant="body2" fontWeight="bold" color="primary">
                                  {confidence}%
                                </Typography>
                              </Box>
                              <LinearProgress 
                                variant="determinate" 
                                value={confidence} 
                                sx={{ height: 8, borderRadius: 1 }}
                              />
                            </Box>
                          </Grid>

                          {/* Instructions Sidebar */}
                          <Grid size={{ xs: 12, md: 4 }}>
                            <Card variant="outlined">
                              <CardContent>
                                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                  Instructions
                                </Typography>
                                <List dense>
                                  <ListItem>
                                    <ListItemIcon>
                                      <RemoveRedEye color="primary" />
                                    </ListItemIcon>
                                    <ListItemText 
                                      primary="Look straight at camera" 
                                      primaryTypographyProps={{ variant: 'body2' }}
                                    />
                                  </ListItem>
                                  <ListItem>
                                    <ListItemIcon>
                                      <Lightbulb color="primary" />
                                    </ListItemIcon>
                                    <ListItemText 
                                      primary="Ensure good lighting" 
                                      primaryTypographyProps={{ variant: 'body2' }}
                                    />
                                  </ListItem>
                                  <ListItem>
                                    <ListItemIcon>
                                      <Visibility color="primary" />
                                    </ListItemIcon>
                                    <ListItemText 
                                      primary="Remove glasses if needed" 
                                      primaryTypographyProps={{ variant: 'body2' }}
                                    />
                                  </ListItem>
                                  <ListItem>
                                    <ListItemIcon>
                                      <Face color="primary" />
                                    </ListItemIcon>
                                    <ListItemText 
                                      primary="Blink naturally for liveness" 
                                      primaryTypographyProps={{ variant: 'body2' }}
                                    />
                                  </ListItem>
                                </List>
                                
                                <Divider sx={{ my: 2 }} />

                                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                  Status Checks
                                </Typography>
                                <List dense>
                                  <ListItem>
                                    <ListItemIcon>
                                      {faceDetected ? (
                                        <CheckCircleOutline color="success" />
                                      ) : (
                                        <RadioButtonUnchecked color="disabled" />
                                      )}
                                    </ListItemIcon>
                                    <ListItemText 
                                      primary="Face Detected" 
                                      primaryTypographyProps={{ variant: 'body2' }}
                                    />
                                  </ListItem>
                                  <ListItem>
                                    <ListItemIcon>
                                      {goodLighting ? (
                                        <CheckCircleOutline color="success" />
                                      ) : (
                                        <RadioButtonUnchecked color="disabled" />
                                      )}
                                    </ListItemIcon>
                                    <ListItemText 
                                      primary="Good Lighting" 
                                      primaryTypographyProps={{ variant: 'body2' }}
                                    />
                                  </ListItem>
                                  <ListItem>
                                    <ListItemIcon>
                                      {livenessVerified ? (
                                        <CheckCircleOutline color="success" />
                                      ) : faceDetected ? (
                                        <CircularProgress size={20} />
                                      ) : (
                                        <RadioButtonUnchecked color="disabled" />
                                      )}
                                    </ListItemIcon>
                                    <ListItemText 
                                      primary="Liveness Verified" 
                                      primaryTypographyProps={{ variant: 'body2' }}
                                    />
                                  </ListItem>
                                </List>
                              </CardContent>
                            </Card>
                          </Grid>
                        </Grid>

                        <Button
                          fullWidth
                          variant="contained"
                          size="large"
                          onClick={handleCapture}
                          disabled={confidence < 95}
                          endIcon={<CheckCircle />}
                          sx={{ mt: 3, py: 1.5 }}
                        >
                          Capture & Verify
                        </Button>
                      </Box>
                    )}

                    {/* STEP 3: Confirmation */}
                    {activeStep === 2 && (
                      <Box>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                          Step 3: Confirmation
                        </Typography>

                        {/* Captured Frame */}
                        <Box
                          sx={{
                            height: 300,
                            backgroundColor: '#e0e0e0',
                            borderRadius: 3,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 3,
                          }}
                        >
                          <Camera sx={{ fontSize: 60, color: '#9e9e9e' }} />
                        </Box>

                        {/* Match Result */}
                        <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body1" fontWeight="bold">
                              Match Confidence: 94.7%
                            </Typography>
                            <Chip label="Verified" color="success" size="small" />
                          </Box>
                        </Alert>

                        {/* Student Info */}
                        <Card variant="outlined" sx={{ mb: 3 }}>
                          <CardContent>
                            <Grid container spacing={2}>
                              <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="caption" color="text.secondary">
                                  Student Name
                                </Typography>
                                <Typography variant="body1" fontWeight={600}>
                                  {currentUser.name}
                                </Typography>
                              </Grid>
                              <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="caption" color="text.secondary">
                                  Roll Number
                                </Typography>
                                <Typography variant="body1" fontWeight={600}>
                                  {currentUser.rollNo}
                                </Typography>
                              </Grid>
                              <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="caption" color="text.secondary">
                                  Program
                                </Typography>
                                <Typography variant="body1" fontWeight={600}>
                                  {currentUser.program}
                                </Typography>
                              </Grid>
                              <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="caption" color="text.secondary">
                                  Timestamp
                                </Typography>
                                <Typography variant="body1" fontWeight={600}>
                                  {new Date().toLocaleString()}
                                </Typography>
                              </Grid>
                              <Grid size={12}>
                                <Typography variant="caption" color="text.secondary">
                                  Location
                                </Typography>
                                <Typography variant="body1" fontWeight={600}>
                                  Computer Science Block (31.5204° N, 74.3587° E)
                                </Typography>
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>

                        <Button
                          fullWidth
                          variant="contained"
                          color="success"
                          size="large"
                          onClick={handleConfirmAttendance}
                          startIcon={<CheckCircle />}
                          sx={{ py: 2, fontSize: '1.1rem' }}
                        >
                          Confirm Attendance
                        </Button>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              )}
            </Grid>

            {/* SIDEBAR INFO PANEL */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack spacing={3}>
                {/* Attendance Stats */}
                <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" color="white" gutterBottom>
                      Your Attendance Stats
                    </Typography>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid size={4}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" fontWeight="bold" color="white">
                            42
                          </Typography>
                          <Typography variant="caption" color="rgba(255,255,255,0.8)">
                            Present
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid size={4}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" fontWeight="bold" color="white">
                            3
                          </Typography>
                          <Typography variant="caption" color="rgba(255,255,255,0.8)">
                            Absent
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid size={4}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" fontWeight="bold" color="white">
                            93%
                          </Typography>
                          <Typography variant="caption" color="rgba(255,255,255,0.8)">
                            Rate
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                    <Box sx={{ mt: 3, position: 'relative', display: 'inline-flex', width: '100%', justifyContent: 'center' }}>
                      <CircularProgress 
                        variant="determinate" 
                        value={93.3} 
                        size={120}
                        thickness={4}
                        sx={{ 
                          color: 'white',
                          '& .MuiCircularProgress-circle': {
                            strokeLinecap: 'round',
                          },
                        }}
                      />
                      <Box
                        sx={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                        }}
                      >
                        <Typography variant="h3" fontWeight="bold" color="white">
                          93%
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>

                {/* Attendance Streak */}
                <Card>
                  <CardContent>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h1" sx={{ mb: 1 }}>
                        🔥
                      </Typography>
                      <Typography variant="h4" fontWeight="bold" color="primary">
                        15 Days
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Attendance Streak
                      </Typography>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="caption" color="text.secondary">
                        Keep it up! You're on a roll 🎉
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>

                {/* Next Class */}
                <Card>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Next Class
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    {countdown > 0 ? (
                      <>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Database Systems
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                          Room 305 • Dr. Ahmed Khan
                        </Typography>
                        <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                          <Typography variant="h5" fontWeight="bold">
                            {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                          </Typography>
                          <Typography variant="caption">
                            Time Remaining
                          </Typography>
                        </Alert>
                      </>
                    ) : (
                      <Alert severity="success" sx={{ borderRadius: 2 }}>
                        <Typography variant="body2">
                          Your class has started! Mark attendance now.
                        </Typography>
                      </Alert>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Quick Actions
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Stack spacing={2}>
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<History />}
                        onClick={() => navigate('/attendance/history')}
                      >
                        View Attendance History
                      </Button>
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<Edit />}
                        onClick={() => alert('Faculty override feature - Admin only')}
                      >
                        Mark Manually
                      </Button>
                      <Tooltip title="Smart Attendance uses AI-powered location and face verification to automatically mark your attendance. Follow the 3-step wizard for secure marking." arrow>
                        <Button
                          fullWidth
                          variant="text"
                          startIcon={<Help />}
                          size="small"
                        >
                          How It Works
                        </Button>
                      </Tooltip>
                    </Stack>
                  </CardContent>
                </Card>
              </Stack>
            </Grid>
          </Grid>
        )}
        </Box>
      </Box>
    </motion.div>
  );
};

export default SmartAttendance;
