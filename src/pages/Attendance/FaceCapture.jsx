import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Paper,
  Alert,
  Stack,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import {
  CameraAlt,
  CheckCircle,
  ArrowForward,
  ArrowBack,
  Camera,
  RemoveRedEye,
  Lightbulb,
  Face,
  CheckCircleOutline,
  RadioButtonUnchecked,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import Grid from '@mui/material/Grid';

const FaceCapture = () => {
  const navigate = useNavigate();
  const [cameraActive, setCameraActive] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const [goodLighting, setGoodLighting] = useState(false);
  const [livenessVerified, setLivenessVerified] = useState(false);

  // Mock camera start with confidence animation like original
  useEffect(() => {
    if (cameraActive) {
      console.log('Mock camera started for frontend demo');
      // Simulate status checks
      setTimeout(() => setFaceDetected(true), 800);
      setTimeout(() => setGoodLighting(true), 1200);
      setTimeout(() => setLivenessVerified(true), 1600);
      
      // Animate confidence like original
      let current = 0;
      const interval = setInterval(() => {
        current += 5;
        setConfidence(current);
        if (current >= 95) clearInterval(interval);
      }, 50);
      return () => clearInterval(interval);
    }
  }, [cameraActive]);

  const captureFace = () => {
    // Create a mock SVG image for demo
    const mockImage =
      'data:image/svg+xml;base64,' +
      btoa(`
        <svg width="400" height="500" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="500" fill="#1a1a1a"/>
          <circle cx="200" cy="250" r="80" fill="#667eea"/>
          <text x="200" y="260" text-anchor="middle" fill="white" font-size="20">Face Captured</text>
        </svg>
      `);
    sessionStorage.setItem('capturedFace', mockImage);
    navigate('/attendance/confirmation');
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
            <CameraAlt sx={{ fontSize: 40, color: 'white' }} />
          </Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Face Capture
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Position your face in the frame and capture
          </Typography>
        </Box>

        <Grid container spacing={3} sx={{ maxWidth: 1200, mx: 'auto' }}>
          {/* Camera Section */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                {!cameraActive ? (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <Camera sx={{ fontSize: 100, color: 'text.secondary', opacity: 0.3, mb: 3 }} />
                    <Typography variant="h6" gutterBottom>
                      Ready to Capture Your Face
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Make sure you're in a well-lit area
                    </Typography>
                    <Button
                      variant="contained"
                      size="large"
                      onClick={() => setCameraActive(true)}
                      startIcon={<CameraAlt />}
                      sx={{ py: 1.5, px: 4, borderRadius: 2 }}
                    >
                      Start Camera
                    </Button>
                  </Box>
                ) : (
                  <Stack spacing={2}>
                    {/* Beautiful camera frame like original with detection box */}
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
                          border: '4px solid #4caf50',
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
                              bgcolor: '#4caf50',
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
                          bgcolor: '#4caf50',
                          boxShadow: '0 0 10px #4caf50',
                          animation: 'scan 2s linear infinite',
                          '@keyframes scan': {
                            '0%': { top: '30%' },
                            '100%': { top: '70%' },
                          },
                        }}
                      />
                    </Box>

                    {/* Confidence Meter like original */}
                    <Box>
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

                    <Stack direction="row" spacing={2}>
                      <Button
                        variant="outlined"
                        size="large"
                        onClick={() => navigate('/attendance/liveness-detection')}
                        startIcon={<ArrowBack />}
                        sx={{ borderRadius: 2 }}
                      >
                        Back
                      </Button>
                      <Button
                        variant="contained"
                        color="success"
                        size="large"
                        fullWidth
                        onClick={captureFace}
                        disabled={confidence < 95}
                        endIcon={<CheckCircle />}
                        sx={{ py: 1.5, borderRadius: 2 }}
                      >
                        Capture & Verify
                      </Button>
                    </Stack>
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Instructions Sidebar - like original */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Instructions
                </Typography>
                <Divider sx={{ my: 1 }} />
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
                      <Face color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Remove glasses if needed"
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CameraAlt color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Stay still for capture"
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

                {confidence >= 95 && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Alert severity="success" sx={{ borderRadius: 2 }}>
                      <Typography variant="body2" fontWeight="bold">
                        Ready to Capture! ✓
                      </Typography>
                      <Typography variant="caption">
                        Confidence: {confidence}%
                      </Typography>
                    </Alert>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </motion.div>
  );
};

export default FaceCapture;
