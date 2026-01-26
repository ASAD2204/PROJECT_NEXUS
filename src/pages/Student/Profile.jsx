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
  Tooltip,
  Alert,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  LinearProgress,
  Paper,
  Stack,
  InputAdornment,
  Checkbox,
  FormGroup,
  Snackbar,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Edit,
  Save,
  Cancel,
  PhotoCamera,
  Download,
  Delete,
  CloudUpload,
  Visibility,
  Lock,
  Email,
  Phone,
  LocationOn,
  School,
  CalendarMonth,
  TrendingUp,
  Warning,
  CheckCircle,
  Error as ErrorIcon,
  Notifications,
  Security,
  Settings,
  VisibilityOff,
  Person,
  Badge as BadgeIcon,
  AccountCircle,
  Description,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { currentUser } from '../../data/dummyData';
import StatusBadge from '../../components/Common/StatusBadge';
import StatCard from '../../components/Common/StatCard';
import { ProfileSkeleton } from '../../components/Common/LoadingSkeleton';
import { pageTransition } from '../../utils/animations';


const Profile = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Form data
  const [formData, setFormData] = useState({
    fullName: currentUser?.name || '',
    rollNo: currentUser?.rollNo || '',
    cnic: '12345-6789012-3',
    dob: '2002-03-15',
    gender: 'Male',
    nationality: 'Pakistani',
    religion: 'Islam',
    bloodGroup: 'B+',
    phone: '+92 300 1234567',
    personalEmail: 'student@gmail.com',
    address: '123 Main Street, Gulberg, Lahore, Pakistan',
    fatherName: 'Muhammad Ahmed',
    fatherOccupation: 'Businessman',
    fatherPhone: '+92 300 9876543',
    motherName: 'Ayesha Ahmed',
    emergencyContact: '+92 300 1111111',
  });

  // Settings
  const [settings, setSettings] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    emailNotifications: true,
    assignmentReminders: true,
    feeReminders: true,
    profileVisibility: 'public',
    showEmail: true,
    showPhone: false,
  });

  // Documents
  const [documents, setDocuments] = useState([
    { id: 1, name: 'CNIC Copy', type: 'CNIC', uploadDate: '2025-09-01', status: 'Approved', url: '#' },
    { id: 2, name: 'Admit Card', type: 'AdmitCard', uploadDate: '2025-09-01', status: 'Approved', url: '#' },
    { id: 3, name: 'Passport Photo', type: 'Photo', uploadDate: '2025-09-01', status: 'Pending', url: '#' },
  ]);
  const [newDocument, setNewDocument] = useState({ type: '', file: null });
  const [uploadProgress, setUploadProgress] = useState(0);

  // Academic history
  const academicHistory = [
    { semester: 'Semester 1', sgpa: 3.65, year: '2023-24' },
    { semester: 'Semester 2', sgpa: 3.72, year: '2023-24' },
    { semester: 'Semester 3', sgpa: 3.88, year: '2024-25' },
    { semester: 'Semester 4', sgpa: 3.91, year: '2024-25' },
    { semester: 'Semester 5', sgpa: 3.78, year: '2025-26' },
    { semester: 'Semester 6', sgpa: 3.95, year: '2025-26' },
  ];

  const previousQualifications = [
    { level: 'Matriculation (SSC)', board: 'BISE Lahore', year: '2018', percentage: '92%', grade: 'A+' },
    { level: 'Intermediate (HSSC)', board: 'BISE Lahore', year: '2020', percentage: '88%', grade: 'A' },
  ];

  // Validation
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 250);
    return () => window.clearTimeout(timer);
  }, []);

  const validateField = (name, value) => {
    let error = '';
    
    if (name === 'personalEmail') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        error = 'Invalid email format';
      }
    } else if (name === 'cnic') {
      const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
      if (!cnicRegex.test(value)) {
        error = 'CNIC format: 12345-6789012-3';
      }
    } else if (name === 'phone' || name === 'fatherPhone' || name === 'emergencyContact') {
      const phoneRegex = /^\+92 \d{3} \d{7}$/;
      if (!phoneRegex.test(value)) {
        error = 'Phone format: +92 300 1234567';
      }
    }
    
    return error;
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    
    // Validate
    const error = validateField(field, value);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleSave = () => {
    // Check for errors
    const hasErrors = Object.values(errors).some(err => err !== '');
    if (hasErrors) {
      setSnackbar({ open: true, message: 'Please fix all errors before saving', severity: 'error' });
      return;
    }

    // Save changes
    updateUser(formData);
    setIsEditing(false);
    setHasChanges(false);
    setSnackbar({ open: true, message: 'Profile updated successfully!', severity: 'success' });
  };

  const handleCancel = () => {
    setFormData({
      fullName: currentUser?.name || '',
      rollNo: currentUser?.rollNo || '',
      cnic: '12345-6789012-3',
      dob: '2002-03-15',
      gender: 'Male',
      nationality: 'Pakistani',
      religion: 'Islam',
      bloodGroup: 'B+',
      phone: '+92 300 1234567',
      personalEmail: 'student@gmail.com',
      address: '123 Main Street, Gulberg, Lahore, Pakistan',
      fatherName: 'Muhammad Ahmed',
      fatherOccupation: 'Businessman',
      fatherPhone: '+92 300 9876543',
      motherName: 'Ayesha Ahmed',
      emergencyContact: '+92 300 1111111',
    });
    setIsEditing(false);
    setHasChanges(false);
    setErrors({});
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Simulate upload
      setSnackbar({ open: true, message: 'Profile picture updated!', severity: 'success' });
      setShowAvatarDialog(false);
    }
  };

  const handleDocumentUpload = () => {
    if (!newDocument.type || !newDocument.file) {
      setSnackbar({ open: true, message: 'Please select document type and file', severity: 'error' });
      return;
    }

    // Simulate upload with progress
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          const newDoc = {
            id: documents.length + 1,
            name: newDocument.file.name,
            type: newDocument.type,
            uploadDate: new Date().toISOString().split('T')[0],
            status: 'Pending',
            url: '#',
          };
          setDocuments([...documents, newDoc]);
          setNewDocument({ type: '', file: null });
          setSnackbar({ open: true, message: 'Document uploaded successfully!', severity: 'success' });
          return 0;
        }
        return prev + 10;
      });
    }, 200);
  };

  const handleDocumentDelete = (docId) => {
    setDocuments(documents.filter(doc => doc.id !== docId));
    setSnackbar({ open: true, message: 'Document deleted', severity: 'info' });
  };

  const handlePasswordChange = () => {
    if (!settings.currentPassword || !settings.newPassword || !settings.confirmPassword) {
      setSnackbar({ open: true, message: 'Please fill all password fields', severity: 'error' });
      return;
    }
    if (settings.newPassword !== settings.confirmPassword) {
      setSnackbar({ open: true, message: 'Passwords do not match', severity: 'error' });
      return;
    }
    if (settings.newPassword.length < 8) {
      setSnackbar({ open: true, message: 'Password must be at least 8 characters', severity: 'error' });
      return;
    }
    
    setSnackbar({ open: true, message: 'Password changed successfully!', severity: 'success' });
    setSettings(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
  };

  // Calculate risk status based on CGPA and attendance
  const getRiskStatus = () => {
    const cgpa = 3.85;
    if (cgpa >= 3.5) return { status: 'Low Risk', color: 'success', tooltip: 'Excellent academic performance' };
    if (cgpa >= 3.0) return { status: 'Medium Risk', color: 'warning', tooltip: 'Good performance, room for improvement' };
    return { status: 'High Risk', color: 'error', tooltip: 'Academic intervention recommended' };
  };

  const riskStatus = getRiskStatus();

  // Unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  // Show loading skeleton
  if (loading) {
    return <ProfileSkeleton />;
  }

  return (
    <motion.div {...pageTransition}>
    <Box className="page-container">
      {/* Page Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          My Profile
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View and manage your personal information, academic records, and account settings
        </Typography>
      </Box>

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
            icon={<School />} 
            label="Academic"
            iconPosition="start" 
          />
          <Tab 
            icon={<Description />} 
            label="Documents" 
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
                      src={currentUser?.photoUrl}
                      sx={{ width: 120, height: 120 }}
                    >
                      {currentUser?.name?.[0]}
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
                    {currentUser?.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, mb: 1, flexWrap: 'wrap' }}>
                    <Chip icon={<BadgeIcon />} label={currentUser?.rollNo} />
                    <Chip icon={<School />} label={currentUser?.program} color="primary" />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2, mb: 1, flexWrap: 'wrap' }}>
                    <Typography variant="body2" color="text.secondary">
                      <Email fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                      {currentUser?.email}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <Phone fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                      {formData.phone}
                    </Typography>
                  </Box>
                  <Tooltip title={riskStatus.tooltip}>
                    <Chip
                      icon={riskStatus.color === 'success' ? <CheckCircle /> : <Warning />}
                      label={riskStatus.status}
                      color={riskStatus.color}
                      size="small"
                    />
                  </Tooltip>
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
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                      <Button
                        variant="contained"
                        startIcon={<Save />}
                        onClick={handleSave}
                        disabled={!hasChanges || Object.values(errors).some(e => e)}
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

          {/* Personal Details */}
          <Card sx={{ mb: 3, p: { xs: 1, md: 0 } }}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Personal Details
              </Typography>
              <Divider sx={{ mb: 3 }} />
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Full Name"
                    value={formData.fullName}
                    onChange={(e) => handleFieldChange('fullName', e.target.value)}
                    disabled={!isEditing}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Roll Number"
                    value={formData.rollNo}
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
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="CNIC"
                    value={formData.cnic}
                    onChange={(e) => handleFieldChange('cnic', e.target.value)}
                    disabled={!isEditing}
                    placeholder="12345-6789012-3"
                    error={!!errors.cnic}
                    helperText={errors.cnic}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Date of Birth"
                    type="date"
                    value={formData.dob}
                    onChange={(e) => handleFieldChange('dob', e.target.value)}
                    disabled={!isEditing}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth disabled={!isEditing}>
                    <InputLabel>Gender</InputLabel>
                    <Select
                      value={formData.gender}
                      onChange={(e) => handleFieldChange('gender', e.target.value)}
                      label="Gender"
                    >
                      <MenuItem value="Male">Male</MenuItem>
                      <MenuItem value="Female">Female</MenuItem>
                      <MenuItem value="Other">Other</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Nationality"
                    value={formData.nationality}
                    onChange={(e) => handleFieldChange('nationality', e.target.value)}
                    disabled={!isEditing}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Religion"
                    value={formData.religion}
                    onChange={(e) => handleFieldChange('religion', e.target.value)}
                    disabled={!isEditing}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth disabled={!isEditing}>
                    <InputLabel>Blood Group</InputLabel>
                    <Select
                      value={formData.bloodGroup}
                      onChange={(e) => handleFieldChange('bloodGroup', e.target.value)}
                      label="Blood Group"
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                        <MenuItem key={bg} value={bg}>{bg}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Phone Number"
                    value={formData.phone}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    disabled={!isEditing}
                    placeholder="+92 300 1234567"
                    error={!!errors.phone}
                    helperText={errors.phone}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Phone />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Personal Email"
                    value={formData.personalEmail}
                    onChange={(e) => handleFieldChange('personalEmail', e.target.value)}
                    disabled={!isEditing}
                    error={!!errors.personalEmail}
                    helperText={errors.personalEmail}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Email />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid size={12}>
                  <TextField
                    fullWidth
                    label="Address"
                    value={formData.address}
                    onChange={(e) => handleFieldChange('address', e.target.value)}
                    disabled={!isEditing}
                    multiline
                    rows={3}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LocationOn />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Guardian Details */}
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Guardian Details
              </Typography>
              <Divider sx={{ mb: 3 }} />
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Father's Name"
                    value={formData.fatherName}
                    onChange={(e) => handleFieldChange('fatherName', e.target.value)}
                    disabled={!isEditing}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Father's Occupation"
                    value={formData.fatherOccupation}
                    onChange={(e) => handleFieldChange('fatherOccupation', e.target.value)}
                    disabled={!isEditing}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Father's Phone"
                    value={formData.fatherPhone}
                    onChange={(e) => handleFieldChange('fatherPhone', e.target.value)}
                    disabled={!isEditing}
                    placeholder="+92 300 1234567"
                    error={!!errors.fatherPhone}
                    helperText={errors.fatherPhone}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Phone />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Mother's Name"
                    value={formData.motherName}
                    onChange={(e) => handleFieldChange('motherName', e.target.value)}
                    disabled={!isEditing}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Emergency Contact"
                    value={formData.emergencyContact}
                    onChange={(e) => handleFieldChange('emergencyContact', e.target.value)}
                    disabled={!isEditing}
                    placeholder="+92 300 1234567"
                    error={!!errors.emergencyContact}
                    helperText={errors.emergencyContact}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Phone />
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

      {/* TAB 2: Academic Information */}
      {activeTab === 1 && (
        <Box>
          {/* Current Program Card */}
          <Card sx={{ mb: 3, p: { xs: 1, md: 0 } }}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Current Program
              </Typography>
              <Divider sx={{ mb: 3 }} />
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">Program</Typography>
                  <Typography variant="body1" fontWeight="bold">{currentUser?.program}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">Batch</Typography>
                  <Typography variant="body1" fontWeight="bold">Fall 2023</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">Admission Date</Typography>
                  <Typography variant="body1" fontWeight="bold">September 2023</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">Expected Graduation</Typography>
                  <Typography variant="body1" fontWeight="bold">June 2027</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Academic Stats */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                title="CGPA"
                value="3.85"
                icon={TrendingUp}
                color="primary"
                subtitle="Out of 4.0"
                tooltip="Your Cumulative Grade Point Average across all completed semesters. This reflects your overall academic performance throughout your degree program."
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                title="Total Credits"
                value="98/132"
                icon={School}
                color="success"
                subtitle="Credits earned"
                tooltip="Total credit hours earned out of required credits for your degree. Each course has credit hours based on its workload and duration."
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                title="Semesters"
                value="6/8"
                icon={CalendarMonth}
                color="warning"
                subtitle="Completed"
                tooltip="Number of semesters completed out of total required semesters for your degree program. Most undergraduate programs require 8 semesters (4 years)."
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                title="Current Courses"
                value="5"
                icon={School}
                color="info"
                subtitle="Enrolled"
                tooltip="Number of courses you are currently enrolled in this semester. Each course contributes to your semester GPA and overall CGPA."
              />
            </Grid>
          </Grid>

          {/* Academic History */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Semester-wise Performance
              </Typography>
              <Divider sx={{ mb: 3 }} />
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Semester</strong></TableCell>
                    <TableCell><strong>Academic Year</strong></TableCell>
                    <TableCell align="right"><strong>SGPA</strong></TableCell>
                    <TableCell align="right"><strong>Grade</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {academicHistory.map((record, index) => (
                    <TableRow key={index}>
                      <TableCell>{record.semester}</TableCell>
                      <TableCell>{record.year}</TableCell>
                      <TableCell align="right">{record.sgpa}</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={record.sgpa >= 3.7 ? 'A' : record.sgpa >= 3.3 ? 'B+' : 'B'}
                          size="small"
                          color={record.sgpa >= 3.7 ? 'success' : record.sgpa >= 3.3 ? 'primary' : 'default'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={2}><strong>Cumulative GPA (CGPA)</strong></TableCell>
                    <TableCell align="right"><strong>3.85</strong></TableCell>
                    <TableCell align="right">
                      <Chip label="A" size="small" color="success" />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Previous Qualifications */}
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Previous Qualifications
              </Typography>
              <Divider sx={{ mb: 3 }} />
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Level</strong></TableCell>
                    <TableCell><strong>Board/Institution</strong></TableCell>
                    <TableCell><strong>Year</strong></TableCell>
                    <TableCell align="right"><strong>Percentage</strong></TableCell>
                    <TableCell align="right"><strong>Grade</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previousQualifications.map((qual, index) => (
                    <TableRow key={index}>
                      <TableCell>{qual.level}</TableCell>
                      <TableCell>{qual.board}</TableCell>
                      <TableCell>{qual.year}</TableCell>
                      <TableCell align="right">{qual.percentage}</TableCell>
                      <TableCell align="right">
                        <Chip label={qual.grade} size="small" color="success" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* TAB 3: Documents */}
      {activeTab === 2 && (
        <Box>
          {/* Uploaded Documents */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Uploaded Documents
              </Typography>
              <Divider sx={{ mb: 3 }} />
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Document Name</strong></TableCell>
                    <TableCell><strong>Type</strong></TableCell>
                    <TableCell><strong>Upload Date</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell align="right"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>{doc.name}</TableCell>
                      <TableCell>{doc.type}</TableCell>
                      <TableCell>{doc.uploadDate}</TableCell>
                      <TableCell>
                        <Chip
                          label={doc.status}
                          size="small"
                          color={doc.status === 'Approved' ? 'success' : 'warning'}
                          icon={doc.status === 'Approved' ? <CheckCircle /> : <Warning />}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Preview">
                          <IconButton size="small">
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Download">
                          <IconButton size="small">
                            <Download />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => handleDocumentDelete(doc.id)}>
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Upload New Document */}
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Upload New Document
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              {/* Drag-drop area */}
              <Paper
                sx={{
                  p: 4,
                  mb: 3,
                  border: '2px dashed',
                  borderColor: 'primary.main',
                  backgroundColor: 'action.hover',
                  textAlign: 'center',
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'action.selected',
                  },
                }}
                onClick={() => document.getElementById('file-upload').click()}
              >
                <CloudUpload sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Drag and drop files here
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  or click to browse
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Supported formats: PDF, JPG, PNG (Max 5MB)
                </Typography>
                <input
                  id="file-upload"
                  type="file"
                  hidden
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setNewDocument({ ...newDocument, file: e.target.files[0] })}
                />
              </Paper>

              {newDocument.file && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Selected: {newDocument.file.name}
                </Alert>
              )}

              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, sm: 8 }}>
                  <FormControl fullWidth>
                    <InputLabel>Document Type</InputLabel>
                    <Select
                      value={newDocument.type}
                      onChange={(e) => setNewDocument({ ...newDocument, type: e.target.value })}
                      label="Document Type"
                    >
                      <MenuItem value="CNIC">CNIC Copy</MenuItem>
                      <MenuItem value="AdmitCard">Admit Card</MenuItem>
                      <MenuItem value="Photo">Passport Photo</MenuItem>
                      <MenuItem value="Certificate">Certificate</MenuItem>
                      <MenuItem value="Other">Other</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<CloudUpload />}
                    onClick={handleDocumentUpload}
                    disabled={!newDocument.type || !newDocument.file}
                    size="large"
                  >
                    Upload
                  </Button>
                </Grid>
              </Grid>

              {uploadProgress > 0 && uploadProgress < 100 && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress variant="determinate" value={uploadProgress} />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                    Uploading... {uploadProgress}%
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {/* TAB 4: Settings */}
      {activeTab === 3 && (
        <Box>
          {/* Account Settings */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Change Password
              </Typography>
              <Divider sx={{ mb: 3 }} />
              <Grid container spacing={3}>
                <Grid size={12}>
                  <TextField
                    fullWidth
                    label="Current Password"
                    type="password"
                    value={settings.currentPassword}
                    onChange={(e) => setSettings({ ...settings, currentPassword: e.target.value })}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="New Password"
                    type="password"
                    value={settings.newPassword}
                    onChange={(e) => setSettings({ ...settings, newPassword: e.target.value })}
                    helperText="At least 8 characters"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Confirm Password"
                    type="password"
                    value={settings.confirmPassword}
                    onChange={(e) => setSettings({ ...settings, confirmPassword: e.target.value })}
                    error={settings.confirmPassword && settings.newPassword !== settings.confirmPassword}
                    helperText={
                      settings.confirmPassword && settings.newPassword !== settings.confirmPassword
                        ? 'Passwords do not match'
                        : ''
                    }
                  />
                </Grid>
                <Grid size={12}>
                  <Button
                    variant="contained"
                    onClick={handlePasswordChange}
                    disabled={!settings.currentPassword || !settings.newPassword || !settings.confirmPassword}
                  >
                    Update Password
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                <Notifications sx={{ verticalAlign: 'middle', mr: 1 }} />
                Notification Preferences
              </Typography>
              <Divider sx={{ mb: 3 }} />
              <FormGroup>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.emailNotifications}
                      onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                    />
                  }
                  label="Email Notifications"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.assignmentReminders}
                      onChange={(e) => setSettings({ ...settings, assignmentReminders: e.target.checked })}
                    />
                  }
                  label="Assignment Reminders"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.feeReminders}
                      onChange={(e) => setSettings({ ...settings, feeReminders: e.target.checked })}
                    />
                  }
                  label="Fee Payment Reminders"
                />
              </FormGroup>
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                <Security sx={{ verticalAlign: 'middle', mr: 1 }} />
                Privacy Settings
              </Typography>
              <Divider sx={{ mb: 3 }} />
              <Grid container spacing={3}>
                <Grid size={12}>
                  <FormControl fullWidth>
                    <InputLabel>Profile Visibility</InputLabel>
                    <Select
                      value={settings.profileVisibility}
                      onChange={(e) => setSettings({ ...settings, profileVisibility: e.target.value })}
                      label="Profile Visibility"
                    >
                      <MenuItem value="public">Public - Visible to everyone</MenuItem>
                      <MenuItem value="students">Students Only - Visible to fellow students</MenuItem>
                      <MenuItem value="private">Private - Only visible to faculty</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.showEmail}
                        onChange={(e) => setSettings({ ...settings, showEmail: e.target.checked })}
                      />
                    }
                    label="Show email address on profile"
                  />
                </Grid>
                <Grid size={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.showPhone}
                        onChange={(e) => setSettings({ ...settings, showPhone: e.target.checked })}
                      />
                    }
                    label="Show phone number on profile"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card sx={{ borderColor: 'error.main', borderWidth: 2, borderStyle: 'solid', p: { xs: 1, md: 0 } }}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Typography variant="h6" fontWeight="bold" color="error" gutterBottom>
                <Warning sx={{ verticalAlign: 'middle', mr: 1 }} />
                Danger Zone
              </Typography>
              <Divider sx={{ mb: 3 }} />
              <Alert severity="error" sx={{ mb: 2 }}>
                Deactivating your account will temporarily suspend your access to all university services. You can reactivate your account by contacting the administration.
              </Alert>
              <Button variant="outlined" color="error" fullWidth={{ xs: true, sm: false }}>
                Deactivate Account
              </Button>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Avatar Upload Dialog */}
      <Dialog open={showAvatarDialog} onClose={() => setShowAvatarDialog(false)}>
        <DialogTitle>Change Profile Picture</DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Avatar
              src={currentUser?.photoUrl}
              sx={{ width: 150, height: 150, mx: 'auto', mb: 2 }}
            >
              {currentUser?.name[0]}
            </Avatar>
            <input
              accept="image/*"
              id="avatar-upload-input"
              type="file"
              hidden
              onChange={handleAvatarUpload}
            />
            <label htmlFor="avatar-upload-input">
              <Button variant="contained" component="span" startIcon={<PhotoCamera />}>
                Choose Photo
              </Button>
            </label>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAvatarDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
    </motion.div>
  );
};

export default Profile;
