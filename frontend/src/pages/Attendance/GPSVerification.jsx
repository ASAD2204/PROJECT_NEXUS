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
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  MyLocation,
  CheckCircle,
  LocationOn,
  ArrowForward,
  ArrowBack,
  Map as MapIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { attendanceAPI } from '../../api/attendance';

const GPSVerification = () => {
  const navigate = useNavigate();
  const [locationVerified, setLocationVerified] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [distanceMeters, setDistanceMeters] = useState(null);

  const selectedCourse = JSON.parse(sessionStorage.getItem('selectedCourse') || '{}');

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const verifyLocation = async () => {
    setLocationLoading(true);
    try {
      const geo = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          reject,
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });
      setUserLocation(geo);
      const res = await attendanceAPI.checkGPS({
        course_id: selectedCourse.id,
        lat: geo.lat,
        lng: geo.lng,
      });
      const ok = Boolean(res.data?.verified ?? res.data?.is_verified ?? true);
      setDistanceMeters(
        res.data?.distance_meters ??
        res.data?.distance ??
        null
      );
      setLocationVerified(ok);
      if (ok) setTimeout(() => navigate('/attendance/liveness-detection'), 1000);
    } catch (e) {
      console.error(e);
      setLocationVerified(false);
    } finally {
      setLocationLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: 'calc(100vh - 64px)', pb: 4 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4, pt: 3 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          GPS Location Verification
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Step 2 of 6: Verify Your Location
        </Typography>
      </Box>

      {/* Main Content */}
      <Grid container spacing={3} sx={{ maxWidth: 1200, mx: 'auto' }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Location Verification
                </Typography>
                <Divider sx={{ mb: 3 }} />

                {/* Beautiful Map Placeholder like original */}
                <Box
                  sx={{
                    position: 'relative',
                    height: 400,
                    bgcolor: '#e0e0e0',
                    background: locationVerified
                      ? 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)'
                      : '#e0e0e0',
                    borderRadius: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    transition: 'all 0.5s ease',
                    mb: 3,
                  }}
                >
                  <MapIcon sx={{ fontSize: 100, color: '#9e9e9e' }} />
                  
                  {/* Pulsing location pin like original */}
                  {locationVerified && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        animation: 'ping 1s ease-out',
                        '@keyframes ping': {
                          '0%': { transform: 'translate(-50%, -50%) scale(0)', opacity: 1 },
                          '100%': { transform: 'translate(-50%, -50%) scale(2)', opacity: 0 },
                        },
                      }}
                    >
                      <Box
                        sx={{
                          width: 60,
                          height: 60,
                          borderRadius: '50%',
                          bgcolor: 'success.main',
                          border: '4px solid white',
                        }}
                      />
                    </Box>
                  )}
                </Box>

                {/* GPS Info */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="caption" color="text.secondary">
                          GPS Coordinates
                        </Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {userLocation
                            ? `${userLocation.lat.toFixed(4)}° N, ${userLocation.lng.toFixed(4)}° E`
                            : 'Not verified yet'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="caption" color="text.secondary">
                          Distance from Class
                        </Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {distanceMeters !== null ? `${Math.round(distanceMeters)} meters` : 'Not available'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {/* Status Indicator */}
                <Alert
                  severity={locationVerified ? 'success' : 'info'}
                  icon={locationVerified ? <CheckCircle /> : locationLoading ? <CircularProgress size={20} /> : <MyLocation />}
                  sx={{ borderRadius: 2 }}
                >
                  {locationVerified ? (
                    <>
                      <strong>Location Verified</strong>
                      <br />
                      You are in {selectedCourse.room} - Ready to proceed
                    </>
                  ) : (
                    <>
                      <strong>{locationLoading ? 'Verifying Location...' : 'Ready to Verify'}</strong>
                      <br />
                      {locationLoading
                        ? 'Please wait while we confirm your location'
                        : 'Click the button below to verify your GPS location'}
                    </>
                  )}
                </Alert>

                <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => navigate('/attendance/smart-attendance')}
                    startIcon={<ArrowBack />}
                    sx={{ borderRadius: 2 }}
                  >
                    Back
                  </Button>
                  {!locationVerified && (
                    <Button
                      variant="contained"
                      size="large"
                      fullWidth
                      onClick={verifyLocation}
                      disabled={locationLoading}
                      startIcon={
                        locationLoading ? (
                          <CircularProgress size={20} color="inherit" />
                        ) : (
                          <MyLocation />
                        )
                      }
                      sx={{ py: 1.5, borderRadius: 2 }}
                    >
                      {locationLoading ? 'Verifying Location...' : 'Verify My Location'}
                    </Button>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        {/* Info Sidebar like original */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Why Location?
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" color="text.secondary" paragraph>
                We verify your location to ensure you're physically present in the classroom.
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                You must be within <strong>50 meters</strong> of the class location to mark attendance.
              </Typography>
              
              <Paper sx={{ p: 2, bgcolor: 'primary.lighter', mt: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Selected Course
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedCourse.code} - {selectedCourse.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  {selectedCourse.time} • {selectedCourse.room}
                </Typography>
              </Paper>

              {locationVerified && (
                <Alert severity="success" sx={{ mt: 2, borderRadius: 2 }}>
                  <Typography variant="body2" fontWeight="bold">
                    Ready to Continue!
                  </Typography>
                  <Typography variant="caption">
                    Proceeding to liveness detection...
                  </Typography>
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default GPSVerification;
