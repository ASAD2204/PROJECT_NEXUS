import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  IconButton,
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
  FiberManualRecord,
  Stop,
  GraphicEq,
  VolumeUp,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { attendanceAPI } from '../../api/attendance';
import WebcamCapture from '../../components/Attendance/WebcamCapture';

const LivenessDetection = () => {
  const navigate = useNavigate();
  const [livenessMethod, setLivenessMethod] = useState('eyes');
  const [livenessStep, setLivenessStep] = useState(0); // 0: Select, 1: Process
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [livenessVerified, setLivenessVerified] = useState(false);

  // Eye Blink State
  const [eyeStep, setEyeStep] = useState(1); // 1: Closed, 2: Open

  // Voice Challenge State
  const [challengeWord, setChallengeWord] = useState('');
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const handleMethodChange = (event, newMethod) => {
    if (newMethod !== null) {
      setLivenessMethod(newMethod);
      setLivenessStep(0);
      setLivenessVerified(false);
      setError('');
    }
  };

  // --- Eye Blink Logic ---
  const onCaptureClosed = async (dataUrl) => {
    setVerifying(true);
    setError('');
    try {
      const base64Data = dataUrl.split(',')[1];
      const res = await attendanceAPI.verifyLiveness({ image_data: base64Data });
      
      if (res.data?.liveness_verified && res.data?.eyes_state === 'Closed') {
        setEyeStep(2); // Move to Step 2: Open Eyes
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

  // --- Voice Logic ---
  const fetchChallenge = async () => {
    try {
      const res = await attendanceAPI.getVoiceChallenge();
      setChallengeWord(res.data.challenge_word);
    } catch (e) {
      setError('Failed to fetch voice challenge.');
    }
  };

  const startRecording = async () => {
    setError('');
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (e) {
      setError('Microphone access denied or not available.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const verifyVoice = async () => {
    if (!audioBlob) return;
    setVerifying(true);
    setError('');
    
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result.split(',')[1];
        const res = await attendanceAPI.verifyVoice({
          audio_data: base64Audio,
          target_word: challengeWord
        });

        if (res.data.voice_verified) {
          setLivenessVerified(true);
          setTimeout(() => navigate('/attendance/face-capture'), 1000);
        } else {
          setError(res.data.detected_text || 'Could not verify voice. Please try again.');
          setAudioBlob(null);
        }
      };
    } catch (e) {
      setError('Voice verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (livenessMethod === 'voice' && livenessStep === 1) {
      fetchChallenge();
    }
  }, [livenessMethod, livenessStep]);

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
            {livenessMethod === 'eyes' ? (
              <Visibility sx={{ fontSize: 40, color: 'white' }} />
            ) : (
              <Mic sx={{ fontSize: 40, color: 'white' }} />
            )}
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
                        <Typography>Voice Challenge</Typography>
                      </Stack>
                    </ToggleButton>
                  </ToggleButtonGroup>

                  <Paper sx={{ p: 3, bgcolor: 'info.lighter' }}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      Instructions:
                    </Typography>
                    {livenessMethod === 'eyes' ? (
                      <List dense>
                        <ListItem>
                          <ListItemIcon><RemoveRedEye color="primary" /></ListItemIcon>
                          <ListItemText primary="Position your face in the frame" />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><VisibilityOff color="primary" /></ListItemIcon>
                          <ListItemText primary="First, close both eyes and capture" />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><Visibility color="primary" /></ListItemIcon>
                          <ListItemText primary="Then, open your eyes and capture again" />
                        </ListItem>
                      </List>
                    ) : (
                      <List dense>
                        <ListItem>
                          <ListItemIcon><VolumeUp color="primary" /></ListItemIcon>
                          <ListItemText primary="A random word will be displayed" />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><Mic color="primary" /></ListItemIcon>
                          <ListItemText primary="Click Record and say the word clearly" />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><CheckCircleOutline color="primary" /></ListItemIcon>
                          <ListItemText primary="Submit for verification" />
                        </ListItem>
                      </List>
                    )}
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
                    Start {livenessMethod === 'eyes' ? 'Eye Blink Test' : 'Voice Test'}
                  </Button>
                </Stack>
              </Stack>
            )}

            {/* Eye Blink Implementation */}
            {livenessStep === 1 && livenessMethod === 'eyes' && (
              <Stack spacing={3}>
                <Paper sx={{ p: 2, bgcolor: eyeStep === 1 ? 'error.lighter' : 'success.lighter', textAlign: 'center' }}>
                  <Typography variant="h6" fontWeight="bold" color={eyeStep === 1 ? 'error.main' : 'success.main'} gutterBottom>
                    Step {eyeStep}: {eyeStep === 1 ? 'Close Your Eyes' : 'Open Your Eyes'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {eyeStep === 1 ? 'Close both eyes tightly and click capture' : 'Now open your eyes and look at the camera'}
                  </Typography>
                </Paper>

                <Box sx={{ height: 450 }}>
                  <WebcamCapture 
                    onCapture={eyeStep === 1 ? onCaptureClosed : onCaptureOpen}
                    overlay={
                      <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <Box sx={{ width: 250, height: 330, border: `4px solid ${eyeStep === 1 ? '#f44336' : '#059669'}`, borderRadius: 3, opacity: 0.5 }} />
                      </Box>
                    }
                  />
                </Box>

                {verifying && <CircularProgress sx={{ alignSelf: 'center' }} />}
                {error && <Alert severity="error">{error}</Alert>}
                {livenessVerified && <Alert severity="success">Liveness Verified! Proceeding...</Alert>}

                <Button variant="text" onClick={() => setLivenessStep(0)}>Cancel / Change Method</Button>
              </Stack>
            )}

            {/* Voice Challenge Implementation */}
            {livenessStep === 1 && livenessMethod === 'voice' && (
              <Stack spacing={4} alignItems="center">
                <Paper sx={{ p: 4, width: '100%', textAlign: 'center', bgcolor: 'background.neutral', borderRadius: 4, border: '2px dashed', borderColor: 'divider' }}>
                  <Typography variant="overline" color="text.secondary">Speak this word:</Typography>
                  <Typography variant="h2" fontWeight="800" color="primary" sx={{ letterSpacing: 2, my: 2 }}>
                    {challengeWord || <CircularProgress size={40} />}
                  </Typography>
                </Paper>

                <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                  <AnimatePresence>
                    {recording && (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1.5, opacity: 0.2 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        style={{
                          position: 'absolute',
                          width: 100,
                          height: 100,
                          borderRadius: '50%',
                          backgroundColor: '#f44336',
                        }}
                      />
                    )}
                  </AnimatePresence>
                  
                  <IconButton
                    size="large"
                    color={recording ? 'error' : 'primary'}
                    onClick={recording ? stopRecording : startRecording}
                    sx={{
                      width: 100,
                      height: 100,
                      bgcolor: recording ? 'error.main' : 'primary.main',
                      color: 'white',
                      '&:hover': { bgcolor: recording ? 'error.dark' : 'primary.dark' },
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
                    }}
                  >
                    {recording ? <Stop sx={{ fontSize: 40 }} /> : <Mic sx={{ fontSize: 40 }} />}
                  </IconButton>
                </Box>

                <Typography variant="body1" fontWeight="medium">
                  {recording ? 'Recording... Speak now' : audioBlob ? 'Recording captured!' : 'Click the mic to start'}
                </Typography>

                {audioBlob && !verifying && (
                  <Button
                    variant="contained"
                    size="large"
                    onClick={verifyVoice}
                    startIcon={<CheckCircle />}
                    sx={{ px: 6, borderRadius: 10 }}
                  >
                    Verify Recording
                  </Button>
                )}

                {verifying && (
                  <Stack direction="row" spacing={2} alignItems="center">
                    <CircularProgress size={24} />
                    <Typography>Transcribing audio...</Typography>
                  </Stack>
                )}

                {error && <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>}
                {livenessVerified && <Alert severity="success" sx={{ width: '100%' }}>Voice Verified! Proceeding...</Alert>}

                <Stack direction="row" spacing={2}>
                   <Button variant="text" onClick={fetchChallenge}>Get New Word</Button>
                   <Divider orientation="vertical" flexItem />
                   <Button variant="text" onClick={() => setLivenessStep(0)}>Change Method</Button>
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
