import { useState, useRef, useEffect } from 'react';
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
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import PageHeader from '../../components/Common/PageHeader';
import PageTransition from '../../components/Common/PageTransition';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { fadeInUp, staggerContainer } from '../../utils/animations';
import { opsAPI } from '../../api/ops';

const Settings = () => {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const fileInputRef = useRef(null);
  const [logoPreview, setLogoPreview] = useState(null);
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

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await opsAPI.getFeatureFlags ? opsAPI.getFeatureFlags() : Promise.resolve({ data: {} });
        const d = res.data;
        if (d && typeof d === 'object' && !Array.isArray(d)) setSettings(prev => ({ ...prev, ...d }));
      } catch (e) { console.error(e); }
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
