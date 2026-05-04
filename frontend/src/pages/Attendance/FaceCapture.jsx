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
import { attendanceAPI } from '../../api/attendance';
import WebcamCapture from '../../components/Attendance/WebcamCapture';

const FaceCapture = () => {
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState('');

  const selectedCourse = JSON.parse(sessionStorage.getItem('selectedCourse') || '{}');

  const onCapture = async (dataUrl) => {
    setVerifying(true);
    setError('');
    setConfidence(0);
    
    // Animate confidence bar for visual effect
    const interval = setInterval(() => {
      setConfidence(prev => (prev < 90 ? prev + 10 : prev));
    }, 100);

    try {
      const base64Data = dataUrl.split(',')[1];
      const payload = {
        image_data: base64Data,
        section_id: selectedCourse.id || 1
      };
      
      const res = await attendanceAPI.verifyFace(payload);
      
      clearInterval(interval);
      setConfidence(100);
      
      if (res.data?.attendance_marked) {
        sessionStorage.setItem('capturedFace', dataUrl);
        sessionStorage.setItem('matchConfidence', res.data?.confidence || 100);
        setTimeout(() => navigate('/attendance/confirmation'), 1000);
      } else {
        setError('Face match failed. Please ensure you are enrolled and in focus.');
      }
    } catch (e) {
      console.error(e);
      clearInterval(interval);
      const detail = e.response?.data?.detail;
      setError(detail || 'Verification service error. Please try again.');
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
            <CameraAlt sx={{ fontSize: 40, color: 'white' }} />
          </Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Face Capture
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Position your face in the frame and click to capture
          </Typography>
        </Box>

        <Grid container spacing={3} sx={{ maxWidth: 1200, mx: 'auto' }}>
          {/* Camera Section */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <Box sx={{ height: 450 }}>
                    <WebcamCapture 
                      onCapture={onCapture}
                      overlay={
                        <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                           <Box sx={{ 
                             width: 250, 
                             height: 330, 
                             border: '4px solid #059669', 
                             borderRadius: 3, 
                             animation: 'scanPulse 2s infinite' 
                           }} />
                        </Box>
                      }
                    />
                  </Box>

                  {/* Confidence Meter */}
                  {(verifying || confidence > 0) && (
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
                  )}

                  {error && <Alert severity="error">{error}</Alert>}

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
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Instructions Sidebar */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Instructions
                </Typography>
                <Divider sx={{ my: 1 }} />
                <List dense>
                  <ListItem>
                    <ListItemIcon><RemoveRedEye color="primary" /></ListItemIcon>
                    <ListItemText primary="Look straight at camera" primaryTypographyProps={{ variant: 'body2' }} />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Lightbulb color="primary" /></ListItemIcon>
                    <ListItemText primary="Ensure good lighting" primaryTypographyProps={{ variant: 'body2' }} />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Face color="primary" /></ListItemIcon>
                    <ListItemText primary="Stay still for capture" primaryTypographyProps={{ variant: 'body2' }} />
                  </ListItem>
                </List>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Session Info
                </Typography>
                <Paper sx={{ p: 2, bgcolor: 'primary.lighter' }}>
                  <Typography variant="body2" fontWeight="bold">{selectedCourse.code}</Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {selectedCourse.title}
                  </Typography>
                </Paper>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </motion.div>
  );
};

export default FaceCapture;
