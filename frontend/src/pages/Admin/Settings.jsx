import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';    
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Divider,
  Stack,
  Avatar,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Paper,
  alpha,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { 
  Upload, 
  Delete, 
  Image as ImageIcon,
  Save,
  Notifications,
  Security,
  School,
  MyLocation,
  Public,
  RestartAlt,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import PageHeader from '../../components/Common/PageHeader';
import PageTransition from '../../components/Common/PageTransition';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { fadeInUp, staggerContainer } from '../../utils/animations';
import { opsAPI } from '../../api/ops';
import { attendanceAPI } from '../../api/attendance';

const parseGeofenceNumber = (value, fallback) => { 
  if (value === '' || value === null || value === undefined) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? NaN : parsed;      
};

const normalizeGeofence = (payload) => ({
  campus_lat: parseGeofenceNumber(payload?.campus_lat, 32.0853),
  campus_lng: parseGeofenceNumber(payload?.campus_lng, 74.1894),
  max_radius_meters: parseGeofenceNumber(payload?.max_radius_meters, 100),
  source: payload?.source || 'environment',        
});

const Settings = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const fileInputRef = useRef(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [geofenceSaving, setGeofenceSaving] = useState(false);
  const [settings, setSettings] = useState({
    campusName: '',
    campusAddress: '',
    campusEmail: '',
    campusPhone: '',
    passwordMinLength: 8,
    requireSpecialChar: true,
    requireUppercase: true,
    requireNumber: true,
    requireTwoFactor: false,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    emailTemplate: '',
    smsTemplate: '',
    notifyOnFeePayment: true,
    notifyOnAttendance: true,
    notifyOnGrades: true,
  });
  const [geofenceSettings, setGeofenceSettings] = useState({
    campus_lat: 32.0853,
    campus_lng: 74.1894,
    max_radius_meters: 100,
    source: 'environment',
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await opsAPI.getFeatureFlags ? opsAPI.getFeatureFlags() : Promise.resolve({ data: {} });
        const d = res.data;
        if (d && typeof d === 'object' && !Array.isArray(d)) setSettings(prev => ({ ...prev, ...d }));
      } catch (e) { console.error(e); }

      try {
        const geofenceRes = await attendanceAPI.getGeofenceConfig();
        setGeofenceSettings(normalizeGeofence(geofenceRes.data));
      } catch (e) {
        console.error(e);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      if (opsAPI.updateFeatureFlags) await opsAPI.updateFeatureFlags(settings);
      showSnackbar('Settings saved successfully', 'success');
    } catch (e) {
      console.error(e);
      showSnackbar('Failed to save settings', 'error');
    }
  };

  const handleSaveGeofence = async () => {
    const payload = normalizeGeofence(geofenceSettings);
    if (!Number.isFinite(payload.campus_lat) || !Number.isFinite(payload.campus_lng) || !Number.isFinite(payload.max_radius_meters)) {
      showSnackbar('Enter valid geofence coordinates and radius', 'error');
      return;
    }

    if (payload.max_radius_meters <= 0) {
      showSnackbar('Geofence radius must be greater than zero', 'error');
      return;
    }

    setGeofenceSaving(true);
    try {
      const res = await attendanceAPI.updateGeofenceConfig({
        campus_lat: payload.campus_lat,
        campus_lng: payload.campus_lng,
        max_radius_meters: Math.round(payload.max_radius_meters),
      });
      setGeofenceSettings(normalizeGeofence(res.data));
      showSnackbar('Attendance geofence saved', 'success');
    } catch (e) {
      console.error(e);
      showSnackbar(e.response?.data?.detail || 'Failed to save attendance geofence', 'error');
    } finally {
      setGeofenceSaving(false);
    }
  };

  const handleResetGeofence = async () => {        
    setGeofenceSaving(true);
    try {
      const res = await attendanceAPI.resetGeofenceConfig();
      setGeofenceSettings(normalizeGeofence(res.data));
      showSnackbar('Attendance geofence reset to defaults', 'info');
    } catch (e) {
      console.error(e);
      showSnackbar(e.response?.data?.detail || 'Failed to reset attendance geofence', 'error');        
    } finally {
      setGeofenceSaving(false);
    }
  };

  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
        showSnackbar('Logo uploaded successfully', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    showSnackbar('Logo removed', 'info');
  };

  return (
    <PageTransition>
      <Box className="page-container">
        <PageHeader
          title="System Settings"
          subtitle="Configure campus, security, and notification settings"
        />

        <Grid
          container
          spacing={3}
          component={motion.div}
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {/* General Settings */}
          <Grid size={{ xs: 12, md: 6 }} component={motion.div} variants={fadeInUp}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <School sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">
                    General Settings
                  </Typography>
                </Box>
                <Stack spacing={3}>
                  {/* Logo Upload */}
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      University Logo
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Paper
                        elevation={0}
                        sx={{
                          width: 100,
                          height: 100,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '2px dashed',
                          borderColor: 'divider',
                          borderRadius: 2,
                          backgroundColor: alpha(theme.palette.primary.main, 0.05),
                        }}
                      >
                        {logoPreview ? (
                          <img 
                            src={logoPreview} 
                            alt="Logo" 
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                        ) : (
                          <ImageIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
                        )}
                      </Paper>
                      <Stack spacing={1}>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={handleLogoUpload}
                        />
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Upload />}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Upload Logo
                        </Button>
                        {logoPreview && (
                          <Button
                            variant="outlined"
                            size="small"
                            color="error"
                            startIcon={<Delete />}
                            onClick={handleRemoveLogo}
                          >
                            Remove
                          </Button>
                        )}
                      </Stack>
                    </Box>
                  </Box>

                  <Divider />

                  <TextField
                    label="Campus Name"
                    value={settings.campusName}
                    onChange={(e) => setSettings({ ...settings, campusName: e.target.value })}
                    fullWidth
                  />
                  <TextField
                    label="Campus Address"
                    value={settings.campusAddress}
                    onChange={(e) => setSettings({ ...settings, campusAddress: e.target.value })}
                    fullWidth
                  />
                  <TextField
                    label="Campus Email"
                    type="email"
                    value={settings.campusEmail}
                    onChange={(e) => setSettings({ ...settings, campusEmail: e.target.value })}
                    fullWidth
                  />
                  <TextField
                    label="Campus Phone"
                    value={settings.campusPhone}
                    onChange={(e) => setSettings({ ...settings, campusPhone: e.target.value })}
                    fullWidth
                  />
                  <Button variant="contained" onClick={handleSave} startIcon={<Save />}>
                    Save General Settings
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Security Settings */}
          <Grid size={{ xs: 12, md: 6 }} component={motion.div} variants={fadeInUp}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Security sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">
                    Security Settings
                  </Typography>
                </Box>
                <Stack spacing={3}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Password Policy
                  </Typography>
                  <TextField
                    type="number"
                    label="Minimum Password Length"
                    value={settings.passwordMinLength}
                    onChange={(e) => setSettings({ ...settings, passwordMinLength: parseInt(e.target.value, 10) })}
                    fullWidth
                    helperText="Recommended: 8 or more characters"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.requireSpecialChar}
                        onChange={(e) => setSettings({ ...settings, requireSpecialChar: e.target.checked })}
                      />
                    }
                    label="Require Special Characters (!@#$%)"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.requireUppercase}
                        onChange={(e) => setSettings({ ...settings, requireUppercase: e.target.checked })}
                      />
                    }
                    label="Require Uppercase Letters"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.requireNumber}
                        onChange={(e) => setSettings({ ...settings, requireNumber: e.target.checked })}
                      />
                    }
                    label="Require Numbers"
                  />
                  
                  <Divider />

                  <Typography variant="subtitle2" color="text.secondary">
                    Session Management
                  </Typography>
                  <FormControl fullWidth>
                    <InputLabel>Session Timeout</InputLabel>
                    <Select
                      value={settings.sessionTimeout}
                      label="Session Timeout"
                      onChange={(e) => setSettings({ ...settings, sessionTimeout: e.target.value })}
                    >
                      <MenuItem value={15}>15 minutes</MenuItem>
                      <MenuItem value={30}>30 minutes</MenuItem>
                      <MenuItem value={60}>1 hour</MenuItem>
                      <MenuItem value={120}>2 hours</MenuItem>
                      <MenuItem value={240}>4 hours</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    type="number"
                    label="Max Login Attempts"
                    value={settings.maxLoginAttempts}
                    onChange={(e) => setSettings({ ...settings, maxLoginAttempts: parseInt(e.target.value, 10) })}
                    fullWidth
                    helperText="Lock account after this many failed attempts"
                  />
                  
                  <Divider />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.requireTwoFactor}
                        onChange={(e) => setSettings({ ...settings, requireTwoFactor: e.target.checked })}
                      />
                    }
                    label="Enable Two-Factor Authentication"
                  />
                  <Button variant="contained" onClick={handleSave} startIcon={<Save />}>
                    Save Security Settings
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Attendance Geofence */}
          <Grid size={12} component={motion.div} variants={fadeInUp}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 3, flexWrap: 'wrap' }}>     
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>     
                    <MyLocation sx={{ color: 'primary.main' }} />
                    <Typography variant="h6">      
                      Attendance Geofence
                    </Typography>
                    <Chip
                      size="small"
                      label={geofenceSettings.source === 'redis' ? 'Saved override' : 'Environment default'}
                      color={geofenceSettings.source === 'redis' ? 'success' : 'default'}
                      variant={geofenceSettings.source === 'redis' ? 'filled' : 'outlined'}
                    />
                  </Box>
                  <Button
                    variant="text"
                    startIcon={<School />}
                    onClick={() => navigate('/attendance/biometric-enrollment')}
                  >
                    Open Enrollment Page
                  </Button>
                </Box>

                <Grid container spacing={3}>       
                  <Grid size={{ xs: 12, md: 7 }}>  
                    <Stack spacing={2.5}>
                      <TextField
                        label="Campus Center Latitude"
                        type="number"
                        value={geofenceSettings.campus_lat}
                        onChange={(e) => setGeofenceSettings({ ...geofenceSettings, campus_lat: e.target.value })}
                        fullWidth
                        helperText="Attendance GPS checks use this latitude as the campus center."     
                        InputProps={{ startAdornment: <MyLocation sx={{ mr: 1, color: 'text.secondary' }} /> }}
                      />
                      <TextField
                        label="Campus Center Longitude"
                        type="number"
                        value={geofenceSettings.campus_lng}
                        onChange={(e) => setGeofenceSettings({ ...geofenceSettings, campus_lng: e.target.value })}
                        fullWidth
                        helperText="Students must be within the configured radius of this coordinate." 
                        InputProps={{ startAdornment: <Public sx={{ mr: 1, color: 'text.secondary' }} /> }}
                      />
                      <TextField
                        label="Maximum Radius (meters)"
                        type="number"
                        value={geofenceSettings.max_radius_meters}
                        onChange={(e) => setGeofenceSettings({ ...geofenceSettings, max_radius_meters: e.target.value })}
                        fullWidth
                        helperText="Changing this value updates campus fencing immediately."
                        InputProps={{ startAdornment: <MyLocation sx={{ mr: 1, color: 'text.secondary' }} /> }}
                      />

                      <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
                        <Button
                          variant="contained"
                          onClick={handleSaveGeofence}
                          startIcon={<Save />}     
                          disabled={geofenceSaving}
                        >
                          Save Attendance Geofence 
                        </Button>
                        <Button
                          variant="outlined"       
                          onClick={handleResetGeofence}
                          startIcon={<RestartAlt />}
                          disabled={geofenceSaving}
                        >
                          Reset to Defaults        
                        </Button>
                      </Stack>
                    </Stack>
                  </Grid>

                  <Grid size={{ xs: 12, md: 5 }}>  
                    <Paper
                      elevation={0}
                      sx={{
                        p: 3,
                        height: '100%',
                        borderRadius: 3,
                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                        border: '1px solid',       
                        borderColor: alpha(theme.palette.primary.main, 0.12),
                      }}
                    >
                      <Stack spacing={2}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Runtime Effect
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          These values are read by the attendance service on every GPS check. No restart is needed after saving.
                        </Typography>
                        <Divider />
                        <Stack spacing={1}>        
                          <Typography variant="body2">
                            <strong>Latitude:</strong> {Number(geofenceSettings.campus_lat).toFixed(4)}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Longitude:</strong> {Number(geofenceSettings.campus_lng).toFixed(4)}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Radius:</strong> {Math.round(Number(geofenceSettings.max_radius_meters) || 0)} meters
                          </Typography>
                        </Stack>
                      </Stack>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Notification Settings */}
          <Grid size={12} component={motion.div} variants={fadeInUp}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Notifications sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">
                    Notification Settings
                  </Typography>
                </Box>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Stack spacing={3}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Notification Channels
                      </Typography>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.emailNotifications}
                            onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                          />
                        }
                        label="Enable Email Notifications"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.smsNotifications}
                            onChange={(e) => setSettings({ ...settings, smsNotifications: e.target.checked })}
                          />
                        }
                        label="Enable SMS Notifications"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.pushNotifications}
                            onChange={(e) => setSettings({ ...settings, pushNotifications: e.target.checked })}
                          />
                        }
                        label="Enable Push Notifications"
                      />
                      
                      <Divider />

                      <Typography variant="subtitle2" color="text.secondary">
                        Automatic Alerts
                      </Typography>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.notifyOnFeePayment}
                            onChange={(e) => setSettings({ ...settings, notifyOnFeePayment: e.target.checked })}
                          />
                        }
                        label="Notify on Fee Payments"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.notifyOnAttendance}
                            onChange={(e) => setSettings({ ...settings, notifyOnAttendance: e.target.checked })}
                          />
                        }
                        label="Notify on Attendance Marks"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.notifyOnGrades}
                            onChange={(e) => setSettings({ ...settings, notifyOnGrades: e.target.checked })}
                          />
                        }
                        label="Notify on Grade Uploads"
                      />
                    </Stack>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Stack spacing={3}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Message Templates
                      </Typography>
                      <TextField
                        label="Default Email Template"
                        multiline
                        minRows={3}
                        value={settings.emailTemplate}
                        onChange={(e) => setSettings({ ...settings, emailTemplate: e.target.value })}
                        fullWidth
                        helperText="Use {name} for student name, {message} for content"
                      />
                      <TextField
                        label="Default SMS Template"
                        multiline
                        minRows={3}
                        value={settings.smsTemplate}
                        onChange={(e) => setSettings({ ...settings, smsTemplate: e.target.value })}
                        fullWidth
                        helperText="Keep SMS messages short (160 characters)"
                      />
                      
                      <Paper 
                        elevation={0}
                        sx={{ 
                          p: 2, 
                          backgroundColor: alpha(theme.palette.info.main, 0.1),
                          border: '1px solid',
                          borderColor: alpha(theme.palette.info.main, 0.3)
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          <strong>Available Variables:</strong><br />
                          • {'{name}'} - Student/User name<br />
                          • {'{rollNo}'} - Roll number<br />
                          • {'{message}'} - Dynamic message content<br />
                          • {'{date}'} - Current date<br />
                          • {'{amount}'} - Fee amount
                        </Typography>
                      </Paper>
                    </Stack>
                  </Grid>
                </Grid>
                <Box sx={{ mt: 3 }}>
                  <Button variant="contained" onClick={handleSave} startIcon={<Save />}>
                    Save Notification Settings
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </PageTransition>
  );
};

export default Settings;
