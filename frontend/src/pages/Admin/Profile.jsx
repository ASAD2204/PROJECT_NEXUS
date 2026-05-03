import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Button,
  TextField,
  Divider,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  Stack,
  InputAdornment,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Switch,
  CircularProgress,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Edit,
  Save,
  Cancel,
  PhotoCamera,
  Email,
  Phone,
  AdminPanelSettings,
  Security,
  Person,
  Settings,
  Badge as BadgeIcon,
  VerifiedUser,
  Dashboard,
  People,
  School,
  Description,
  Assessment,
  LocalLibrary,
  EventNote,
  Lock,
  Notifications,
  Language,
  Palette,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import StatusBadge from '../../components/Common/StatusBadge';
import StatCard from '../../components/Common/StatCard';
import { pageTransition } from '../../utils/animations';
import { analyticsAPI } from '../../api/analytics';
import { authAPI } from '../../api/auth';

const AdminProfile = () => {
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [activeTab, setActiveTab] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || 'admin',
    department: user?.department || '',
    phone: user?.phone || '',
    employeeId: user?.employeeId || '',
    joiningDate: user?.joiningDate || '',
    permissions: user?.permissions || [],
  });

  // Settings
  const [settings, setSettings] = useState({
    emailNotifications: true,
    systemAlerts: true,
    securityAlerts: true,
    weeklyReports: false,
    twoFactorAuth: true,
    autoLogout: true,
    sessionTimeout: '30',
  });

  // Stats
  const [stats, setStats] = useState([
    { title: 'Total Users', value: '—', icon: People, color: 'primary', tooltip: 'Active users in system' },
    { title: 'Active Sessions', value: '—', icon: Dashboard, color: 'success', tooltip: 'Current active sessions' },
    { title: 'Pending Requests', value: '—', icon: EventNote, color: 'warning', tooltip: 'Pending approval requests' },
    { title: 'System Health', value: '—', icon: Assessment, color: 'info', tooltip: 'Overall system health' },
  ]);

  // Available permissions
  const allPermissions = [
    { id: 'users', label: 'User Management', icon: People },
    { id: 'courses', label: 'Course Management', icon: School },
    { id: 'finance', label: 'Finance Management', icon: Assessment },
    { id: 'grievance', label: 'Grievance Management', icon: Description },
    { id: 'settings', label: 'System Settings', icon: Settings },
    { id: 'reports', label: 'Reports & Analytics', icon: Assessment },
    { id: 'alumni', label: 'Alumni Management', icon: People },
    { id: 'library', label: 'Library Management', icon: LocalLibrary },
    { id: 'attendance', label: 'Attendance Management', icon: EventNote },
    { id: 'exams', label: 'Exam Management', icon: Description },
  ];

  // Recent activities
  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const res = await analyticsAPI.getAdminDashboard();
        const d = res.data;
        if (d) {
          if (d.stats) {
             const mapped = [
                { title: 'Total Users', value: String(d.total_users || 0), icon: People, color: 'primary' },
                { title: 'Active Students', value: String(d.total_students || 0), icon: School, color: 'success' },
                { title: 'Pending Grievances', value: String(d.pending_grievances || 0), icon: EventNote, color: 'warning' },
                { title: 'Dept Heads', value: String(d.total_hods || 0), icon: Assessment, color: 'info' },
             ];
             setStats(mapped);
          }
          if (d.recent_activities) setRecentActivities(d.recent_activities);
        }
      } catch (e) { console.error(e); }
    };
    fetchProfileData();
  }, []);

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePermissionToggle = (permission) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const handleSettingChange = (setting, value) => {
    setSettings(prev => ({ ...prev, [setting]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const nameParts = formData.name.trim().split(/\s+/).filter(Boolean);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ');

      await authAPI.updateProfile({
        first_name: firstName,
        last_name: lastName,
        email: formData.email,
        phone: formData.phone,
      });

      setIsEditing(false);
      showSnackbar('Profile updated successfully!', 'success');
    } catch (e) {
      console.error(e);
      showSnackbar('Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset to user original data
    setFormData({
        name: user?.name || '',
        email: user?.email || '',
        role: user?.role || 'admin',
        department: user?.department || '',
        phone: user?.phone || '',
        employeeId: user?.employeeId || '',
        joiningDate: user?.joiningDate || '',
        permissions: user?.permissions || [],
    });
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      showSnackbar('Profile picture updated!', 'success');
      setShowAvatarDialog(false);
    }
  };

  return (
    <motion.div {...pageTransition}>
      <Box className="page-container">
        {/* Page Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Administrator Profile
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your admin profile, access permissions, and system preferences
          </Typography>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {stats.map((stat, index) => (
            <Grid key={index} item xs={12} sm={6} md={3}>
              <StatCard
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                color={stat.color}
                tooltip={stat.tooltip}
              />
            </Grid>
          ))}
        </Grid>

        {/* Tabs */}
        <Card sx={{ mb: 3, p: { xs: 0, md: 0 } }}>
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab icon={<Person />} label="Personal" iconPosition="start" />
            <Tab icon={<Security />} label="Access" iconPosition="start" />
            <Tab icon={<EventNote />} label="Activity" iconPosition="start" />
            <Tab icon={<Settings />} label="Settings" iconPosition="start" />
          </Tabs>
        </Card>

        {/* TAB 1: Personal Information */}
        {activeTab === 0 && (
          <Box>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Grid container spacing={3} alignItems="center">
                  <Grid item xs={12} sm={2}>
                    <Box
                      sx={{
                        position: 'relative',
                        width: 120,
                        height: 120,
                        '&:hover .avatar-overlay': {
                          opacity: 1,
                        },
                      }}
                    >
                      <Avatar
                        sx={{ width: 120, height: 120, bgcolor: 'error.main', fontSize: '3rem' }}
                      >
                        {formData.name[0] || 'A'}
                      </Avatar>
                      <Box
                        className="avatar-overlay"
                        onClick={() => setShowAvatarDialog(true)}
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: 120,
                          height: 120,
                          borderRadius: '50%',
                          backgroundColor: 'rgba(0,0,0,0.6)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: 0,
                          transition: 'opacity 0.3s',
                          cursor: 'pointer',
                        }}
                      >
                        <PhotoCamera sx={{ color: 'white', fontSize: 32 }} />
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={7}>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                      {formData.name || 'Admin User'}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, mb: 1, flexWrap: 'wrap' }}>
                      <Chip icon={<AdminPanelSettings />} label={formData.role} color="error" size="small" />
                      <Chip icon={<BadgeIcon />} label={formData.employeeId || 'AD-001'} size="small" />
                      <Chip icon={<VerifiedUser />} label="Verified" color="success" size="small" />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, mb: 1, flexWrap: 'wrap' }}>
                      <Typography variant="body2" color="text.secondary">
                        <Email fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                        {formData.email}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <Phone fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                        {formData.phone || 'Not provided'}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Department: {formData.department || 'Management'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    {!isEditing ? (
                      <Button
                        variant="contained"
                        startIcon={<Edit />}
                        onClick={() => setIsEditing(true)}
                        fullWidth
                      >
                        Edit Profile
                      </Button>
                    ) : (
                      <Stack spacing={1}>
                        <Button
                          variant="contained"
                          startIcon={<Save />}
                          onClick={handleSave}
                          fullWidth
                          disabled={saving}
                        >
                          {saving ? <CircularProgress size={20} color="inherit" /> : 'Save Changes'}
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<Cancel />}
                          onClick={handleCancel}
                          fullWidth
                          disabled={saving}
                        >
                          Cancel
                        </Button>
                      </Stack>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Basic Information */}
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Basic Information
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Full Name"
                      value={formData.name}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                      disabled={!isEditing}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Employee ID"
                      value={formData.employeeId}
                      disabled
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <BadgeIcon />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Email Address"
                      value={formData.email}
                      disabled
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Email />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Phone Number"
                      value={formData.phone}
                      onChange={(e) => handleFieldChange('phone', e.target.value)}
                      disabled={!isEditing}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Phone />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Admin Role"
                      value={formData.role}
                      disabled
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Department"
                      value={formData.department}
                      disabled
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* TAB 2: Access Control */}
        {activeTab === 1 && (
          <Card>
            <CardContent>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Access Permissions
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Manage module access and permissions for this administrator
                </Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />
              
              <Alert severity="info" sx={{ mb: 3 }}>
                <strong>{formData.role}</strong> - Current role with {formData.permissions.length} active permissions
              </Alert>

              <Grid container spacing={2}>
                {allPermissions.map((perm) => (
                  <Grid key={perm.id} item xs={12} md={6}>
                    <Card
                      variant="outlined"
                      sx={{
                        bgcolor: formData.permissions.includes(perm.label) ? 'action.selected' : 'background.paper',
                      }}
                    >
                      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Checkbox
                          checked={formData.permissions.includes(perm.label)}
                          disabled
                        />
                        <perm.icon color={formData.permissions.includes(perm.label) ? 'primary' : 'disabled'} />
                        <Typography variant="body1">{perm.label}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              <Alert severity="warning" sx={{ mt: 3 }}>
                Changes to permissions require approval from a higher authority
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* TAB 3: Activity Log */}
        {activeTab === 2 && (
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Recent Activities
              </Typography>
              <Divider sx={{ mb: 3 }} />
              <List>
                {recentActivities.map((activity, index) => (
                  <ListItem
                    key={index}
                    sx={{
                      bgcolor: 'action.hover',
                      borderRadius: 2,
                      mb: 1,
                    }}
                  >
                    <ListItemIcon>
                      {activity.type === 'create' && <People color="success" />}
                      {activity.type === 'update' && <Edit color="primary" />}
                      {activity.type === 'approve' && <VerifiedUser color="success" />}
                      {activity.type === 'report' && <Assessment color="info" />}
                      {activity.type === 'settings' && <Settings color="warning" />}
                    </ListItemIcon>
                    <ListItemText
                      primary={activity.action}
                      secondary={`${activity.user || 'System'} • ${activity.timestamp || activity.time || ''}`}
                    />
                  </ListItem>
                ))}
                {recentActivities.length === 0 && <Typography align="center" color="text.secondary" sx={{ py: 4 }}>No recent activity recorded.</Typography>}
              </List>
            </CardContent>
          </Card>
        )}

        {/* TAB 4: System Preferences */}
        {activeTab === 3 && (
          <Box>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Notification Settings
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.emailNotifications}
                        onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                      />
                    }
                    label="Email Notifications"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.systemAlerts}
                        onChange={(e) => handleSettingChange('systemAlerts', e.target.checked)}
                      />
                    }
                    label="System Alerts"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.securityAlerts}
                        onChange={(e) => handleSettingChange('securityAlerts', e.target.checked)}
                      />
                    }
                    label="Security Alerts"
                  />
                </FormGroup>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Security Settings
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.twoFactorAuth}
                        onChange={(e) => handleSettingChange('twoFactorAuth', e.target.checked)}
                      />
                    }
                    label="Two-Factor Authentication"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.autoLogout}
                        onChange={(e) => handleSettingChange('autoLogout', e.target.checked)}
                      />
                    }
                    label="Auto Logout on Inactivity"
                  />
                </FormGroup>
                <TextField
                  fullWidth
                  label="Session Timeout (minutes)"
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={(e) => handleSettingChange('sessionTimeout', e.target.value)}
                  sx={{ mt: 2 }}
                />
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Avatar Upload Dialog */}
        <Dialog open={showAvatarDialog} onClose={() => setShowAvatarDialog(false)}>
          <DialogTitle>Update Profile Picture</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 2 }}>Select a new profile picture. Recommended size: 500x500px.</Typography>
            <input
              accept="image/*"
              type="file"
              onChange={handleAvatarUpload}
              style={{ display: 'block', marginTop: 16 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowAvatarDialog(false)}>Cancel</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </motion.div>
  );
};

export default AdminProfile;
