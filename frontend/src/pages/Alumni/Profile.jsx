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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  IconButton,
  MenuItem,
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
import { useSnackbar } from '../../contexts/SnackbarContext';
import StatusBadge from '../../components/Common/StatusBadge';
import StatCard from '../../components/Common/StatCard';
import { pageTransition } from '../../utils/animations';
import { alumniAPI } from '../../api/alumni';
import { authAPI } from '../../api/auth';

const AlumniProfile = () => {
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [activeTab, setActiveTab] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [newAchievement, setNewAchievement] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileExists, setProfileExists] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    graduationYear: '',
    major: '',
    degree: '',
    currentCompany: '',
    position: '',
    location: '',
    linkedIn: '',
    phone: '',
    personalWebsite: '',
    careerStart: '',
    rollNo: '',
    cgpa: '',
    achievements: [],
    photoUrl: '',
    companyLogo: '',
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

  const mapProfileToForm = (profile, u) => ({
    name: u?.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : '',
    email: u?.email || '',
    graduationYear: profile?.grad_year || '',
    major: profile?.degree || '',
    degree: profile?.degree || '',
    currentCompany: profile?.current_employer || '',
    position: profile?.current_position || '',
    location: profile?.location || '',
    linkedIn: profile?.linkedin_url || '',
    phone: u?.phone || '',
    personalWebsite: '',
    careerStart: '',
    rollNo: profile?.student_id || u?.student_id || '',
    cgpa: '',
    achievements: normalizeAchievements(profile?.achievements),
    photoUrl: profile?.photo_url || '',
    companyLogo: profile?.company_logo || '',
  });

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await alumniAPI.getProfile();
      const d = res.data;
      if (d) {
        setFormData(mapProfileToForm(d, user));
        setProfileExists(true);
      }
    } catch (e) { 
      if (e.response?.status === 404) {
        setProfileExists(false);
        setFormData(mapProfileToForm(null, user));
      } else {
        showSnackbar('Failed to fetch profile', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  // Stats
  const stats = [
    { title: 'Graduation Year', value: formData.graduationYear || '-', icon: School, color: 'primary', tooltip: 'Year of graduation' },
    { title: 'Experience', value: formData.graduationYear ? `${new Date().getFullYear() - parseInt(formData.graduationYear, 10)} Years` : '-', icon: TrendingUp, color: 'success', tooltip: 'Years since graduation' },
    { title: 'Achievements', value: formData.achievements.length, icon: EmojiEvents, color: 'warning', tooltip: 'Total achievements' },
    { title: 'Profile Status', value: profileExists ? 'Registered' : 'Pending', icon: Star, color: profileExists ? 'success' : 'warning', tooltip: 'Account registration status' },
  ];

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
      showSnackbar('Achievement added!', 'success');
    }
  };

  const handleDeleteAchievement = (index) => {
    setFormData(prev => ({
      ...prev,
      achievements: prev.achievements.filter((_, i) => i !== index),
    }));
    showSnackbar('Achievement removed!', 'info');
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const [first_name, ...lastParts] = (formData.name || '').trim().split(' ');
      const last_name = lastParts.join(' ');

      // 1. Update Auth Profile
      await authAPI.updateProfile({
        first_name: first_name || null,
        last_name: last_name || null,
        email: formData.email || null,
        phone: formData.phone || null,
      });

      // 2. Map Payload
      const payload = {
        degree: formData.degree || null,
        current_employer: formData.currentCompany || null,
        current_position: formData.position || null,
        location: formData.location || null,
        linkedin_url: formData.linkedIn || null,
        achievements: JSON.stringify(formData.achievements || []),
        photo_url: formData.photoUrl || null,
        company_logo: formData.companyLogo || null,
        grad_year: parseInt(formData.graduationYear) || new Date().getFullYear(),
      };

      // 3. Register or Update Alumni Profile
      if (!profileExists) {
        if (!formData.rollNo) {
          showSnackbar('Roll Number (Student ID) is required for registration', 'error');
          setSaving(false);
          return;
        }
        await alumniAPI.register({
          ...payload,
          student_id: parseInt(formData.rollNo),
        });
      } else {
        await alumniAPI.updateProfile(payload);
      }

      await fetchProfile();
      setIsEditing(false);
      showSnackbar(profileExists ? 'Profile updated successfully!' : 'Alumni registration successful!', 'success');
    } catch (e) {
      console.error(e);
      showSnackbar(e.response?.data?.detail || 'Failed to save changes', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    fetchProfile();
  };

  const handleImageUpload = (event, field) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showSnackbar('Image size should be less than 2MB', 'warning');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, [field]: reader.result }));
        showSnackbar(`${field === 'photoUrl' ? 'Profile picture' : 'Company logo'} updated!`, 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <motion.div {...pageTransition}>
      <Box className="page-container">
        {/* Page Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Alumni Profile
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {profileExists ? 'Connect with fellow alumni and showcase your professional journey' : 'Complete your registration to join the elite Alumni Network'}
          </Typography>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {stats.map((stat, index) => (
            <Grid key={index} item xs={12} sm={6} md={3}>
              <StatCard {...stat} />
            </Grid>
          ))}
        </Grid>

        {!profileExists && (
           <Alert severity="warning" sx={{ mb: 3, borderRadius: 3 }}>
             <strong>Action Required:</strong> You are not yet registered in the Alumni Registry. Please click "Edit Profile", enter your <strong>Roll Number (Student ID)</strong> and graduation details to register.
           </Alert>
        )}

        {/* Tabs */}
        <Card sx={{ mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab icon={<Person />} label="Personal" iconPosition="start" />
            <Tab icon={<Work />} label="Professional" iconPosition="start" />
            <Tab icon={<EmojiEvents />} label="Achievements" iconPosition="start" />
          </Tabs>
        </Card>

        {/* TAB 1: Personal Information */}
        {activeTab === 0 && (
          <Box>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Grid container spacing={3} alignItems="center">
                  <Grid item xs={12} sm={2}>
                    <Box sx={{ position: 'relative', width: 120, height: 120 }}>
                      <Avatar
                        src={formData.photoUrl}
                        sx={{ width: 120, height: 120, bgcolor: 'primary.main', border: '4px solid', borderColor: 'background.paper', boxShadow: 3 }}
                      >
                        {formData.name[0] || 'A'}
                      </Avatar>
                      {isEditing && (
                        <IconButton
                          component="label"
                          sx={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            bgcolor: 'background.paper',
                            boxShadow: 2,
                            '&:hover': { bgcolor: 'grey.100' }
                          }}
                        >
                          <input hidden accept="image/*" type="file" onChange={(e) => handleImageUpload(e, 'photoUrl')} />
                          <PhotoCamera fontSize="small" color="primary" />
                        </IconButton>
                      )}
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={7}>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                      {formData.name || 'Anonymous Alumni'}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                      <Chip icon={<Work />} label={formData.position || 'Alumnus'} color="success" size="small" />
                      <Chip icon={<Business />} label={formData.currentCompany || 'Freelance'} color="primary" size="small" />
                      {formData.graduationYear && <Chip icon={<School />} label={`Class of ${formData.graduationYear}`} size="small" />}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      <Email fontSize="inherit" sx={{ mr: 1, verticalAlign: 'middle' }} />
                      {formData.email}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    {!isEditing ? (
                      <Button variant="contained" startIcon={<Edit />} onClick={() => setIsEditing(true)} fullWidth>
                        Edit Profile
                      </Button>
                    ) : (
                      <Stack spacing={1}>
                        <Button variant="contained" startIcon={<Save />} onClick={handleSave} fullWidth disabled={saving}>
                          {saving ? <CircularProgress size={20} color="inherit" /> : 'Save Changes'}
                        </Button>
                        <Button variant="outlined" startIcon={<Cancel />} onClick={handleCancel} fullWidth disabled={saving}>
                          Cancel
                        </Button>
                      </Stack>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>Academic Info</Typography>
                    <Divider sx={{ mb: 3 }} />
                    <Stack spacing={2.5}>
                      <TextField
                        fullWidth
                        label="Roll Number / Student ID"
                        value={formData.rollNo}
                        onChange={(e) => handleFieldChange('rollNo', e.target.value)}
                        disabled={!isEditing || profileExists}
                        required
                        helperText={!profileExists ? "Verification required for first-time registration" : ""}
                      />
                      <TextField
                        fullWidth
                        label="Degree Program"
                        value={formData.degree}
                        onChange={(e) => handleFieldChange('degree', e.target.value)}
                        disabled={!isEditing}
                        placeholder="e.g. BS Computer Science"
                      />
                      <TextField
                        fullWidth
                        label="Graduation Year"
                        value={formData.graduationYear}
                        onChange={(e) => handleFieldChange('graduationYear', e.target.value)}
                        disabled={!isEditing}
                        placeholder="e.g. 2024"
                      />
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>Contact & Social</Typography>
                    <Divider sx={{ mb: 3 }} />
                    <Stack spacing={2.5}>
                      <TextField
                        fullWidth
                        label="Full Name"
                        value={formData.name}
                        onChange={(e) => handleFieldChange('name', e.target.value)}
                        disabled={!isEditing}
                      />
                      <TextField
                        fullWidth
                        label="LinkedIn URL"
                        value={formData.linkedIn}
                        onChange={(e) => handleFieldChange('linkedIn', e.target.value)}
                        disabled={!isEditing}
                        InputProps={{ startAdornment: <InputAdornment position="start"><LinkedIn color="primary" /></InputAdornment> }}
                      />
                      <TextField
                        fullWidth
                        label="Location"
                        value={formData.location}
                        onChange={(e) => handleFieldChange('location', e.target.value)}
                        disabled={!isEditing}
                        InputProps={{ startAdornment: <InputAdornment position="start"><LocationOn color="error" /></InputAdornment> }}
                      />
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* TAB 2: Professional Information */}
        {activeTab === 1 && (
          <Box>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>Employment Details</Typography>
                <Divider sx={{ mb: 3 }} />
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Current Company"
                      value={formData.currentCompany}
                      onChange={(e) => handleFieldChange('currentCompany', e.target.value)}
                      disabled={!isEditing}
                      InputProps={{ startAdornment: <InputAdornment position="start"><Business /></InputAdornment> }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Your Designation"
                      value={formData.position}
                      onChange={(e) => handleFieldChange('position', e.target.value)}
                      disabled={!isEditing}
                      InputProps={{ startAdornment: <InputAdornment position="start"><Work /></InputAdornment> }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>Company Logo</Typography>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar src={formData.companyLogo} variant="rounded" sx={{ width: 80, height: 80, border: '1px solid', borderColor: 'divider' }}>
                        <Business />
                      </Avatar>
                      {isEditing && (
                        <Button variant="outlined" component="label" size="small">
                          Change Logo
                          <input hidden accept="image/*" type="file" onChange={(e) => handleImageUpload(e, 'companyLogo')} />
                        </Button>
                      )}
                    </Stack>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* TAB 3: Achievements */}
        {activeTab === 2 && (
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>Achievements & Honors</Typography>
              <Divider sx={{ mb: 3 }} />
              {isEditing && (
                <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Add Achievement"
                    value={newAchievement}
                    onChange={(e) => setNewAchievement(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddAchievement()}
                  />
                  <Button variant="contained" onClick={handleAddAchievement} startIcon={<Add />}>Add</Button>
                </Box>
              )}
              <List>
                {formData.achievements.map((ach, i) => (
                  <ListItem key={i} sx={{ bgcolor: 'action.hover', borderRadius: 2, mb: 1 }} secondaryAction={isEditing && <IconButton edge="end" onClick={() => handleDeleteAchievement(i)}><Delete color="error" /></IconButton>}>
                    <ListItemIcon><EmojiEvents color="warning" /></ListItemIcon>
                    <ListItemText primary={ach} />
                  </ListItem>
                ))}
                {formData.achievements.length === 0 && <Typography color="text.secondary" align="center" sx={{ py: 4 }}>No achievements added yet.</Typography>}
              </List>
            </CardContent>
          </Card>
        )}
      </Box>
    </motion.div>
  );
};

export default AlumniProfile;
