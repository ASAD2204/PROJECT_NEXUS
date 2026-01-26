import React, { useState } from 'react';
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
import StatusBadge from '../../components/Common/StatusBadge';
import StatCard from '../../components/Common/StatCard';
import { pageTransition } from '../../utils/animations';

const LibrarianProfile = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Form data
  const [formData, setFormData] = useState({
    name: 'Fatima Khan',
    employeeId: 'LIB-2024-015',
    email: 'fatima.khan@nexus.edu.pk',
    phone: '+92 300 5556789',
    shift: 'Morning',
    assignedSection: 'Computer Science & IT',
    joiningDate: '2024-03-01',
    experience: '5 years',
    qualification: 'Masters in Library Science',
    workingHours: '8:00 AM - 4:00 PM',
    emergencyContact: '+92 301 1234567',
  });

  // Stats
  const stats = [
    { title: 'Books Issued Today', value: '28', icon: MenuBook, color: 'primary', tooltip: 'Books issued today' },
    { title: 'Pending Returns', value: '45', icon: Assignment, color: 'warning', tooltip: 'Books due for return' },
    { title: 'New Arrivals', value: '12', icon: AutoStories, color: 'success', tooltip: 'New books this week' },
    { title: 'Total Collection', value: '5,234', icon: LocalLibrary, color: 'info', tooltip: 'Books in assigned section' },
  ];

  // Library sections
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

  // Today's activity
  const todayActivity = [
    { action: 'Issued', bookTitle: 'Data Structures & Algorithms', student: 'Ali Ahmed', time: '9:30 AM' },
    { action: 'Returned', bookTitle: 'Database Systems', student: 'Sara Khan', time: '10:15 AM' },
    { action: 'Issued', bookTitle: 'Machine Learning Basics', student: 'Hassan Raza', time: '11:00 AM' },
    { action: 'Renewed', bookTitle: 'Software Engineering', student: 'Ayesha Malik', time: '12:30 PM' },
    { action: 'Issued', bookTitle: 'Web Development', student: 'Usman Ali', time: '2:00 PM' },
  ];

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    setIsEditing(false);
    setSnackbar({ open: true, message: 'Profile updated successfully!', severity: 'success' });
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
            Librarian Profile
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your profile and library work details
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
            <Tab icon={<LocalLibrary />} label="Work" iconPosition="start" />
            <Tab icon={<Assignment />} label="Activity" iconPosition="start" />
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
                        sx={{ width: 120, height: 120, bgcolor: 'info.main' }}
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
                      <Chip icon={<LocalLibrary />} label="Librarian" color="info" />
                      <Chip icon={<BadgeIcon />} label={formData.employeeId} />
                      <Chip 
                        icon={formData.shift === 'Morning' ? <WbSunny /> : <NightsStay />} 
                        label={`${formData.shift} Shift`}
                        color={formData.shift === 'Morning' ? 'warning' : 'primary'}
                      />
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
                      <MenuBook fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                      {formData.assignedSection}
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

            {/* Basic Information */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Basic Information
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Full Name"
                      value={formData.name}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                      disabled={!isEditing}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
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
                  <Grid size={{ xs: 12, md: 6 }}>
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
                      label="Emergency Contact"
                      value={formData.emergencyContact}
                      onChange={(e) => handleFieldChange('emergencyContact', e.target.value)}
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
                      label="Qualification"
                      value={formData.qualification}
                      onChange={(e) => handleFieldChange('qualification', e.target.value)}
                      disabled={!isEditing}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* TAB 2: Work Details */}
        {activeTab === 1 && (
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Work Details
              </Typography>
              <Divider sx={{ mb: 3 }} />
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Shift"
                    value={formData.shift}
                    onChange={(e) => handleFieldChange('shift', e.target.value)}
                    disabled={!isEditing}
                    select={isEditing}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          {formData.shift === 'Morning' ? <WbSunny /> : <NightsStay />}
                        </InputAdornment>
                      ),
                    }}
                  >
                    <MenuItem value="Morning">Morning Shift</MenuItem>
                    <MenuItem value="Evening">Evening Shift</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Assigned Section"
                    value={formData.assignedSection}
                    onChange={(e) => handleFieldChange('assignedSection', e.target.value)}
                    disabled={!isEditing}
                    select={isEditing}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LocalLibrary />
                        </InputAdornment>
                      ),
                    }}
                  >
                    {librarySections.map((section) => (
                      <MenuItem key={section} value={section}>
                        {section}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Working Hours"
                    value={formData.workingHours}
                    disabled
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <AccessTime />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Joining Date"
                    type="date"
                    value={formData.joiningDate}
                    disabled
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
                    label="Experience"
                    value={formData.experience}
                    disabled
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* TAB 3: Today's Activity */}
        {activeTab === 2 && (
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Today's Activity Log
              </Typography>
              <Divider sx={{ mb: 3 }} />
              <List>
                {todayActivity.map((activity, index) => (
                  <ListItem
                    key={index}
                    sx={{
                      bgcolor: 'action.hover',
                      borderRadius: 2,
                      mb: 2,
                      borderLeft: '4px solid',
                      borderColor: 
                        activity.action === 'Issued' ? 'success.main' :
                        activity.action === 'Returned' ? 'info.main' :
                        'warning.main',
                    }}
                  >
                    <ListItemIcon>
                      <MenuBook 
                        color={
                          activity.action === 'Issued' ? 'success' :
                          activity.action === 'Returned' ? 'info' :
                          'warning'
                        } 
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body1" fontWeight="600">
                          {activity.action}: {activity.bookTitle}
                        </Typography>
                      }
                      secondary={
                        <React.Fragment>
                          <Box component="span" sx={{ display: 'block', mt: 0.5 }}>
                            <Chip size="small" label={activity.student} sx={{ mr: 1 }} />
                            <Chip size="small" icon={<Schedule />} label={activity.time} />
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
                For password changes and system preferences, contact the IT department
              </Alert>
              <Stack spacing={2}>
                <Button variant="outlined" fullWidth>
                  Change Password
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

export default LibrarianProfile;
