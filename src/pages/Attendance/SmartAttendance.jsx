/**
 * Smart Attendance Page
 * 
 * Multi-step attendance marking system with GPS verification, liveness detection, and face capture.
 * Ensures secure and accurate attendance marking.
 * 
 * Features:
 * - Course selection with current class detection
 * - GPS location verification
 * - Liveness detection (blink, smile)
 * - Face capture and verification
 * - Attendance confirmation
 * - Success animation and summary
 * - Step-by-step progress indicator
 * - Security measures to prevent proxy attendance
 * 
 * Workflow:
 * 1. Select course
 * 2. Verify GPS location
 * 3. Perform liveness detection
 * 4. Capture face photo
 * 5. Confirm details
 * 6. Mark attendance
 * 
 * @component
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Select,
  MenuItem,
  FormControl,
  CircularProgress,
  Divider,
  Tooltip,
  Stack,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Chip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  CheckCircle,
  LocationOn,
  AccessTime,
  Person,
  ArrowForward,
  Help,
  History,
  Videocam,
  MyLocation,
  Visibility,
  Face,
  LocalFireDepartment,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { pageTransition } from '../../utils/animations';

const SmartAttendance = () => {
  const navigate = useNavigate();
  const [selectedCourse, setSelectedCourse] = useState('');

  // Mock today's classes with GPS coordinates
  const todaysClasses = [
    { 
      id: 'CS101', 
      code: 'CS101', 
      title: 'Data Structures', 
      time: '09:00 AM', 
      room: 'Lab 301', 
      faculty: 'Dr. Sarah Ahmed',
      location: { lat: 31.5204, lng: 74.3587 }
    },
    { 
      id: 'CS202', 
      code: 'CS202', 
      title: 'Database Management', 
      time: '11:00 AM', 
      room: 'Room 205', 
      faculty: 'Prof. Ali Raza',
      location: { lat: 31.5210, lng: 74.3590 }
    },
    { 
      id: 'CS303', 
      code: 'CS303', 
      title: 'Web Engineering', 
      time: '02:00 PM', 
      room: 'Lab 102', 
      faculty: 'Dr. Fatima Malik',
      location: { lat: 31.5200, lng: 74.3585 }
    },
  ];

  const handleProceedToVerification = () => {
    if (selectedCourse) {
      const course = todaysClasses.find(c => c.id === selectedCourse);
      sessionStorage.setItem('selectedCourse', JSON.stringify(course));
      navigate('/attendance/gps-verification');
    }
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
        <Grid container spacing={3}>
          {/* Main Content */}
          <Grid size={{ xs: 12, lg: 8 }}>
            {/* Course Selection */}
            <Card sx={{ mb: 3, overflow: 'hidden' }}>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Box sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Videocam sx={{ fontSize: 28, color: 'white' }} />
                  </Box>
                  <Box>
                    <Typography variant="h5" fontWeight="bold" gutterBottom>
                      Select Today's Class
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Choose a course to mark your attendance
                    </Typography>
                  </Box>
                </Box>
                
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
                      sx={{ 
                        borderRadius: 2,
                        '& .MuiSelect-select': {
                          py: 2
                        }
                      }}
                    >
                      <MenuItem value="" disabled>
                        <Typography color="text.secondary">Choose a course...</Typography>
                      </MenuItem>
                      {todaysClasses.map((course) => (
                        <MenuItem key={course.id} value={course.id}>
                          <Box sx={{ py: 1 }}>
                            <Typography fontWeight={600} variant="body1">
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

            {/* Selected Course Info */}
            {selectedCourse && (
              <>
                <Card sx={{ mb: 3 }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      SELECTED COURSE
                    </Typography>
                    <Paper sx={{ 
                      p: 3, 
                      borderRadius: 2, 
                      background: 'linear-gradient(135deg, rgba(102,126,234,0.15) 0%, rgba(118,75,162,0.15) 100%)',
                      border: '2px solid',
                      borderColor: 'primary.main',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      {todaysClasses.filter(c => c.id === selectedCourse).map(course => (
                        <Box key={course.id}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                            <Box>
                              <Typography variant="h5" fontWeight="bold" color="primary" gutterBottom>
                                {course.code}
                              </Typography>
                              <Typography variant="h6" fontWeight={600} gutterBottom>
                                {course.title}
                              </Typography>
                            </Box>
                            <Chip 
                              label="Active" 
                              color="success" 
                              size="small" 
                              sx={{ fontWeight: 600 }}
                            />
                          </Box>
                          <Divider sx={{ my: 2 }} />
                          <Stack spacing={1.5}>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <AccessTime fontSize="small" color="primary" />
                              <Typography variant="body2" fontWeight={500}>{course.time}</Typography>
                            </Stack>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <LocationOn fontSize="small" color="primary" />
                              <Typography variant="body2" fontWeight={500}>{course.room}</Typography>
                            </Stack>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <Person fontSize="small" color="primary" />
                              <Typography variant="body2" fontWeight={500}>{course.faculty}</Typography>
                            </Stack>
                          </Stack>
                        </Box>
                      ))}
                    </Paper>
                  </CardContent>
                </Card>

                {/* Verification Steps */}
                <Card sx={{ mb: 3 }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Verification Process
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Complete these steps to mark your attendance
                    </Typography>
                    <List>
                      <ListItem>
                        <ListItemIcon>
                          <Box sx={{ 
                            width: 40, 
                            height: 40, 
                            borderRadius: '50%', 
                            bgcolor: 'primary.lighter',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <MyLocation color="primary" />
                          </Box>
                        </ListItemIcon>
                        <ListItemText 
                          primary="GPS Location Verification" 
                          secondary="Verify you're within class radius"
                          primaryTypographyProps={{ fontWeight: 600 }}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <Box sx={{ 
                            width: 40, 
                            height: 40, 
                            borderRadius: '50%', 
                            bgcolor: 'success.lighter',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Visibility color="success" />
                          </Box>
                        </ListItemIcon>
                        <ListItemText 
                          primary="Liveness Detection" 
                          secondary="Blink your eyes or speak to verify"
                          primaryTypographyProps={{ fontWeight: 600 }}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <Box sx={{ 
                            width: 40, 
                            height: 40, 
                            borderRadius: '50%', 
                            bgcolor: 'warning.lighter',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Face color="warning" />
                          </Box>
                        </ListItemIcon>
                        <ListItemText 
                          primary="Face Recognition" 
                          secondary="Capture your face for verification"
                          primaryTypographyProps={{ fontWeight: 600 }}
                        />
                      </ListItem>
                    </List>
                    
                    <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                      <Typography variant="body2" fontWeight="bold">
                        Ready to start?
                      </Typography>
                      <Typography variant="caption">
                        The entire process takes less than 30 seconds
                      </Typography>
                    </Alert>

                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      endIcon={<ArrowForward />}
                      onClick={handleProceedToVerification}
                      sx={{ 
                        mt: 3, 
                        py: 2,
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        boxShadow: '0 6px 20px rgba(102,126,234,0.4)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                          boxShadow: '0 8px 25px rgba(102,126,234,0.5)',
                          transform: 'translateY(-2px)',
                        },
                        transition: 'all 0.3s ease'
                      }}
                    >
                      Start Verification Process
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </Grid>

          {/* SIDEBAR INFO PANEL */}
          <Grid size={{ xs: 12, lg: 4 }}>
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
                    <Tooltip title="Smart Attendance uses AI-powered location and face verification to automatically mark your attendance. Follow the multi-step wizard for secure marking." arrow>
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
      </Box>
    </Box>
    </motion.div>
  );
};

export default SmartAttendance;
