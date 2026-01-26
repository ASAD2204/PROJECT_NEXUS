import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Box, Card, CardContent, Typography, Button, Stack, Divider } from '@mui/material';
import { CheckCircle, Home } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const AttendanceSuccess = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);
  const selectedCourse = JSON.parse(sessionStorage.getItem('selectedCourse') || '{}');

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // Clear session storage
      sessionStorage.removeItem('selectedCourse');
      sessionStorage.removeItem('capturedFace');
      navigate('/dashboard');
    }
  }, [countdown, navigate]);

  return (
    <Box sx={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', pb: 4 }}>
      <Box sx={{ maxWidth: 700, mx: 'auto', width: '100%', px: 2 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, type: 'spring', stiffness: 150 }}
        >
          <Card
            sx={{
              background: 'linear-gradient(135deg, #059669 0%, #0891B2 100%)',
              color: 'white',
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(5, 150, 105, 0.2)',
            }}
          >
            <CardContent sx={{ py: 8, px: 4 }}>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
              >
                <Box
                  sx={{
                    width: 150,
                    height: 150,
                    borderRadius: '50%',
                    bgcolor: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 4,
                    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                  }}
                >
                  <CheckCircle sx={{ fontSize: 100, color: '#059669' }} />
                </Box>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Typography variant="h3" fontWeight="bold" gutterBottom>
                  Success! ✅
                </Typography>
                <Typography variant="h5" sx={{ opacity: 0.95, mb: 4 }}>
                  Attendance Marked Successfully
                </Typography>

                <Box
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.2)',
                    borderRadius: 3,
                    p: 4,
                    mb: 4,
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <Typography variant="overline" sx={{ opacity: 0.9 }}>
                    Course Information
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mt: 1 }}>
                    {selectedCourse.code} - {selectedCourse.title}
                  </Typography>
                  <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.3)' }} />
                  <Stack spacing={1}>
                    <Typography variant="body1" sx={{ opacity: 0.95 }}>
                      <strong>Date:</strong> {new Date().toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.95 }}>
                      <strong>Time:</strong> {new Date().toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.95 }}>
                      <strong>Location:</strong> {selectedCourse.room}
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.95 }}>
                      <strong>Faculty:</strong> {selectedCourse.faculty}
                    </Typography>
                  </Stack>
                </Box>

                <Typography variant="body1" sx={{ opacity: 0.95, mb: 3 }}>
                  Your attendance has been recorded and verified
                </Typography>

                <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
                  Redirecting to dashboard in <span style={{ fontSize: '2rem' }}>{countdown}</span> seconds...
                </Typography>

                <Button
                  variant="contained"
                  size="large"
                  onClick={() => navigate('/dashboard')}
                  startIcon={<Home />}
                  sx={{
                    bgcolor: 'white',
                    color: '#059669',
                    fontWeight: 'bold',
                    px: 5,
                    py: 1.5,
                    fontSize: '1rem',
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.9)',
                      transform: 'scale(1.05)',
                    },
                    transition: 'all 0.3s',
                  }}
                >
                  Go to Dashboard Now
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </Box>
    </Box>
  );
};

export default AttendanceSuccess;
