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
import { attendanceAPI } from '../../api/attendance';
import WebcamCapture from '../../components/Attendance/WebcamCapture';

const LivenessDetection = () => {
  const navigate = useNavigate();
  const [livenessMethod, setLivenessMethod] = useState('eyes');
  const [livenessStep, setLivenessStep] = useState(0); // 0: Select, 1: Closed Eyes, 2: Open Eyes
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [livenessVerified, setLivenessVerified] = useState(false);

  const handleMethodChange = (event, newMethod) => {
    if (newMethod !== null) {
      setLivenessMethod(newMethod);
      setLivenessStep(0);
      setLivenessVerified(false);
      setError('');
    }
  };

  const onCaptureClosed = async (dataUrl) => {
    setVerifying(true);
    setError('');
    try {
      // Send to backend to verify eyes are CLOSED
      const base64Data = dataUrl.split(',')[1];
      const res = await attendanceAPI.verifyLiveness({ image_data: base64Data });
      
      if (res.data?.liveness_verified && res.data?.eyes_state === 'Closed') {
        setLivenessStep(2); // Move to Step 2: Open Eyes
      } else {
        setError(res.data?.eyes_state === 'No Face' ? 'No face detected. Please reposition.' : 'Please close your eyes tightly for liveness proof.');
      }
    } catch (e) {
      console.error(e);
      setError('Liveness verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const onCaptureOpen = async (dataUrl) => {
    setVerifying(true);
    setError('');
    try {
      // Send to backend to verify eyes are OPEN
      const base64Data = dataUrl.split(',')[1];
      const res = await attendanceAPI.verifyLiveness({ image_data: base64Data });
      
      if (res.data?.eyes_state === 'Open') {
        setLivenessVerified(true);
        setTimeout(() => navigate('/attendance/face-capture'), 1000);
      } else {
        setError('Please open your eyes and look at the camera.');
      }
    } catch (e) {
      console.error(e);
      setError('Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
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
                    <ToggleButton value="voice" disabled sx={{ py: 2 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Mic />
                        <Typography>Voice (Coming Soon)</Typography>
                      </Stack>
                    </ToggleButton>
                  </ToggleButtonGroup>

                  <Paper sx={{ p: 3, bgcolor: 'info.lighter' }}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      Instructions:
                    </Typography>
                    <List dense>
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
                        <ListItemText primary="First, close both eyes and capture" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <Visibility color="primary" />
                        </ListItemIcon>
                        <ListItemText primary="Then, open your eyes and capture again" />
                      </ListItem>
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
                    startIcon={<Visibility />}
                    sx={{ py: 1.5, borderRadius: 2 }}
                  >
                    Start Eye Blink Test
                  </Button>
                </Stack>
              </Stack>
            )}

            {/* Step 1: Closed Eyes */}
            {livenessStep === 1 && (
              <Stack spacing={3}>
                <Paper sx={{ p: 2, bgcolor: 'error.lighter', textAlign: 'center' }}>
                  <Typography variant="h6" fontWeight="bold" color="error.main" gutterBottom>
                    Step 1: Close Your Eyes
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Close both eyes tightly and click capture
                  </Typography>
                </Paper>

                <Box sx={{ height: 450 }}>
                  <WebcamCapture 
                    onCapture={onCaptureClosed}
                    overlay={
                      <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <Box sx={{ width: 250, height: 330, border: '4px solid #f44336', borderRadius: 3, opacity: 0.5 }} />
                      </Box>
                    }
                  />
                </Box>

                {verifying && <CircularProgress sx={{ alignSelf: 'center' }} />}
                {error && <Alert severity="error">{error}</Alert>}

                <Button variant="text" onClick={() => setLivenessStep(0)}>Cancel</Button>
              </Stack>
            )}

            {/* Step 2: Open Eyes */}
            {livenessStep === 2 && (
              <Stack spacing={3}>
                <Paper sx={{ p: 2, bgcolor: 'success.lighter', textAlign: 'center' }}>
                  <Typography variant="h6" fontWeight="bold" color="success.main" gutterBottom>
                    Step 2: Open Your Eyes
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Now open your eyes and look at the camera
                  </Typography>
                </Paper>

                <Box sx={{ height: 450 }}>
                  <WebcamCapture 
                    onCapture={onCaptureOpen}
                    overlay={
                      <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <Box sx={{ width: 250, height: 330, border: '4px solid #059669', borderRadius: 3, opacity: 0.5 }} />
                      </Box>
                    }
                  />
                </Box>

                {verifying && <CircularProgress sx={{ alignSelf: 'center' }} />}
                {error && <Alert severity="error">{error}</Alert>}
                {livenessVerified && <Alert severity="success">Liveness Verified! Proceeding...</Alert>}

                <Button variant="text" onClick={() => setLivenessStep(1)}>Retry Closed Eyes</Button>
              </Stack>
            )}
          </CardContent>
        </Card>
      </Box>
    </motion.div>
  );
};

export default LivenessDetection;
