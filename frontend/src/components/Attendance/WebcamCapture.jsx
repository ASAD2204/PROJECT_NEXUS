import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Box, IconButton, Typography, CircularProgress, Alert } from '@mui/material';
import { CameraAlt, FlipCameraIos, VideocamOff } from '@mui/icons-material';

/**
 * A reusable Webcam component using native MediaDevices API.
 */
const WebcamCapture = ({ onCapture, autoStart = true, overlay = null }) => {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const startCamera = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const constraints = {
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Webcam access error:', err);
      setError('Could not access camera. Please ensure permissions are granted.');
    } finally {
      setLoading(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    setStream(prevStream => {
      if (prevStream) {
        prevStream.getTracks().forEach(track => track.stop());
      }
      return null;
    });
  }, []);

  useEffect(() => {
    if (autoStart) {
      startCamera();
    }
    return () => stopCamera();
  }, [autoStart, startCamera, stopCamera]);

  const captureFrame = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    
    // Flip horizontally for "mirror" effect
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    
    ctx.drawImage(videoRef.current, 0, 0);
    
    // Get base64 (stripped of prefix for backend if needed, but standard is with prefix)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    onCapture(dataUrl);
  };

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 400,
        bgcolor: '#000',
        borderRadius: 3,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {loading && <CircularProgress color="primary" />}
      
      {error && (
        <Box sx={{ p: 3, textAlign: 'center', color: 'white' }}>
          <VideocamOff sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
          <Typography variant="body1" gutterBottom>{error}</Typography>
          <IconButton onClick={startCamera} sx={{ color: 'white', mt: 1 }}>
            <FlipCameraIos />
          </IconButton>
        </Box>
      )}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: 'scaleX(-1)' // Mirror effect
        }}
      />

      {/* Optional HUD/Overlay */}
      {overlay}

      {stream && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10
          }}
        >
          <IconButton
            onClick={captureFrame}
            sx={{
              width: 72,
              height: 72,
              bgcolor: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)',
              border: '4px solid white',
              color: 'white',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.4)',
                transform: 'scale(1.1)'
              },
              transition: 'all 0.2s'
            }}
          >
            <CameraAlt sx={{ fontSize: 32 }} />
          </IconButton>
        </Box>
      )}
    </Box>
  );
};

export default WebcamCapture;
