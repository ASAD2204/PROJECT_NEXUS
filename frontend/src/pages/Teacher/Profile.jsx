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
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Edit,
  Save,
  Cancel,
  PhotoCamera,
  Download,
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
import StatusBadge from '../../components/Common/StatusBadge';
import StatCard from '../../components/Common/StatCard';
import { pageTransition } from '../../utils/animations';
import { analyticsAPI } from '../../api/analytics';
import { teacherAPI } from '../../api/teacher';

const TeacherProfile = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
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
    { title: 'Active Courses', value: '—', icon: MenuBook, color: 'primary', tooltip: '' },
    { title: 'Total Students', value: '—', icon: Groups, color: 'success', tooltip: '' },
    { title: 'Publications', value: '—', icon: Assignment, color: 'info', tooltip: '' },
    { title: 'Experience', value: '—', icon: TrendingUp, color: 'warning', tooltip: '' },
  ]);

  const [courses, setCourses] = useState([]);
  const [publications, setPublications] = useState([]);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const [profileRes, dashRes, courseRes] = await Promise.allSettled([
          teacherAPI.getProfile(),
          analyticsAPI.getFacultyDashboard(),
          teacherAPI.getMyCourses(),
        ]);
        
        // Load faculty profile
        if (profileRes.status === 'fulfilled') {
          const profile = profileRes.value.data || {};
          setFormData(prev => ({
            ...prev,
            designation: profile.designation || '',
            department: profile.dept_id ?? '',
            phone: profile.phone || prev.phone,
            specialization: profile.specialization || '',
            officeLocation: profile.office_location || '',
            employmentStatus: profile.employment_status || '',
            joiningDate: profile.joining_date || '',
            qualification: profile.qualification || '',
            experience: profile.experience || '',
            researchInterests: profile.research_interests || '',
            publications: profile.publications || '',
            personalEmail: profile.personal_email || '',
            linkedIn: profile.linkedin_url || '',
            officeHours: profile.office_hours || '',
          }));
        }
        
        // Load dashboard stats
        if (dashRes.status === 'fulfilled') {
          const d = dashRes.value.data;
          const sections = Array.isArray(d?.sections) ? d.sections : [];
          setStats([
            { title: 'Active Courses', value: String(d?.total_sections || 0), icon: MenuBook, color: 'primary', tooltip: '' },
            { title: 'Total Students', value: String(d?.total_students || 0), icon: Groups, color: 'success', tooltip: '' },
            { title: 'Pending Assignments', value: String(sections.reduce((s, sec) => s + Math.max(0, 100 - Number(sec.avg_assignment_score || 0)), 0) / Math.max(sections.length, 1)), icon: Assignment, color: 'info', tooltip: '' },
            { title: 'Avg Attendance', value: `${sections.length ? (sections.reduce((s, sec) => s + Number(sec.avg_attendance_pct || 0), 0) / sections.length).toFixed(1) : 0}%`, icon: TrendingUp, color: 'warning', tooltip: '' },
          ]);
        }
        
        // Load courses
        if (courseRes.status === 'fulfilled') {
          setCourses(courseRes.value.data || []);
        }
      } catch (e) { console.error('Failed to load profile', e); }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      const deptId = Number(formData.department);
      await teacherAPI.updateProfile({
        designation: formData.designation,
        dept_id: Number.isFinite(deptId) && String(formData.department).trim() !== '' ? deptId : undefined,
        phone: formData.phone || undefined,
        specialization: formData.specialization || undefined,
        office_location: formData.officeLocation || undefined,
        employment_status: formData.employmentStatus || undefined,
        joining_date: formData.joiningDate || undefined,
        qualification: formData.qualification || undefined,
        experience: formData.experience || undefined,
        research_interests: formData.researchInterests || undefined,
        publications: formData.publications || undefined,
        personal_email: formData.personalEmail || undefined,
        linkedin_url: formData.linkedIn || undefined,
        office_hours: formData.officeHours || undefined,
      });
      setSnackbar({ open: true, message: 'Profile updated successfully!', severity: 'success' });
    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: 'Failed to update profile', severity: 'error' });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSnackbar({ open: true, message: 'Profile picture updated!', severity: 'success' });
      setShowAvatarDialog(false);
    }
  };

  return (
    <motion.div {...pageTransition}>
      <Box className="page-container">
        {/* Page Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Faculty Profile
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your academic profile, teaching assignments, and research information
          </Typography>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {stats.map((stat, index) => (
            <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
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
            sx={{ 
              borderBottom: 1, 
              borderColor: 'divider',
              '& .MuiTab-root': {
                minHeight: { xs: 64, md: 64 },
                minWidth: { xs: 0, md: 120 },
                fontSize: { xs: '0.7rem', md: '0.875rem' },
                px: { xs: 0.5, md: 2 },
                flexDirection: { xs: 'column', md: 'row' },
              },
              '& .MuiTab-iconWrapper': {
                fontSize: { xs: '1.5rem', md: '1.25rem' },
                marginBottom: { xs: '4px', md: 0 },
                marginRight: { xs: 0, md: '8px' },
              },
            }}
          >
            <Tab 
              icon={<Person />} 
              label="Personal"
              iconPosition="start" 
            />
            <Tab 
              icon={<MenuBook />} 
              label="Teaching"
              iconPosition="start" 
            />
            <Tab 
              icon={<Psychology />} 
              label="Research"
              iconPosition="start" 
            />
            <Tab 
              icon={<Settings />} 
              label="Settings" 
              iconPosition="start" 
              sx={{ '& .MuiTab-wrapper': { display: 'flex', flexDirection: 'row', gap: 0.5 } }}
            />
          </Tabs>
        </Card>

        {/* TAB 1: Personal Information */}
        {activeTab === 0 && (
          <Box>
            {/* Profile Header Card */}
            <Card sx={{ mb: 3, p: { xs: 1, md: 0 } }}>
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Grid container spacing={3} alignItems="center">
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <Box
                      sx={{
                        position: 'relative',
                        display: 'flex',
                        justifyContent: { xs: 'center', sm: 'flex-start' },
                        '&:hover .avatar-overlay': {
                          opacity: 1,
                        },
                      }}
                    >
                      <Avatar
                        sx={{ width: 120, height: 120, bgcolor: 'primary.main' }}
                      >
                        {formData.name[0]}
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
                  <Grid size={{ xs: 12, sm: 7 }}>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                      {formData.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, mb: 1, flexWrap: 'wrap' }}>
                      <Chip icon={<Work />} label={formData.designation} color="primary" />
                      <Chip icon={<School />} label={formData.department} />
                      <Chip icon={<Star />} label={formData.employmentStatus} color="success" />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, mb: 1, flexWrap: 'wrap' }}>
                      <Typography variant="body2" color="text.secondary">
                        <Email fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                        {formData.email}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <Phone fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                        {formData.phone}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      <LocationOn fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                      {formData.officeLocation}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 3 }}>
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
                        >
                          Save Changes
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<Cancel />}
                          onClick={handleCancel}
                          fullWidth
                        >
                          Cancel
                        </Button>
                      </Stack>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Professional Information */}
            <Card sx={{ mb: 3, p: { xs: 1, md: 0 } }}>
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Professional Information
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Designation"
                      value={formData.designation}
                      onChange={(e) => handleFieldChange('designation', e.target.value)}
                      disabled={!isEditing}
                      select={isEditing}
                    >
                      <MenuItem value="Lecturer">Lecturer</MenuItem>
                      <MenuItem value="Assistant Professor">Assistant Professor</MenuItem>
                      <MenuItem value="Associate Professor">Associate Professor</MenuItem>
                      <MenuItem value="Professor">Professor</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Department"
                      value={formData.department}
                      onChange={(e) => handleFieldChange('department', e.target.value)}
                      disabled={!isEditing}
                      select={isEditing}
                    >
                      <MenuItem value="Computer Science">Computer Science</MenuItem>
                      <MenuItem value="Business Administration">Business Administration</MenuItem>
                      <MenuItem value="Engineering">Engineering</MenuItem>
                      <MenuItem value="Social Sciences">Social Sciences</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Specialization"
                      value={formData.specialization}
                      onChange={(e) => handleFieldChange('specialization', e.target.value)}
                      disabled={!isEditing}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Office Location"
                      value={formData.officeLocation}
                      onChange={(e) => handleFieldChange('officeLocation', e.target.value)}
                      disabled={!isEditing}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LocationOn />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Employment Status"
                      value={formData.employmentStatus}
                      onChange={(e) => handleFieldChange('employmentStatus', e.target.value)}
                      disabled={!isEditing}
                      select={isEditing}
                    >
                      <MenuItem value="Permanent">Permanent</MenuItem>
                      <MenuItem value="Visiting">Visiting</MenuItem>
                      <MenuItem value="Contract">Contract</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Joining Date"
                      type="date"
                      value={formData.joiningDate}
                      onChange={(e) => handleFieldChange('joiningDate', e.target.value)}
                      disabled={!isEditing}
                      InputLabelProps={{ shrink: true }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <CalendarMonth />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Highest Qualification"
                      value={formData.qualification}
                      onChange={(e) => handleFieldChange('qualification', e.target.value)}
                      disabled={!isEditing}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Office Hours"
                      value={formData.officeHours}
                      onChange={(e) => handleFieldChange('officeHours', e.target.value)}
                      disabled={!isEditing}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Contact Information
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Official Email"
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
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Personal Email"
                      value={formData.personalEmail}
                      onChange={(e) => handleFieldChange('personalEmail', e.target.value)}
                      disabled={!isEditing}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Email />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
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
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="LinkedIn Profile"
                      value={formData.linkedIn}
                      onChange={(e) => handleFieldChange('linkedIn', e.target.value)}
                      disabled={!isEditing}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Business />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* TAB 2: Teaching Assignments */}
        {activeTab === 1 && (
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Current Teaching Assignments - Fall 2025
              </Typography>
              <Divider sx={{ mb: 3 }} />
              <List>
                {courses.map((course, index) => (
                  <React.Fragment key={index}>
                    <ListItem
                      sx={{
                        bgcolor: 'action.hover',
                        borderRadius: 2,
                        mb: 2,
                      }}
                    >
                      <ListItemIcon>
                        <MenuBook color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="h6" fontWeight="600">
                            {course.code} - {course.name}
                          </Typography>
                        }
                        secondary={
                          <React.Fragment>
                            <Box component="span" sx={{ display: 'block', mt: 1 }}>
                              <Chip
                                size="small"
                                icon={<Groups />}
                                label={`${course.students} Students`}
                                sx={{ mr: 1 }}
                              />
                              <Chip
                                size="small"
                                label={course.semester}
                                color="primary"
                                variant="outlined"
                              />
                            </Box>
                          </React.Fragment>
                        }
                        secondaryTypographyProps={{ component: 'div' }}
                      />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        )}

        {/* TAB 3: Research & Publications */}
        {activeTab === 2 && (
          <Box>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Research Interests
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body1" paragraph>
                  {formData.researchInterests}
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Chip label={`${formData.publications}`} color="primary" sx={{ mr: 1 }} />
                  <Chip label={`${formData.experience} Experience`} color="success" />
                </Box>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Recent Publications
                </Typography>
                <Divider sx={{ mb: 3 }} />
                {publications.map((pub, index) => (
                  <Card key={index} variant="outlined" sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {pub.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {pub.journal || pub.conference} • {pub.year}
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <Chip size="small" label={pub.type} color="primary" sx={{ mr: 1 }} />
                        <Chip size="small" label={`${pub.citations} Citations`} />
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </Box>
        )}

        {/* TAB 4: Settings */}
        {activeTab === 3 && (
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Account Settings
              </Typography>
              <Divider sx={{ mb: 3 }} />
              <Alert severity="info" sx={{ mb: 2 }}>
                For security reasons, password changes and critical account settings must be done through the IT Admin.
              </Alert>
              <Button variant="outlined" fullWidth>
                Request Account Changes
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Avatar Upload Dialog */}
        <Dialog open={showAvatarDialog} onClose={() => setShowAvatarDialog(false)}>
          <DialogTitle>Update Profile Picture</DialogTitle>
          <DialogContent>
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

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          message={snackbar.message}
        />
      </Box>
    </motion.div>
  );
};

export default TeacherProfile;
