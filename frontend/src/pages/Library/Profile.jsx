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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
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
  Person,
  Settings,
  LocalLibrary,
  Schedule,
  Badge as BadgeIcon,
  MenuBook,
  AutoStories,
  Assignment,
  CalendarMonth,
  AccessTime,
  WbSunny,
  NightsStay,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import StatusBadge from '../../components/Common/StatusBadge';
import StatCard from '../../components/Common/StatCard';
import { pageTransition } from '../../utils/animations';
import { libraryAPI } from '../../api/library';
import { authAPI } from '../../api/auth';

const LibrarianProfile = () => {
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [activeTab, setActiveTab] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: user?.first_name ? `${user.first_name} ${user.last_name || ''}` : '',
    employeeId: '',
    email: user?.email || '',
    phone: user?.phone || '',
    shift: 'Morning',
    assignedSection: '',
    joiningDate: '',
    experience: '',
    qualification: '',
    workingHours: '',
    emergencyContact: '',
  });

  const [stats, setStats] = useState([]);
  const [todayActivity, setTodayActivity] = useState([]);

  const librarySections = [
    'Computer Science & IT',
    'Business & Management',
    'Engineering',
    'Social Sciences',
    'General Collection',
    'Reference Section',
    'Periodicals',
    'Digital Resources',
  ];

  const fetchProfile = async () => {
    try {
      const [profileRes, reportRes] = await Promise.allSettled([
        libraryAPI.getProfile(),
        libraryAPI.getReports(),
      ]);

      if (reportRes.status === 'fulfilled') {
        const d = reportRes.value.data;
        if (d?.stats) setStats(d.stats);
        if (d?.today_activity || d?.todayActivity) setTodayActivity(d.today_activity || d.todayActivity || []);
      }

      if (profileRes.status === 'fulfilled') {
        const p = profileRes.value.data || {};
        setFormData((prev) => ({
          ...prev,
          employeeId: p.employee_id || p.employeeId || '',
          shift: p.shift || 'Morning',
          assignedSection: p.assigned_section || p.assignedSection || '',
          joiningDate: p.joining_date || p.joiningDate || '',
          experience: p.experience || '',
          qualification: p.qualification || '',
          workingHours: p.working_hours || p.workingHours || '',
          emergencyContact: p.emergency_contact || p.emergencyContact || '',
        }));
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
        phone: formData.phone,
        email: formData.email,
      });

      await libraryAPI.updateProfile({
        employee_id: formData.employeeId,
        shift: formData.shift,
        assigned_section: formData.assignedSection,
        joining_date: formData.joiningDate,
        experience: formData.experience,
        qualification: formData.qualification,
        working_hours: formData.workingHours,
        emergency_contact: formData.emergencyContact,
      });

      await fetchProfile();
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
    fetchProfile();
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <motion.div {...pageTransition}>
      <Box className="page-container">
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>Librarian Profile</Typography>
          <Typography variant="body1" color="text.secondary">Manage your profile and library work details</Typography>
        </Box>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          {stats.map((stat, index) => (
            <Grid key={index} item xs={12} sm={6} md={3}>
              <StatCard {...stat} />
            </Grid>
          ))}
        </Grid>

        <Card sx={{ mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(e, v) => setActiveTab(v)}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab icon={<Person />} label="Personal" iconPosition="start" />
            <Tab icon={<LocalLibrary />} label="Work" iconPosition="start" />
            <Tab icon={<Assignment />} label="Activity" iconPosition="start" />
          </Tabs>
        </Card>

        {activeTab === 0 && (
          <Box>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Grid container spacing={3} alignItems="center">
                  <Grid item xs={12} sm={2}>
                    <Box sx={{ position: 'relative', width: 120, height: 120, mx: 'auto' }}>
                      <Avatar sx={{ width: 120, height: 120, bgcolor: 'info.main' }}>{formData.name[0]}</Avatar>
                      <IconButton
                        onClick={() => setShowAvatarDialog(true)}
                        sx={{ position: 'absolute', bottom: 0, right: 0, bgcolor: 'background.paper', boxShadow: 2 }}
                      >
                        <PhotoCamera fontSize="small" />
                      </IconButton>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={7}>
                    <Typography variant="h4" fontWeight="bold">{formData.name}</Typography>
                    <Box sx={{ display: 'flex', gap: 2, mb: 1, flexWrap: 'wrap' }}>
                      <Chip icon={<LocalLibrary />} label="Librarian" color="info" size="small" />
                      <Chip icon={<BadgeIcon />} label={formData.employeeId || 'LB-001'} size="small" />
                      <Chip icon={formData.shift === 'Morning' ? <WbSunny /> : <NightsStay />} label={`${formData.shift} Shift`} color="warning" size="small" />
                    </Box>
                    <Typography variant="body2" color="text.secondary"><Email fontSize="inherit" sx={{ mr: 1 }} />{formData.email}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    {!isEditing ? (
                      <Button variant="contained" startIcon={<Edit />} onClick={() => setIsEditing(true)} fullWidth>Edit Profile</Button>
                    ) : (
                      <Stack spacing={1}>
                        <Button variant="contained" startIcon={<Save />} onClick={handleSave} fullWidth disabled={saving}>
                            {saving ? <CircularProgress size={20} color="inherit" /> : 'Save'}
                        </Button>
                        <Button variant="outlined" startIcon={<Cancel />} onClick={handleCancel} fullWidth disabled={saving}>Cancel</Button>
                      </Stack>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>Basic Information</Typography>
                <Divider sx={{ mb: 3 }} />
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}><TextField fullWidth label="Full Name" value={formData.name} onChange={(e) => handleFieldChange('name', e.target.value)} disabled={!isEditing} /></Grid>
                  <Grid item xs={12} md={6}><TextField fullWidth label="Employee ID" value={formData.employeeId} onChange={(e) => handleFieldChange('employeeId', e.target.value)} disabled={!isEditing} /></Grid>
                  <Grid item xs={12} md={6}><TextField fullWidth label="Phone" value={formData.phone} onChange={(e) => handleFieldChange('phone', e.target.value)} disabled={!isEditing} /></Grid>
                  <Grid item xs={12} md={6}><TextField fullWidth label="Qualification" value={formData.qualification} onChange={(e) => handleFieldChange('qualification', e.target.value)} disabled={!isEditing} /></Grid>
                </Grid>
              </CardContent>
            </Card>
          </Box>
        )}

        {activeTab === 1 && (
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>Work Details</Typography>
              <Divider sx={{ mb: 3 }} />
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth disabled={!isEditing}>
                    <InputLabel>Shift</InputLabel>
                    <Select value={formData.shift} label="Shift" onChange={(e) => handleFieldChange('shift', e.target.value)}>
                      <MenuItem value="Morning">Morning</MenuItem>
                      <MenuItem value="Evening">Evening</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth disabled={!isEditing}>
                    <InputLabel>Assigned Section</InputLabel>
                    <Select value={formData.assignedSection} label="Assigned Section" onChange={(e) => handleFieldChange('assignedSection', e.target.value)}>
                      {librarySections.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}><TextField fullWidth label="Joining Date" type="date" value={formData.joiningDate} onChange={(e) => handleFieldChange('joiningDate', e.target.value)} disabled={!isEditing} InputLabelProps={{ shrink: true }} /></Grid>
                <Grid item xs={12} md={6}><TextField fullWidth label="Working Hours" value={formData.workingHours} onChange={(e) => handleFieldChange('workingHours', e.target.value)} disabled={!isEditing} /></Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {activeTab === 2 && (
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>Today's Activity Log</Typography>
              <Divider sx={{ mb: 3 }} />
              <List>
                {todayActivity.map((log, i) => (
                  <ListItem key={i} sx={{ bgcolor: 'action.hover', borderRadius: 2, mb: 1 }}>
                    <ListItemIcon><Assignment color="primary" /></ListItemIcon>
                    <ListItemText primary={`${log.action}: ${log.bookTitle}`} secondary={`${log.student} • ${log.time}`} />
                  </ListItem>
                ))}
                {todayActivity.length === 0 && <Typography align="center" color="text.secondary" sx={{ py: 4 }}>No activity recorded for today.</Typography>}
              </List>
            </CardContent>
          </Card>
        )}

        <Dialog open={showAvatarDialog} onClose={() => setShowAvatarDialog(false)}>
          <DialogTitle>Update Photo</DialogTitle>
          <DialogContent sx={{ textAlign: 'center', p: 4 }}>
             <Button variant="contained" component="label">Choose File<input hidden accept="image/*" type="file" /></Button>
          </DialogContent>
        </Dialog>
      </Box>
    </motion.div>
  );
};

export default LibrarianProfile;
