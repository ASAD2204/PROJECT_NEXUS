import React from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Paper,
} from '@mui/material';
import {
  CheckCircle,
  ArrowBack,
  AccessTime,
  LocationOn,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Confirmation = () => {
  const navigate = useNavigate();
  
  const selectedCourse = JSON.parse(sessionStorage.getItem('selectedCourse') || '{}');
  const capturedImage = sessionStorage.getItem('capturedFace');

  return (
    <Box sx={{ minHeight: 'calc(100vh - 64px)', pb: 4 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4, pt: 3 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Review & Confirm
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Step 5 of 6: Verify All Details
        </Typography>
      </Box>

      {/* Main Content */}
      <Box sx={{ maxWidth: 900, mx: 'auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card sx={{ 
            borderRadius: 4, 
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
          }}>
            <CardContent sx={{ p: 4 }}>
              <Stack spacing={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Box sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2
                  }}>
                    <CheckCircle sx={{ fontSize: 40, color: 'white' }} />
                  </Box>
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                    Almost Done!
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Please verify all details before submitting
                  </Typography>
                </Box>

                {/* Course Info */}
                <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                  <CardContent>
                    <Typography variant="overline" sx={{ opacity: 0.9 }}>
                      Selected Course
                    </Typography>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      {selectedCourse.code} - {selectedCourse.title}
                    </Typography>
                    <Stack spacing={1} sx={{ mt: 2 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <AccessTime fontSize="small" />
                        <Typography variant="body2">{selectedCourse.time}</Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <LocationOn fontSize="small" />
                        <Typography variant="body2">{selectedCourse.room}</Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <PersonIcon fontSize="small" />
                        <Typography variant="body2">{selectedCourse.faculty}</Typography>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>

                {/* Captured Image */}
                {capturedImage && (
                  <Paper sx={{ 
                    p: 2,
                    borderRadius: 3,
                    border: '3px solid',
                    borderColor: 'primary.main',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
                  }}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom color="primary">
                      Captured Photo:
                    </Typography>
                    <Box sx={{ position: 'relative' }}>
                      <Box
                        component="img"
                        src={capturedImage}
                        sx={{
                          width: '100%',
                          maxHeight: 400,
                          objectFit: 'contain',
                          borderRadius: 2,
                          bgcolor: '#1a1a2e',
                        }}
                      />
                      {[
                        { top: 0, left: 0, rotate: '0deg' },
                        { top: 0, right: 0, rotate: '90deg' },
                        { bottom: 0, left: 0, rotate: '-90deg' },
                        { bottom: 0, right: 0, rotate: '180deg' }
                      ].map((pos, i) => (
                        <Box key={i} sx={{
                          position: 'absolute',
                          ...pos,
                          width: 25,
                          height: 25,
                          borderTop: '4px solid',
                          borderLeft: '4px solid',
                          borderColor: 'success.main',
                          transform: `rotate(${pos.rotate})`
                        }} />
                      ))}
                    </Box>
                    <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 1, color: 'success.main', fontWeight: 600 }}>
                      ✓ Face Captured Successfully
                    </Typography>
                  </Paper>
                )}

                {/* Verification Status */}
                <Paper sx={{
                  p: 3,
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                  border: '2px solid',
                  borderColor: 'success.main',
                }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom color="success.dark">
                    Verification Status:
                  </Typography>
                  <Stack spacing={2} sx={{ mt: 2 }}>
                    {[
                      { title: '✓ Location Verified', desc: 'You are at the correct location' },
                      { title: '✓ Liveness Verified', desc: 'Real person detected' },
                      { title: '✓ Face Recognized', desc: `Match confidence: ${matchConfidence}%` }
                    ].map((item, i) => (
                      <Stack key={i} direction="row" alignItems="center" spacing={2}>
                        <CheckCircle color="success" sx={{ fontSize: 28 }} />
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold" color="success.dark">{item.title}</Typography>
                          <Typography variant="caption" color="text.secondary">{item.desc}</Typography>
                        </Box>
                      </Stack>
                    ))}
                  </Stack>
                </Paper>

                <Stack direction="row" spacing={2}>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => navigate('/attendance/face-capture')}
                    startIcon={<ArrowBack />}
                    sx={{ borderRadius: 3, borderWidth: 2, '&:hover': { borderWidth: 2 } }}
                  >
                    Retake
                  </Button>
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    onClick={() => navigate('/attendance/success')}
                    startIcon={<CheckCircle />}
                    sx={{
                      py: 1.5,
                      borderRadius: 3,
                      background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      '&:hover': { background: 'linear-gradient(135deg, #38f9d7 0%, #43e97b 100%)' },
                      boxShadow: '0 6px 24px rgba(67, 233, 123, 0.4)'
                    }}
                  >
                    Confirm & Submit Attendance
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </motion.div>
      </Box>
    </Box>
  );
};

export default Confirmation;
