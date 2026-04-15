import React, { useState, useEffect } from 'react';
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
import { sisAPI } from '../../api/sis';

const CourseSelection = () => {
  const navigate = useNavigate();
  const [selectedCourse, setSelectedCourse] = useState('');
  const [todaysClasses, setTodaysClasses] = useState([]);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await sisAPI.getMyCourses();
        const courses = res.data?.courses || res.data || [];
        setTodaysClasses(courses.map(c => ({
          id: c.id || c.course_id || c.code,
          code: c.code || c.course_code || '',
          title: c.title || c.name || c.course_name || '',
          time: c.time || c.schedule || '',
          room: c.room || c.venue || '',
          faculty: c.faculty || c.instructor || '',
          location: c.location || { lat: 31.5204, lng: 74.3587 },
        })));
      } catch (e) { console.error(e); }
    };
    fetchClasses();
  }, []);

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
