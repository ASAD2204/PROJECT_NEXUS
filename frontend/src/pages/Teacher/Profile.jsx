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
  IconButton,
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
  CircularProgress,
  Paper,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Edit,
  Save,
  Cancel,
  PhotoCamera,
  Email,
  Phone,
  LocationOn,
  School,
  CalendarMonth,
  Work,
  Assignment,
  Psychology,
  Badge as BadgeIcon,
  Person,
  Settings,
  Business,
  MenuBook,
  Groups,
  Star,
  TrendingUp,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import StatusBadge from '../../components/Common/StatusBadge';
import StatCard from '../../components/Common/StatCard';
import { pageTransition } from '../../utils/animations';
import { analyticsAPI } from '../../api/analytics';
import { teacherAPI } from '../../api/teacher';
import { sisAPI } from '../../api/sis';
import { authAPI } from '../../api/auth';

import {
  EMAIL_REGEX,
  PHONE_REGEX,
  NAME_REGEX,
  URL_REGEX,
  filterName,
  filterPhone,
} from '../../utils/validation';

const TeacherProfile = () => {
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availability, setAvailability] = useState([]);
  const [openAvailDialog, setOpenAvailDialog] = useState(false);
  const [newAvail, setNewAvail] = useState({ day_of_week: 'Monday', start_time: '08:00', end_time: '10:00', is_available: true });
  
  // Form data
  const [formData, setFormData] = useState({
    name: user?.first_name ? `${user.first_name} ${user.last_name || ''}` : '',
    email: user?.email || '',
    designation: '',
    department: '',
    specialization: '',
    officeLocation: '',
    phone: user?.phone || '',
    employmentStatus: '',
    joiningDate: '',
    qualification: '',
    experience: '',
    researchInterests: '',
    publications: '',
    personalEmail: '',
    linkedIn: '',
    officeHours: '',
  });

  const [stats, setStats] = useState([
    { title: 'Active Courses', value: '—', icon: MenuBook, color: 'primary' },
    { title: 'Total Students', value: '—', icon: Groups, color: 'success' },
    { title: 'Publications', value: '—', icon: Assignment, color: 'info' },
    { title: 'Experience', value: '—', icon: TrendingUp, color: 'warning' },
  ]);

  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);

  const fetchProfile = async () => {
    try {
      const [profileRes, dashRes, courseRes, deptRes] = await Promise.allSettled([
        teacherAPI.getProfile(),
        analyticsAPI.getFacultyDashboard(),
        teacherAPI.getMyCourses(),
        sisAPI.getDepartments().catch(() => ({ data: [] }))
      ]);
      
      let pData = {};
      if (profileRes.status === 'fulfilled') {
        pData = profileRes.value.data || {};
        setFormData(prev => ({
          ...prev,
          designation: pData.designation || '',
          department: pData.dept_id ?? '',
          specialization: pData.specialization || '',
          officeLocation: pData.office_location || '',
          employmentStatus: pData.employment_status || '',
          joiningDate: pData.joining_date || '',
          qualification: pData.qualification || '',
          experience: pData.experience || '',
          researchInterests: pData.research_interests || '',
          publications: pData.publications || '',
          personalEmail: pData.personal_email || '',
          linkedIn: pData.linkedin_url || '',
          officeHours: pData.office_hours || '',
        }));
      }
      
      if (dashRes.status === 'fulfilled') {
        const d = dashRes.value.data;
        setStats([
          { title: 'Active Courses', value: String(d?.total_sections || 0), icon: MenuBook, color: 'primary' },
          { title: 'Total Students', value: String(d?.total_students || 0), icon: Groups, color: 'success' },
          { title: 'Publications', value: String(pData?.publications || 0), icon: Assignment, color: 'info' },
          { title: 'Avg Attendance', value: `${d?.avg_attendance || 0}%`, icon: TrendingUp, color: 'warning' },
        ]);
      }
      
      if (courseRes.status === 'fulfilled') {
        setCourses(courseRes.value.data || []);
      }

      if (deptRes.status === 'fulfilled') {
        setDepartments(deptRes.value.data?.departments || deptRes.value.data || []);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
        fetchProfile();
        sisAPI.getMyAvailability().then(res => setAvailability(res.data || [])).catch(console.error);
    }
  }, [user]);

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    const hasName = Boolean(formData.name?.trim());
    const hasDesignation = Boolean(formData.designation?.trim());
    const hasValidEmail = Boolean(formData.email?.trim()) && EMAIL_REGEX.test(formData.email.trim());
    const hasValidPhone = !formData.phone?.trim() || PHONE_REGEX.test(formData.phone.trim());

    if (!hasName || !hasDesignation || !hasValidEmail || !hasValidPhone) {
      if (!hasName) showSnackbar('Name is required and must contain only letters.', 'error');
      else if (!hasDesignation) showSnackbar('Designation is required.', 'error');
      else if (!hasValidEmail) showSnackbar('Please provide a valid email address.', 'error');
      else if (!hasValidPhone) showSnackbar('Phone must contain only digits, +, -, (, ) — 7 to 20 chars.', 'error');
      return;
    }

    // Validate LinkedIn URL if provided
    if (formData.linkedIn?.trim() && !URL_REGEX.test(formData.linkedIn.trim())) {
      showSnackbar('LinkedIn URL must start with http:// or https://', 'error');
      return;
    }

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

      await teacherAPI.updateProfile({
        designation: formData.designation,
        dept_id: Number(formData.department) || undefined,
        specialization: formData.specialization,
        office_location: formData.officeLocation,
        employment_status: formData.employmentStatus,
        joining_date: formData.joiningDate,
        qualification: formData.qualification,
        experience: formData.experience,
        research_interests: formData.researchInterests,
        publications: formData.publications,
        personal_email: formData.personalEmail,
        linkedin_url: formData.linkedIn,
        office_hours: formData.officeHours,
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

  const handleAddAvail = async () => {
    if (!newAvail.day_of_week || !newAvail.start_time || !newAvail.end_time) {
      showSnackbar('Please fill all availability fields.', 'error');
      return;
    }
    if (newAvail.start_time >= newAvail.end_time) {
      showSnackbar('Start time must be earlier than end time.', 'error');
      return;
    }

    try {
      await sisAPI.addAvailability(newAvail);
      const res = await sisAPI.getMyAvailability();
      setAvailability(res.data || []);
      setOpenAvailDialog(false);
      showSnackbar('Availability added!', 'success');
    } catch (e) {
      showSnackbar('Failed to add availability', 'error');
    }
  };

  const handleRemoveAvail = async (id) => {
    try {
      await sisAPI.removeAvailability(id);
      setAvailability(availability.filter(a => a.avail_id !== id));
      showSnackbar('Availability removed', 'success');
    } catch (e) {
      showSnackbar('Failed to remove', 'error');
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <motion.div {...pageTransition}>
      <Box className="page-container">
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>Faculty Profile</Typography>
          <Typography variant="body1" color="text.secondary">Manage your academic profile and teaching assignments</Typography>
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
            <Tab icon={<MenuBook />} label="Teaching" iconPosition="start" />
            <Tab icon={<Psychology />} label="Research" iconPosition="start" />
            <Tab icon={<CalendarMonth />} label="Availability" iconPosition="start" />
          </Tabs>
        </Card>

        {activeTab === 0 && (
          <Box>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Grid container spacing={3} alignItems="center">
                  <Grid item xs={12} sm={2}>
                    <Box sx={{ position: 'relative', width: 120, height: 120, mx: 'auto' }}>
                      <Avatar sx={{ width: 120, height: 120, bgcolor: 'primary.main' }}>
  {formData.name ? formData.name[0] : <Person />}
</Avatar>
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
                    <Stack direction="row" spacing={1} sx={{ mt: 1, mb: 1, flexWrap: 'wrap' }}>
                      <Chip icon={<Work />} label={formData.designation || 'Faculty'} color="primary" size="small" />
                      <Chip icon={<Business />} label={formData.employmentStatus || 'Active'} color="success" size="small" />
                    </Stack>
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
                <Typography variant="h6" fontWeight="bold" gutterBottom>Professional Details</Typography>
                <Divider sx={{ mb: 3 }} />
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}><TextField fullWidth label="Designation" required inputProps={{ minLength: 2, maxLength: 80 }} value={formData.designation} onChange={(e) => handleFieldChange('designation', e.target.value)} disabled={!isEditing} /></Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth disabled={!isEditing}>
                        <InputLabel>Department</InputLabel>
                        <Select value={formData.department} label="Department" onChange={(e) => handleFieldChange('department', e.target.value)}>
                            {departments.map(d => <MenuItem key={d.id || d.dept_id} value={d.id || d.dept_id}>{d.name}</MenuItem>)}
                        </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}><TextField fullWidth label="Office Location" value={formData.officeLocation} onChange={(e) => handleFieldChange('officeLocation', e.target.value)} disabled={!isEditing} inputProps={{ maxLength: 100 }} /></Grid>
                  <Grid item xs={12} md={6}><TextField fullWidth label="Office Hours" value={formData.officeHours} onChange={(e) => handleFieldChange('officeHours', e.target.value)} disabled={!isEditing} inputProps={{ maxLength: 100 }} placeholder="e.g. Mon-Wed 10:00-12:00" /></Grid>
                  <Grid item xs={12} md={6}><TextField fullWidth label="Phone" inputProps={{ maxLength: 20 }} value={formData.phone} onChange={(e) => handleFieldChange('phone', filterPhone(e.target.value))} disabled={!isEditing} helperText={isEditing ? 'Digits, +, -, (, ) only' : ''} /></Grid>
                  <Grid item xs={12} md={6}><TextField fullWidth label="Qualification" value={formData.qualification} onChange={(e) => handleFieldChange('qualification', e.target.value)} disabled={!isEditing} inputProps={{ maxLength: 100 }} /></Grid>
                </Grid>
              </CardContent>
            </Card>
          </Box>
        )}

        {activeTab === 1 && (
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>Teaching Assignments</Typography>
              <Divider sx={{ mb: 3 }} />
              <List>
                {courses.map((course, i) => (
                  <ListItem key={i} sx={{ bgcolor: 'action.hover', borderRadius: 2, mb: 1 }}>
                    <ListItemIcon><MenuBook color="primary" /></ListItemIcon>
                    <ListItemText primary={`${course.code || ''} ${course.name || course.title}`} secondary={`${course.students || 0} Students enrolled`} />
                  </ListItem>
                ))}
                {courses.length === 0 && <Typography align="center" color="text.secondary" sx={{ py: 4 }}>No active teaching assignments found.</Typography>}
              </List>
            </CardContent>
          </Card>
        )}

        {activeTab === 2 && (
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>Research & Publications</Typography>
              <Divider sx={{ mb: 3 }} />
              <TextField fullWidth multiline rows={4} label="Research Interests" value={formData.researchInterests} onChange={(e) => handleFieldChange('researchInterests', e.target.value)} disabled={!isEditing} sx={{ mb: 3 }} inputProps={{ maxLength: 2000 }} />
              <TextField fullWidth multiline rows={4} label="Key Publications" value={formData.publications} onChange={(e) => handleFieldChange('publications', e.target.value)} disabled={!isEditing} inputProps={{ maxLength: 2000 }} />
            </CardContent>
          </Card>
        )}

        {activeTab === 3 && (
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6" fontWeight="bold">Weekly Availability</Typography>
                <Button variant="outlined" onClick={() => setOpenAvailDialog(true)}>Add Time Slot</Button>
              </Box>
              <Grid container spacing={2}>
                {availability.map((avail) => (
                  <Grid item xs={12} sm={6} md={4} key={avail.avail_id}>
                    <Paper variant="outlined" sx={{ p: 2, position: 'relative' }}>
                      <Typography variant="subtitle1" fontWeight="bold">{avail.day_of_week}</Typography>
                      <Typography variant="body2">{avail.start_time} - {avail.end_time}</Typography>
                      <IconButton size="small" onClick={() => handleRemoveAvail(avail.avail_id)} sx={{ position: 'absolute', top: 8, right: 8 }}>
                        <Cancel color="error" fontSize="small" />
                      </IconButton>
                    </Paper>
                  </Grid>
                ))}
                {availability.length === 0 && <Grid item xs={12}><Typography align="center" color="text.secondary" sx={{ py: 4 }}>No availability slots added.</Typography></Grid>}
              </Grid>
            </CardContent>
          </Card>
        )}

        <Dialog open={openAvailDialog} onClose={() => setOpenAvailDialog(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Add Availability</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Select required value={newAvail.day_of_week} onChange={(e) => setNewAvail({...newAvail, day_of_week: e.target.value})}>
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
              </Select>
              <TextField required type="time" label="Start" value={newAvail.start_time} onChange={(e) => setNewAvail({...newAvail, start_time: e.target.value})} InputLabelProps={{ shrink: true }} />
              <TextField required type="time" label="End" value={newAvail.end_time} onChange={(e) => setNewAvail({...newAvail, end_time: e.target.value})} InputLabelProps={{ shrink: true }} />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAvailDialog(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleAddAvail}>Add Slot</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </motion.div>
  );
};

export default TeacherProfile;
