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
  IconButton,
  MenuItem,
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
  Work,
  School,
  EmojiEvents,
  LinkedIn,
  LocationOn,
  CalendarMonth,
  Business,
  Add,
  Delete,
  TrendingUp,
  Language,
  Description,
  Star,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import StatusBadge from '../../components/Common/StatusBadge';
import StatCard from '../../components/Common/StatCard';
import { pageTransition } from '../../utils/animations';
import { alumniAPI } from '../../api/alumni';
import { authAPI } from '../../api/auth';

const AlumniProfile = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [newAchievement, setNewAchievement] = useState('');
  
  // Form data
  const [formData, setFormData] = useState({
    name: user?.first_name ? `${user.first_name} ${user.last_name || ''}` : '',
    email: user?.email || '',
    graduationYear: '',
    major: '',
    degree: '',
    currentCompany: '',
    position: '',
    location: '',
    linkedIn: '',
    phone: user?.phone || '',
    personalWebsite: '',
    careerStart: '',
    rollNo: '',
    cgpa: '',
    achievements: [],
  });

  const normalizeAchievements = (value) => {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [value];
      } catch {
        return value.split(',').map((item) => item.trim()).filter(Boolean);
      }
    }
    return [];
  };

  const mapProfileToForm = (profile) => ({
    name: user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : '',
    email: user?.email || '',
    graduationYear: profile?.grad_year || '',
    major: profile?.degree || '',
    degree: profile?.degree || '',
    currentCompany: profile?.current_employer || '',
    position: profile?.current_position || '',
    location: profile?.location || '',
    linkedIn: profile?.linkedin_url || '',
    phone: user?.phone || '',
    personalWebsite: '',
    careerStart: '',
    rollNo: profile?.student_id || '',
    cgpa: '',
    achievements: normalizeAchievements(profile?.achievements),
  });

  const [careerTimeline, setCareerTimeline] = useState([]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await alumniAPI.getProfile();
        const d = res.data;
        if (d) {
          setFormData(mapProfileToForm(d));
        }
      } catch (e) { console.error(e); }
    };
    fetchProfile();
  }, [user]);

  // Stats
  const stats = [
    { title: 'Graduation Year', value: formData.graduationYear, icon: School, color: 'primary', tooltip: 'Year of graduation' },
    { title: 'Experience', value: formData.graduationYear ? `${new Date().getFullYear() - parseInt(formData.graduationYear, 10)} Years` : '-', icon: TrendingUp, color: 'success', tooltip: 'Years since graduation' },
    { title: 'Achievements', value: formData.achievements.length, icon: EmojiEvents, color: 'warning', tooltip: 'Total achievements' },
    { title: 'CGPA', value: formData.cgpa, icon: Star, color: 'info', tooltip: 'Final CGPA' },
  ];

  // Career timeline
  // careerTimeline loaded from API above

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddAchievement = () => {
    if (newAchievement.trim()) {
      setFormData(prev => ({
        ...prev,
        achievements: [...prev.achievements, newAchievement],
      }));
      setNewAchievement('');
      setSnackbar({ open: true, message: 'Achievement added!', severity: 'success' });
    }
  };

  const handleDeleteAchievement = (index) => {
    setFormData(prev => ({
      ...prev,
      achievements: prev.achievements.filter((_, i) => i !== index),
    }));
    setSnackbar({ open: true, message: 'Achievement removed!', severity: 'info' });
  };

  const handleSave = async () => {
    try {
      const [first_name, ...lastParts] = (formData.name || '').trim().split(' ');
      const last_name = lastParts.join(' ');

      await authAPI.updateProfile({
        first_name: first_name || null,
        last_name: last_name || null,
        email: formData.email || null,
        phone: formData.phone || null,
      });

      await alumniAPI.updateProfile({
        degree: formData.degree || null,
        current_employer: formData.currentCompany || null,
        current_position: formData.position || null,
        location: formData.location || null,
        linkedin_url: formData.linkedIn || null,
        achievements: JSON.stringify(formData.achievements || []),
      });

      setIsEditing(false);
      setSnackbar({ open: true, message: 'Profile updated successfully!', severity: 'success' });
    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: 'Failed to update profile', severity: 'error' });
    }
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
            Alumni Profile
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Connect with fellow alumni and showcase your professional journey
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
            <Tab icon={<Person />} label="Personal" iconPosition="start" />
            <Tab icon={<Work />} label="Professional" iconPosition="start" />
            <Tab icon={<EmojiEvents />} label="Achievements" iconPosition="start" />
            <Tab icon={<Settings />} label="Settings" iconPosition="start" />
          </Tabs>
        </Card>

        {/* TAB 1: Personal Information */}
        {activeTab === 0 && (
          <Box>
            {/* Profile Header Card */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Grid container spacing={3} alignItems="center">
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <Box
                      sx={{
                        position: 'relative',
                        '&:hover .avatar-overlay': {
                          opacity: 1,
                        },
                      }}
                    >
                      <Avatar
                        sx={{ width: 120, height: 120, bgcolor: 'success.main' }}
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
                      <Chip icon={<Work />} label={formData.position} color="success" />
                      <Chip icon={<Business />} label={formData.currentCompany} color="primary" />
                      <Chip icon={<School />} label={`Class of ${formData.graduationYear}`} />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, mb: 1, flexWrap: 'wrap' }}>
                      <Typography variant="body2" color="text.secondary">
                        <Email fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                        {formData.email}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <LocationOn fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                        {formData.location}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="primary" sx={{ cursor: 'pointer' }}>
                      <LinkedIn fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                      {formData.linkedIn}
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

            {/* Academic Background */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Academic Background
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Roll Number"
                      value={formData.rollNo}
                      disabled
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Degree"
                      value={formData.degree}
                      disabled
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Major"
                      value={formData.major}
                      disabled
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Graduation Year"
                      value={formData.graduationYear}
                      disabled
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="CGPA"
                      value={formData.cgpa}
                      disabled
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
                      label="Email"
                      value={formData.email}
                      onChange={(e) => handleFieldChange('email', e.target.value)}
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
                            <LinkedIn />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Personal Website"
                      value={formData.personalWebsite}
                      onChange={(e) => handleFieldChange('personalWebsite', e.target.value)}
                      disabled={!isEditing}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Language />
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

        {/* TAB 2: Professional Information */}
        {activeTab === 1 && (
          <Box>
            {/* Current Position */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Current Position
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Current Company"
                      value={formData.currentCompany}
                      onChange={(e) => handleFieldChange('currentCompany', e.target.value)}
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
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Position"
                      value={formData.position}
                      onChange={(e) => handleFieldChange('position', e.target.value)}
                      disabled={!isEditing}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Work />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Location"
                      value={formData.location}
                      onChange={(e) => handleFieldChange('location', e.target.value)}
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
                      label="Career Start Date"
                      type="month"
                      value={formData.careerStart}
                      onChange={(e) => handleFieldChange('careerStart', e.target.value)}
                      disabled={!isEditing}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Career Timeline */}
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Career Timeline
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <List>
                  {careerTimeline.map((item, index) => (
                    <ListItem
                      key={index}
                      sx={{
                        bgcolor: index === 0 ? 'action.selected' : 'action.hover',
                        borderRadius: 2,
                        mb: 2,
                        borderLeft: '4px solid',
                        borderColor: index === 0 ? 'primary.main' : 'divider',
                      }}
                    >
                      <ListItemText
                        primary={
                          <Typography variant="h6" fontWeight="600">
                            {item.title}
                          </Typography>
                        }
                        secondary={
                          <React.Fragment>
                            <Box component="span" sx={{ display: 'block', mt: 1 }}>
                              <Chip size="small" label={item.year} color="primary" sx={{ mr: 1 }} />
                              <Chip size="small" icon={<Business />} label={item.company} sx={{ mr: 1 }} />
                              <Chip size="small" icon={<LocationOn />} label={item.location} />
                            </Box>
                          </React.Fragment>
                        }
                        secondaryTypographyProps={{ component: 'div' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* TAB 3: Achievements & Awards */}
        {activeTab === 2 && (
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Achievements & Awards
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              {isEditing && (
                <Box sx={{ mb: 3 }}>
                  <TextField
                    fullWidth
                    label="Add New Achievement"
                    value={newAchievement}
                    onChange={(e) => setNewAchievement(e.target.value)}
                    multiline
                    rows={2}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={handleAddAchievement} color="primary">
                            <Add />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
              )}

              <List>
                {formData.achievements.map((achievement, index) => (
                  <ListItem
                    key={index}
                    sx={{
                      bgcolor: 'action.hover',
                      borderRadius: 2,
                      mb: 2,
                    }}
                    secondaryAction={
                      isEditing && (
                        <IconButton edge="end" onClick={() => handleDeleteAchievement(index)}>
                          <Delete />
                        </IconButton>
                      )
                    }
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <EmojiEvents color="warning" />
                          <Typography>{achievement}</Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
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
                Manage your profile visibility and notification preferences
              </Alert>
              <Stack spacing={2}>
                <Button variant="outlined" fullWidth>
                  Change Password
                </Button>
                <Button variant="outlined" fullWidth>
                  Privacy Settings
                </Button>
                <Button variant="outlined" fullWidth>
                  Notification Preferences
                </Button>
              </Stack>
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

export default AlumniProfile;
