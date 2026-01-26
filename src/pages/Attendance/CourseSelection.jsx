import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Divider,
  Chip,
} from '@mui/material';
import {
  School,
  ArrowForward,
  LocationOn,
  AccessTime,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const CourseSelection = () => {
  const navigate = useNavigate();
  const [selectedCourse, setSelectedCourse] = useState('');

  // Mock today's classes
  const todaysClasses = [
    {
      id: 'CS101',
      code: 'CS101',
      title: 'Data Structures',
      time: '09:00 AM - 10:30 AM',
      room: 'Lab 301',
      faculty: 'Dr. Sarah Ahmed',
      location: { lat: 31.5204, lng: 74.3587 },
    },
    {
      id: 'CS202',
      code: 'CS202',
      title: 'Database Management',
      time: '11:00 AM - 12:30 PM',
      room: 'Room 205',
      faculty: 'Prof. Ali Raza',
      location: { lat: 31.5204, lng: 74.3587 },
    },
    {
      id: 'CS303',
      code: 'CS303',
      title: 'Web Engineering',
      time: '02:00 PM - 03:30 PM',
      room: 'Lab 102',
      faculty: 'Dr. Fatima Malik',
      location: { lat: 31.5204, lng: 74.3587 },
    },
  ];

  const selectedCourseDetails = todaysClasses.find((c) => c.id === selectedCourse);

  const handleProceed = () => {
    if (selectedCourse) {
      // Store selected course in sessionStorage
      sessionStorage.setItem('selectedCourse', JSON.stringify(selectedCourseDetails));
      navigate('/attendance/gps-verification');
    }
  };

  return (
    <Box sx={{ minHeight: 'calc(100vh - 64px)', pb: 4 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4, pt: 3 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Smart Attendance System
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Step 1 of 6: Select Your Class
        </Typography>
      </Box>

      {/* Main Content */}
      <Box sx={{ maxWidth: 700, mx: 'auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card
            sx={{
              background: 'linear-gradient(135deg, rgba(25,118,210,0.05) 0%, rgba(0,121,107,0.05) 100%)',
              boxShadow: 3,
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Stack spacing={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <School sx={{ fontSize: 70, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                    Select Today's Class
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Choose which class you want to mark attendance for
                  </Typography>
                </Box>

                <FormControl fullWidth>
                  <InputLabel>Choose a course</InputLabel>
                  <Select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    label="Choose a course"
                    sx={{ borderRadius: 2 }}
                  >
                    {todaysClasses.map((course) => (
                      <MenuItem key={course.id} value={course.id}>
                        <Box sx={{ py: 1 }}>
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

                {selectedCourse && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
                      <CardContent>
                        <Stack spacing={1}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="h6" fontWeight="bold">
                              {selectedCourseDetails.code}
                            </Typography>
                            <Chip
                              label="Today"
                              size="small"
                              sx={{ bgcolor: 'white', color: 'primary.main', fontWeight: 'bold' }}
                            />
                          </Stack>
                          <Typography variant="body1" fontWeight={500}>
                            {selectedCourseDetails.title}
                          </Typography>
                          <Divider sx={{ borderColor: 'rgba(255,255,255,0.3)', my: 1 }} />
                          <Stack spacing={0.5}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <AccessTime fontSize="small" />
                              <Typography variant="body2">{selectedCourseDetails.time}</Typography>
                            </Stack>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <LocationOn fontSize="small" />
                              <Typography variant="body2">{selectedCourseDetails.room}</Typography>
                            </Stack>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <PersonIcon fontSize="small" />
                              <Typography variant="body2">{selectedCourseDetails.faculty}</Typography>
                            </Stack>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={!selectedCourse}
                  onClick={handleProceed}
                  endIcon={<ArrowForward />}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    background: selectedCourse
                      ? 'linear-gradient(135deg, #1976D2 0%, #00796B 100%)'
                      : undefined,
                    fontWeight: 'bold',
                  }}
                >
                  Proceed to GPS Verification
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </motion.div>
      </Box>
    </Box>
  );
};

export default CourseSelection;
