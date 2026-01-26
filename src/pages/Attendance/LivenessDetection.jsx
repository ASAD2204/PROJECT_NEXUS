import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Visibility,
  Mic,
  CheckCircle,
  ArrowForward,
  ArrowBack,
  VisibilityOff,
  RemoveRedEye,
  Face,
  Lightbulb,
  Camera,
  CheckCircleOutline,
  RadioButtonUnchecked,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const LivenessDetection = () => {
  const navigate = useNavigate();
  const [livenessMethod, setLivenessMethod] = useState('eyes');
  const [livenessStep, setLivenessStep] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const [goodLighting, setGoodLighting] = useState(false);
  const [livenessVerified, setLivenessVerified] = useState(false);

  // Mock camera simulation - no actual camera access needed
  useEffect(() => {
    console.log('Mock camera initialized for frontend demo');
  }, []);

  // Simulate face detection and lighting checks
  useEffect(() => {
    if (livenessStep === 1) {
      setTimeout(() => setFaceDetected(true), 800);
      setTimeout(() => setGoodLighting(true), 1200);
    }
  }, [livenessStep]);

  const handleMethodChange = (event, newMethod) => {
    if (newMethod !== null) {
      setLivenessMethod(newMethod);
      setLivenessStep(0);
      setFaceDetected(false);
      setGoodLighting(false);
      setLivenessVerified(false);
    }
  };

  const handleCapture = () => {
    setLivenessVerified(true);
    setTimeout(() => {
      navigate('/attendance/face-capture');
    }, 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Box className="page-container">
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2,
            }}
          >
            <Visibility sx={{ fontSize: 40, color: 'white' }} />
          </Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Liveness Detection
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Verify you're a real person, not a photo
          </Typography>
        </Box>

        <Card sx={{ maxWidth: 900, mx: 'auto' }}>
          <CardContent sx={{ p: 4 }}>
            {/* Method Selection */}
            {livenessStep === 0 && (
              <Stack spacing={3}>
                <Box>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Choose Verification Method
                  </Typography>
                  <ToggleButtonGroup
                    value={livenessMethod}
                    exclusive
                    onChange={handleMethodChange}
                    fullWidth
                    sx={{ mb: 3 }}
                  >
                    <ToggleButton value="eyes" sx={{ py: 2 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Visibility />
                        <Typography>Eye Blink</Typography>
                      </Stack>
                    </ToggleButton>
                    <ToggleButton value="voice" sx={{ py: 2 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Mic />
                        <Typography>Voice</Typography>
                      </Stack>
                    </ToggleButton>
                  </ToggleButtonGroup>

                  <Paper sx={{ p: 3, bgcolor: 'info.lighter' }}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      Instructions:
                    </Typography>
                    <List dense>
                      {livenessMethod === 'eyes' ? (
                        <>
                          <ListItem>
                            <ListItemIcon>
                              <RemoveRedEye color="primary" />
                            </ListItemIcon>
                            <ListItemText primary="Position your face in the frame" />
                          </ListItem>
                          <ListItem>
                            <ListItemIcon>
                              <VisibilityOff color="primary" />
                            </ListItemIcon>
                            <ListItemText primary="First, close both eyes for 2 seconds" />
                          </ListItem>
                          <ListItem>
                            <ListItemIcon>
                              <Visibility color="primary" />
                            </ListItemIcon>
                            <ListItemText primary="Then, open your eyes and look at camera" />
                          </ListItem>
                        </>
                      ) : (
                        <>
                          <ListItem>
                            <ListItemIcon>
                              <Mic color="primary" />
                            </ListItemIcon>
                            <ListItemText primary="Say: 'I am marking my attendance'" />
                          </ListItem>
                          <ListItem>
                            <ListItemIcon>
                              <Face color="primary" />
                            </ListItemIcon>
                            <ListItemText primary="Speak clearly and naturally" />
                          </ListItem>
                        </>
                      )}
                      <ListItem>
                        <ListItemIcon>
                          <Lightbulb color="primary" />
                        </ListItemIcon>
                        <ListItemText primary="Ensure good lighting" />
                      </ListItem>
                    </List>
                  </Paper>
                </Box>

                <Stack direction="row" spacing={2}>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => navigate('/attendance/gps-verification')}
                    startIcon={<ArrowBack />}
                    sx={{ borderRadius: 2 }}
                  >
                    Back
                  </Button>
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    onClick={() => setLivenessStep(1)}
                    startIcon={livenessMethod === 'eyes' ? <Visibility /> : <Mic />}
                    sx={{ py: 1.5, borderRadius: 2 }}
                  >
                    Start {livenessMethod === 'eyes' ? 'Eye Blink' : 'Voice'} Test
                  </Button>
                </Stack>
              </Stack>
            )}

            {/* Eye Blink Method */}
            {livenessStep === 1 && livenessMethod === 'eyes' && (
              <Stack spacing={3}>
                <Paper sx={{ p: 2, bgcolor: 'error.lighter', textAlign: 'center' }}>
                  <Typography variant="h6" fontWeight="bold" color="error.main" gutterBottom>
                    Step 1: Close Your Eyes
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Close both eyes and hold for 2 seconds
                  </Typography>
                </Paper>

                {/* Beautiful camera frame like original */}
                <Box
                  sx={{
                    position: 'relative',
                    height: 450,
                    bgcolor: '#1a1a1a',
                    borderRadius: 3,
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Camera sx={{ fontSize: 80, color: '#666', opacity: 0.3 }} />

                  {/* Face Detection Box with corner circles like original */}
                  <Box
                    sx={{
                      position: 'absolute',
                      width: 250,
                      height: 330,
                      border: '4px solid #f44336',
                      borderRadius: 3,
                      animation: 'scanPulse 2s infinite',
                      '@keyframes scanPulse': {
                        '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                        '50%': { opacity: 0.8, transform: 'scale(1.02)' },
                      },
                    }}
                  >
                    {/* Animated corner circles */}
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
                          bgcolor: '#f44336',
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

                  {/* Scanning line */}
                  <Box
                    sx={{
                      position: 'absolute',
                      width: 250,
                      height: 2,
                      bgcolor: '#f44336',
                      boxShadow: '0 0 10px #f44336',
                      animation: 'scan 2s linear infinite',
                      '@keyframes scan': {
                        '0%': { top: '30%' },
                        '100%': { top: '70%' },
                      },
                    }}
                  />
                </Box>

                {/* Status Checks */}
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Status Checks
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      {faceDetected ? (
                        <CheckCircleOutline color="success" />
                      ) : (
                        <RadioButtonUnchecked color="disabled" />
                      )}
                      <Typography variant="body2">Face Detected</Typography>
                    </Stack>
                    <Stack direction="row" spacing={2} alignItems="center">
                      {goodLighting ? (
                        <CheckCircleOutline color="success" />
                      ) : faceDetected ? (
                        <CircularProgress size={20} />
                      ) : (
                        <RadioButtonUnchecked color="disabled" />
                      )}
                      <Typography variant="body2">Good Lighting</Typography>
                    </Stack>
                  </Stack>
                </Paper>

                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  onClick={() => setLivenessStep(2)}
                  disabled={!goodLighting}
                  endIcon={<CheckCircle />}
                  sx={{ py: 1.5, borderRadius: 2 }}
                >
                  Capture Eyes Closed
                </Button>
              </Stack>
            )}

            {livenessStep === 2 && livenessMethod === 'eyes' && (
              <Stack spacing={3}>
                <Paper sx={{ p: 2, bgcolor: 'success.lighter', textAlign: 'center' }}>
                  <Typography variant="h6" fontWeight="bold" color="success.main" gutterBottom>
                    Step 2: Open Your Eyes
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Look directly at the camera
                  </Typography>
                </Paper>

                {/* Beautiful camera frame with green for success */}
                <Box
                  sx={{
                    position: 'relative',
                    height: 450,
                    bgcolor: '#1a1a1a',
                    borderRadius: 3,
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Camera sx={{ fontSize: 80, color: '#666', opacity: 0.3 }} />

                  {/* Face Detection Box - GREEN */}
                  <Box
                    sx={{
                      position: 'absolute',
                      width: 250,
                      height: 330,
                      border: '4px solid #059669',
                      borderRadius: 3,
                      animation: 'scanPulse 2s infinite',
                    }}
                  >
                    {/* Animated corner circles */}
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
                          bgcolor: '#059669',
                          animation: 'cornerPulse 1s infinite',
                          animationDelay: `${i * 0.2}s`,
                        }}
                      />
                    ))}
                  </Box>

                  {/* Scanning line - GREEN */}
                  <Box
                    sx={{
                      position: 'absolute',
                      width: 250,
                      height: 2,
                      bgcolor: '#059669',
                      boxShadow: '0 0 10px #059669',
                      animation: 'scan 2s linear infinite',
                    }}
                  />
                </Box>

                {livenessVerified && (
                  <Alert severity="success" sx={{ borderRadius: 2 }}>
                    <Typography variant="body1" fontWeight="bold">
                      Liveness Verified! ✓
                    </Typography>
                    <Typography variant="body2">
                      Proceeding to face capture...
                    </Typography>
                  </Alert>
                )}

                <Button
                  variant="contained"
                  color="success"
                  size="large"
                  fullWidth
                  onClick={handleCapture}
                  endIcon={<ArrowForward />}
                  sx={{ py: 1.5, borderRadius: 2 }}
                >
                  Capture & Continue
                </Button>
              </Stack>
            )}

            {/* Voice Method */}
            {livenessStep === 1 && livenessMethod === 'voice' && (
              <Stack spacing={3}>
                <Paper sx={{ p: 2, bgcolor: 'info.lighter', textAlign: 'center' }}>
                  <Typography variant="h6" fontWeight="bold" color="info.main" gutterBottom>
                    Say: "I am marking my attendance"
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Speak clearly into your microphone
                  </Typography>
                </Paper>

                {/* Voice visualization */}
                <Box
                  sx={{
                    position: 'relative',
                    height: 450,
                    bgcolor: '#1a1a1a',
                    borderRadius: 3,
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Box
                    sx={{
                      width: 140,
                      height: 140,
                      borderRadius: '50%',
                      border: '4px solid',
                      borderColor: 'info.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'rgba(33, 150, 243, 0.1)',
                      animation: 'pulse 2s infinite',
                      '@keyframes pulse': {
                        '0%, 100%': { transform: 'scale(1)', opacity: 1 },
                        '50%': { transform: 'scale(1.1)', opacity: 0.8 },
                      },
                    }}
                  >
                    <Mic sx={{ fontSize: 60, color: 'info.main' }} />
                  </Box>

                  {/* Audio wave bars */}
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                      position: 'absolute',
                      bottom: 60,
                      alignItems: 'flex-end',
                    }}
                  >
                    {[1, 2, 3, 4, 5].map((bar) => (
                      <Box
                        key={bar}
                        sx={{
                          width: 8,
                          height: 30,
                          bgcolor: 'info.main',
                          borderRadius: 1,
                          animation: 'wave 1s ease-in-out infinite',
                          animationDelay: `${bar * 0.1}s`,
                          '@keyframes wave': {
                            '0%, 100%': { height: '20px' },
                            '50%': { height: '100px' },
                          },
                        }}
                      />
                    ))}
                  </Stack>
                </Box>

                {livenessVerified && (
                  <Alert severity="success" sx={{ borderRadius: 2 }}>
                    <Typography variant="body1" fontWeight="bold">
                      Voice Verified! ✓
                    </Typography>
                    <Typography variant="body2">
                      Proceeding to face capture...
                    </Typography>
                  </Alert>
                )}

                <Stack direction="row" spacing={2}>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => setLivenessStep(0)}
                    sx={{ borderRadius: 2 }}
                  >
                    Retry
                  </Button>
                  <Button
                    variant="contained"
                    color="success"
                    size="large"
                    fullWidth
                    onClick={handleCapture}
                    endIcon={<ArrowForward />}
                    sx={{ py: 1.5, borderRadius: 2 }}
                  >
                    Verify & Continue
                  </Button>
                </Stack>
              </Stack>
            )}
          </CardContent>
        </Card>
      </Box>
    </motion.div>
  );
};

export default LivenessDetection;
