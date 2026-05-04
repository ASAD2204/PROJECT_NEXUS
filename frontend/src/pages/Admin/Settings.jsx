import { useState, useRef, useEffect, useCallback } from 'react';
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
  CircularProgress,
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
import { useConfig } from '../../contexts/ConfigContext';
import { fadeInUp, staggerContainer } from '../../utils/animations';
import { opsAPI } from '../../api/ops';
import { attendanceAPI } from '../../api/attendance';

const parseGeofenceNumber = (value, fallback) => { 
  if (value === '' || value === null || value === undefined) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;      
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
  const { refreshConfig } = useConfig();
  const fileInputRef = useRef(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [geofenceSaving, setGeofenceSaving] = useState(false);
  const [generalSaving, setGeneralSaving] = useState(false);
  const [securitySaving, setSecuritySaving] = useState(false);
  const [notifySaving, setNotifySaving] = useState(false);

  const [settings, setSettings] = useState({
    campusName: 'Project Nexus University',
    campusAddress: '123 Academic Way, Science City',
    campusEmail: 'admin@nexus.edu',
    campusPhone: '+92 300 1234567',
    campusLogo: '',
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
    emailTemplate: 'Dear {name}, {message}',
    smsTemplate: 'Nexus Alert: {message}',
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

  const loadSettings = useCallback(async () => {
    try {
      const res = await opsAPI.getFeatureFlags();
      if (res.data) {
        setSettings(prev => ({ ...prev, ...res.data }));
        if (res.data.campusLogo) {
          setLogoPreview(res.data.campusLogo);
        }
      }
    } catch (e) { console.error('Failed to load flags', e); }

    try {
      const geofenceRes = await attendanceAPI.getGeofenceConfig();
      setGeofenceSettings(normalizeGeofence(geofenceRes.data));
    } catch (e) { console.error('Failed to load geofence', e); }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSaveGeneral = async () => {
    try {
      setGeneralSaving(true);
      await opsAPI.updateFeatureFlags({
          campusName: settings.campusName,
          campusAddress: settings.campusAddress,
          campusEmail: settings.campusEmail,
          campusPhone: settings.campusPhone,
          campusLogo: settings.campusLogo,
      });
      await refreshConfig();
      showSnackbar('General settings updated', 'success');
    } catch (e) {
      showSnackbar('Failed to save general settings', 'error');
    } finally { setGeneralSaving(false); }
  };

  const handleSaveSecurity = async () => {
    try {
      setSecuritySaving(true);
      await opsAPI.updateFeatureFlags({
          passwordMinLength: settings.passwordMinLength,
          requireSpecialChar: settings.requireSpecialChar,
          requireUppercase: settings.requireUppercase,
          requireNumber: settings.requireNumber,
          sessionTimeout: settings.sessionTimeout,
          maxLoginAttempts: settings.maxLoginAttempts,
      });
      showSnackbar('Security policy updated', 'success');
    } catch (e) {
      showSnackbar('Failed to save security settings', 'error');
    } finally { setSecuritySaving(false); }
  };

  const handleSaveNotify = async () => {
    try {
      setNotifySaving(true);
      await opsAPI.updateFeatureFlags({
          emailNotifications: settings.emailNotifications,
          smsNotifications: settings.smsNotifications,
          notifyOnFeePayment: settings.notifyOnFeePayment,
          notifyOnAttendance: settings.notifyOnAttendance,
      });
      showSnackbar('Notification preferences saved', 'success');
    } catch (e) {
      showSnackbar('Failed to save notification settings', 'error');
    } finally { setNotifySaving(false); }
  };

  const handleSaveGeofence = async () => {
    const payload = normalizeGeofence(geofenceSettings);
    setGeofenceSaving(true);
    try {
      const res = await attendanceAPI.updateGeofenceConfig({
        campus_lat: payload.campus_lat,
        campus_lng: payload.campus_lng,
        max_radius_meters: Math.round(payload.max_radius_meters),
      });
      setGeofenceSettings(normalizeGeofence(res.data));
      showSnackbar('Attendance geofence updated', 'success');
    } catch (e) {
      showSnackbar(e.response?.data?.detail || 'Failed to save geofence', 'error');
    } finally { setGeofenceSaving(false); }
  };

  const handleResetGeofence = async () => {        
    setGeofenceSaving(true);
    try {
      const res = await attendanceAPI.resetGeofenceConfig();
      setGeofenceSettings(normalizeGeofence(res.data));
      showSnackbar('Geofence reset to defaults', 'info');
    } catch (e) {
      showSnackbar('Failed to reset geofence', 'error');        
    } finally { setGeofenceSaving(false); }
  };

  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
        setSettings(prev => ({ ...prev, campusLogo: reader.result }));
        showSnackbar('Logo uploaded (click Save to persist)', 'info');
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <PageTransition>
      <Box className="page-container">
        <PageHeader title="System Settings" subtitle="Global configuration for campus, security, and operations" />

        <Grid container spacing={3} component={motion.div} variants={staggerContainer} initial="initial" animate="animate">
          {/* General Settings */}
          <Grid item xs={12} md={6} component={motion.div} variants={fadeInUp}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Stack spacing={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <School color="primary" />
                    <Typography variant="h6">General Configuration</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center', py: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 2, border: '1px dashed', borderColor: 'divider' }}>
                     {logoPreview ? <img src={logoPreview} alt="Logo" style={{ maxHeight: 80 }} /> : <ImageIcon sx={{ fontSize: 48, color: 'text.disabled' }} />}
                     <Box sx={{ mt: 1 }}>
                        <Button size="small" component="label">Upload Logo<input hidden accept="image/*" type="file" onChange={handleLogoUpload} /></Button>
                     </Box>
                  </Box>
                  <TextField label="Campus Name" value={settings.campusName} onChange={(e) => setSettings({...settings, campusName: e.target.value})} fullWidth />
                  <TextField label="Campus Email" value={settings.campusEmail} onChange={(e) => setSettings({...settings, campusEmail: e.target.value})} fullWidth />
                  <TextField label="Campus Address" multiline rows={2} value={settings.campusAddress} onChange={(e) => setSettings({...settings, campusAddress: e.target.value})} fullWidth />
                  <Button variant="contained" startIcon={<Save />} onClick={handleSaveGeneral} disabled={generalSaving}>
                    {generalSaving ? <CircularProgress size={20} color="inherit" /> : 'Save General'}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Security Settings */}
          <Grid item xs={12} md={6} component={motion.div} variants={fadeInUp}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Stack spacing={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Security color="error" />
                    <Typography variant="h6">Security & Auth Policy</Typography>
                  </Box>
                  <TextField type="number" label="Min Password Length" value={settings.passwordMinLength} onChange={(e) => setSettings({...settings, passwordMinLength: e.target.value})} fullWidth />
                  <FormControlLabel control={<Switch checked={settings.requireSpecialChar} onChange={(e) => setSettings({...settings, requireSpecialChar: e.target.checked})} />} label="Require Special Characters" />
                  <FormControlLabel control={<Switch checked={settings.requireUppercase} onChange={(e) => setSettings({...settings, requireUppercase: e.target.checked})} />} label="Require Uppercase" />
                  <FormControl fullWidth>
                    <InputLabel>Session Timeout</InputLabel>
                    <Select value={settings.sessionTimeout} label="Session Timeout" onChange={(e) => setSettings({...settings, sessionTimeout: e.target.value})}>
                        {[15, 30, 60, 120].map(m => <MenuItem key={m} value={m}>{m} Minutes</MenuItem>)}
                    </Select>
                  </FormControl>
                  <Button variant="contained" color="error" startIcon={<Save />} onClick={handleSaveSecurity} disabled={securitySaving}>
                    {securitySaving ? <CircularProgress size={20} color="inherit" /> : 'Update Security Policy'}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Attendance Geofence */}
          <Grid item xs={12} component={motion.div} variants={fadeInUp}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <MyLocation color="primary" />
                    <Typography variant="h6">Attendance Geofence (GPS)</Typography>
                    <Chip size="small" label={geofenceSettings.source} color={geofenceSettings.source === 'redis' ? 'success' : 'default'} />
                </Box>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={8}>
                        <Stack spacing={2.5}>
                            <TextField label="Latitude" type="number" value={geofenceSettings.campus_lat} onChange={(e) => setGeofenceSettings({...geofenceSettings, campus_lat: e.target.value})} fullWidth />
                            <TextField label="Longitude" type="number" value={geofenceSettings.campus_lng} onChange={(e) => setGeofenceSettings({...geofenceSettings, campus_lng: e.target.value})} fullWidth />
                            <TextField label="Radius (meters)" type="number" value={geofenceSettings.max_radius_meters} onChange={(e) => setGeofenceSettings({...geofenceSettings, max_radius_meters: e.target.value})} fullWidth />
                            <Stack direction="row" spacing={2}>
                                <Button variant="contained" onClick={handleSaveGeofence} disabled={geofenceSaving}>Save Geofence</Button>
                                <Button variant="outlined" onClick={handleResetGeofence} disabled={geofenceSaving}>Reset</Button>
                            </Stack>
                        </Stack>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 3, bgcolor: 'action.hover', height: '100%' }}>
                            <Typography variant="subtitle2" gutterBottom>Live Configuration</Typography>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="body2">Lat: {geofenceSettings.campus_lat}</Typography>
                            <Typography variant="body2">Lng: {geofenceSettings.campus_lng}</Typography>
                            <Typography variant="body2">Radius: {geofenceSettings.max_radius_meters}m</Typography>
                        </Paper>
                    </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Notifications */}
          <Grid item xs={12} component={motion.div} variants={fadeInUp}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <Notifications color="warning" />
                    <Typography variant="h6">Notification Channels</Typography>
                </Box>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <Stack spacing={1}>
                            <FormControlLabel control={<Switch checked={settings.emailNotifications} onChange={(e) => setSettings({...settings, emailNotifications: e.target.checked})} />} label="Email Alerts" />
                            <FormControlLabel control={<Switch checked={settings.notifyOnFeePayment} onChange={(e) => setSettings({...settings, notifyOnFeePayment: e.target.checked})} />} label="Notify on Fee Payment" />
                            <FormControlLabel control={<Switch checked={settings.notifyOnAttendance} onChange={(e) => setSettings({...settings, notifyOnAttendance: e.target.checked})} />} label="Notify on Attendance" />
                        </Stack>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField label="Default Template" multiline rows={4} value={settings.emailTemplate} onChange={(e) => setSettings({...settings, emailTemplate: e.target.value})} fullWidth />
                    </Grid>
                </Grid>
                <Box sx={{ mt: 3 }}>
                    <Button variant="contained" startIcon={<Save />} onClick={handleSaveNotify} disabled={notifySaving}>Save Preferences</Button>
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
