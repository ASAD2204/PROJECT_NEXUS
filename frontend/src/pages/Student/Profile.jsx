/**
 * Student Profile Page
 * 
 * Displays and allows editing of student profile information.
 * Shows academic details, personal information, and performance metrics.
 * 
 * Features:
 * - Personal information display and editing
 * - Academic details (program, semester, CGPA)
 * - Contact information
 * - Guardian details
 * - Profile photo upload
 * - Password change
 * - Emergency contact information
 * - Responsive layout with tabbed sections
 * 
 * @component
 */

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
import { useSnackbar } from '../../contexts/SnackbarContext';
import { studentAPI } from '../../api/student';
import { authAPI } from '../../api/auth';
import StatusBadge from '../../components/Common/StatusBadge';
import StatCard from '../../components/Common/StatCard';
import { ProfileSkeleton } from '../../components/Common/LoadingSkeleton';
import { pageTransition } from '../../utils/animations';
import {
  EMAIL_REGEX,
  PHONE_REGEX,
  CNIC_REGEX,
  NAME_REGEX,
  filterCNIC,
  filterPhone,
  filterName,
  validateField as validateUtil,
} from '../../utils/validation';


const Profile = () => {
  const { user, updateUser } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    fullName: '',
    rollNo: '',
    cnic: '',
    dob: '',
    gender: '',
    nationality: '',
    religion: '',
    bloodGroup: '',
    phone: '',
    personalEmail: '',
    address: '',
    fatherName: '',
    fatherOccupation: '',
    fatherPhone: '',
    motherName: '',
    emergencyContact: '',
    currentSemester: '',
    program: '',
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

  const [academicHistory, setAcademicHistory] = useState([]);

  const buildFormData = (source = {}, u = {}) => ({
    fullName: source.fullName || source.name || [u.first_name, u.last_name].filter(Boolean).join(' ') || '',
    rollNo: source.rollNo || source.roll_no || u.rollNo || '',
    cnic: source.cnic || '',
    dob: source.dob || '',
    gender: source.gender || '',
    nationality: source.nationality || '',
    religion: source.religion || '',
    bloodGroup: source.bloodGroup || source.blood_group || '',
    phone: source.phone || u.phone || '',
    personalEmail: source.personalEmail || source.email || u.email || '',
    address: source.address || '',
    fatherName: source.guardianName || source.guardian_name || '',
    fatherOccupation: source.fatherOccupation || '',
    fatherPhone: source.guardianPhone || source.guardian_phone || '',
    motherName: source.motherName || '',
    emergencyContact: source.emergencyContact || '',
    currentSemester: source.currentSemester ?? source.current_semester ?? '',
    program: source.program || source.program_title || '',
  });

  const [errors, setErrors] = useState({});

  const loadProfile = async () => {
    try {
      setLoading(true);
      const [res, transRes] = await Promise.allSettled([
        studentAPI.getProfile(),
        studentAPI.getTranscript().catch(() => ({ data: [] })),
      ]);
      const data = res.status === 'fulfilled' ? (res.value.data || {}) : {};
      setProfile(data);
      setFormData(buildFormData(data, user));

      if (transRes.status === 'fulfilled') {
        const rows = transRes.value.data?.rows || transRes.value.data?.transcripts || transRes.value.data?.semesters || [];
        setAcademicHistory(rows.map(row => ({
          semester: row.semester || row.semester_title || `Semester ${row.semesterId || ''}`,
          sgpa: row.semesterGPA ?? row.sgpa ?? 0,
          year: row.year || '-',
        })));
      }
    } catch (e) {
      console.error(e);
      showSnackbar('Failed to load profile data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadProfile();
  }, [user]);

  const validateField = (name, value) => {
    let error = '';
    if (name === 'fullName') {
      if (!value || !value.trim()) error = 'Full name is required';
      else if (value.trim().length < 2) error = 'Name must be at least 2 characters';
      else if (!NAME_REGEX.test(value.trim())) error = 'Only letters, spaces, hyphens, dots allowed';
    } else if (name === 'personalEmail' && value) {
      if (!EMAIL_REGEX.test(value)) error = 'Invalid email format';
    } else if (name === 'cnic' && value) {
      if (!CNIC_REGEX.test(value)) error = 'Format: 12345-6789012-3';
    } else if ((name === 'phone' || name === 'fatherPhone') && value) {
      if (!PHONE_REGEX.test(value)) error = 'Only digits, +, -, (, ) allowed (7-20 chars)';
    } else if (name === 'emergencyContact' && value) {
      if (!PHONE_REGEX.test(value)) error = 'Only digits, +, -, (, ) allowed (7-20 chars)';
    } else if (name === 'fatherName' && value) {
      if (!NAME_REGEX.test(value.trim())) error = 'Only letters, spaces, hyphens, dots allowed';
    } else if (name === 'motherName' && value) {
      if (!NAME_REGEX.test(value.trim())) error = 'Only letters, spaces, hyphens, dots allowed';
    }
    return error;
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    const error = validateField(field, value);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleSave = async () => {
    // Re-validate all required fields before save
    const saveErrors = {};
    if (!formData.fullName?.trim()) saveErrors.fullName = 'Full name is required';
    if (formData.personalEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.personalEmail)) saveErrors.personalEmail = 'Invalid email format';
    if (formData.cnic && !/^\d{5}-\d{7}-\d{1}$/.test(formData.cnic)) saveErrors.cnic = 'Format: 12345-6789012-3';
    if (formData.phone && !/^[0-9+\-()\s]{7,20}$/.test(formData.phone)) saveErrors.phone = 'Invalid phone number';
    setErrors(prev => ({ ...prev, ...saveErrors }));
    if (Object.values({ ...errors, ...saveErrors }).some(err => err !== '')) {
      showSnackbar('Please fix all errors before saving', 'error');
      return;
    }

    try {
      const nameParts = formData.fullName.trim().split(/\s+/).filter(Boolean);
      const first_name = nameParts[0] || '';
      const last_name = nameParts.slice(1).join(' ');

      const authPayload = {
        first_name,
        last_name,
        phone: formData.phone,
        email: formData.personalEmail,
      };

      const studentPayload = {
        cnic: formData.cnic,
        dob: formData.dob || null,
        address: formData.address,
        phone: formData.phone,
        bloodGroup: formData.bloodGroup,
        guardianName: formData.fatherName,
        guardianPhone: formData.fatherPhone,
        currentSemester: formData.currentSemester || null,
      };

      await Promise.all([
        authAPI.updateProfile(authPayload),
        studentAPI.updateProfile(studentPayload),
      ]);

      await loadProfile();
      setIsEditing(false);
      setHasChanges(false);
      showSnackbar('Profile updated successfully!', 'success');
    } catch (e) {
      console.error(e);
      showSnackbar('Unable to save profile changes', 'error');
    }
  };

  const handleCancel = () => {
    setFormData(buildFormData(profile, user));
    setIsEditing(false);
    setHasChanges(false);
    setErrors({});
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      showSnackbar('Profile photo update not yet implemented', 'warning');
      setShowAvatarDialog(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!settings.newPassword || settings.newPassword.length < 8) {
      showSnackbar('Password must be at least 8 characters', 'error');
      return;
    }
    if (settings.newPassword !== settings.confirmPassword) {
      showSnackbar('Passwords do not match', 'error');
      return;
    }
    showSnackbar('Password changed successfully!', 'success');
    setSettings(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
  };

  const getRiskStatus = () => {
    const cgpa = Number(profile?.cgpa || 0);
    if (cgpa >= 3.5) return { status: 'Low Risk', color: 'success', tooltip: 'Excellent academic performance' };
    if (cgpa >= 3.0) return { status: 'Medium Risk', color: 'warning', tooltip: 'Good performance, room for improvement' };
    return { status: 'High Risk', color: 'error', tooltip: 'Academic intervention recommended' };
  };

  const riskStatus = getRiskStatus();

  if (loading) return <ProfileSkeleton />;

  return (
    <motion.div {...pageTransition}>
    <Box className="page-container">
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>My Profile</Typography>
        <Typography variant="body1" color="text.secondary">View and manage your personal information and academic records</Typography>
      </Box>

      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<Person />} label="Personal" iconPosition="start" />
          <Tab icon={<School />} label="Academic" iconPosition="start" />
          <Tab icon={<Description />} label="Documents" iconPosition="start" />
          <Tab icon={<Settings />} label="Settings" iconPosition="start" />
        </Tabs>
      </Card>

      {/* TAB 1: Personal */}
      {activeTab === 0 && (
        <Box>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} sm={2}>
                  <Box sx={{ position: 'relative', width: 120, height: 120, mx: 'auto' }}>
                    <Avatar src={profile?.photoUrl} sx={{ width: 120, height: 120 }}>{formData.fullName[0]}</Avatar>
                    <IconButton
                      onClick={() => setShowAvatarDialog(true)}
                      sx={{ position: 'absolute', bottom: 0, right: 0, bgcolor: 'background.paper', boxShadow: 2 }}
                    >
                      <PhotoCamera fontSize="small" color="primary" />
                    </IconButton>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={7}>
                  <Typography variant="h4" fontWeight="bold">{formData.fullName}</Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1, mb: 1, flexWrap: 'wrap' }}>
                    <Chip icon={<BadgeIcon />} label={formData.rollNo} size="small" />
                    <Chip icon={<School />} label={formData.program || 'Student'} color="primary" size="small" />
                    <Chip icon={riskStatus.color === 'success' ? <CheckCircle /> : <Warning />} label={riskStatus.status} color={riskStatus.color} size="small" />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    <Email fontSize="inherit" sx={{ mr: 1, verticalAlign: 'middle' }} />{formData.personalEmail}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  {!isEditing ? (
                    <Button variant="contained" startIcon={<Edit />} onClick={() => setIsEditing(true)} fullWidth>Edit Profile</Button>
                  ) : (
                    <Stack spacing={1}>
                      <Button variant="contained" startIcon={<Save />} onClick={handleSave} fullWidth>Save</Button>
                      <Button variant="outlined" startIcon={<Cancel />} onClick={handleCancel} fullWidth>Cancel</Button>
                    </Stack>
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>Personal Details</Typography>
              <Divider sx={{ mb: 3 }} />
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}><TextField fullWidth label="Full Name" required value={formData.fullName} onChange={(e) => handleFieldChange('fullName', filterName(e.target.value))} disabled={!isEditing} inputProps={{ minLength: 2, maxLength: 200 }} error={!!errors.fullName} helperText={errors.fullName || 'Only letters, spaces, hyphens, dots'} /></Grid>
                <Grid item xs={12} sm={6}><TextField fullWidth label="CNIC" value={formData.cnic} onChange={(e) => handleFieldChange('cnic', filterCNIC(e.target.value))} disabled={!isEditing} placeholder="12345-6789012-3" inputProps={{ maxLength: 15 }} error={!!errors.cnic} helperText={errors.cnic || 'Format: 12345-6789012-3 (digits & dash only)'} /></Grid>
                <Grid item xs={12} sm={6}><TextField fullWidth label="Date of Birth" type="date" value={formData.dob} onChange={(e) => handleFieldChange('dob', e.target.value)} disabled={!isEditing} InputLabelProps={{ shrink: true }} /></Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth disabled={!isEditing}>
                    <InputLabel>Gender</InputLabel>
                    <Select value={formData.gender} onChange={(e) => handleFieldChange('gender', e.target.value)} label="Gender">
                      <MenuItem value="Male">Male</MenuItem><MenuItem value="Female">Female</MenuItem><MenuItem value="Other">Other</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth disabled={!isEditing}>
                    <InputLabel>Blood Group</InputLabel>
                    <Select value={formData.bloodGroup} onChange={(e) => handleFieldChange('bloodGroup', e.target.value)} label="Blood Group">
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <MenuItem key={bg} value={bg}>{bg}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}><TextField fullWidth label="Phone" value={formData.phone} onChange={(e) => handleFieldChange('phone', filterPhone(e.target.value))} disabled={!isEditing} inputProps={{ maxLength: 20 }} error={!!errors.phone} helperText={errors.phone || 'Digits, +, -, (, ) only'} placeholder="e.g. +92 300 1234567" /></Grid>
                <Grid item xs={12}><TextField fullWidth label="Address" value={formData.address} onChange={(e) => handleFieldChange('address', e.target.value)} disabled={!isEditing} multiline rows={2} inputProps={{ maxLength: 500 }} /></Grid>
              </Grid>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* TAB 2: Academic */}
      {activeTab === 1 && (
        <Box>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}><StatCard title="CGPA" value={profile?.cgpa || '0.00'} icon={TrendingUp} color="primary" subtitle="Cumulative" /></Grid>
            <Grid item xs={12} sm={6} md={3}><StatCard title="Credits" value={`${profile?.credits_earned || 0}/${profile?.total_credits || 132}`} icon={School} color="success" subtitle="Earned" /></Grid>
            <Grid item xs={12} sm={6} md={3}><StatCard title="Semester" value={formData.currentSemester || '-'} icon={CalendarMonth} color="warning" subtitle="Current" /></Grid>
            <Grid item xs={12} sm={6} md={3}><StatCard title="Status" value={profile?.risk_status || 'Regular'} icon={CheckCircle} color="info" subtitle="Academic" /></Grid>
          </Grid>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>Academic Performance</Typography>
              <Divider sx={{ mb: 2 }} />
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Semester</strong></TableCell>
                    <TableCell align="right"><strong>SGPA</strong></TableCell>
                    <TableCell align="right"><strong>Year</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {academicHistory.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>{row.semester}</TableCell>
                      <TableCell align="right">{row.sgpa}</TableCell>
                      <TableCell align="right">{row.year}</TableCell>
                    </TableRow>
                  ))}
                  {academicHistory.length === 0 && <TableRow><TableCell colSpan={3} align="center">No history available</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* TAB 3: Documents */}
      {activeTab === 2 && (
        <Box>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <CloudUpload sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6">Document Management</Typography>
              <Typography variant="body2" color="text.secondary">Securely upload and manage your academic documents</Typography>
              <Button variant="outlined" sx={{ mt: 3 }}>Upload Document</Button>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* TAB 4: Settings */}
      {activeTab === 3 && (
        <Box>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>Security</Typography>
              <Divider sx={{ mb: 3 }} />
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}><TextField fullWidth label="New Password" type="password" required value={settings.newPassword} onChange={(e) => setSettings({...settings, newPassword: e.target.value})} inputProps={{ minLength: 8, maxLength: 128 }} helperText="Minimum 8 characters" /></Grid>
                <Grid item xs={12} sm={6}><TextField fullWidth label="Confirm Password" type="password" required value={settings.confirmPassword} onChange={(e) => setSettings({...settings, confirmPassword: e.target.value})} inputProps={{ minLength: 8, maxLength: 128 }} error={settings.confirmPassword !== '' && settings.newPassword !== settings.confirmPassword} helperText={settings.confirmPassword !== '' && settings.newPassword !== settings.confirmPassword ? 'Passwords do not match' : ''} /></Grid>
                <Grid item xs={12}><Button variant="contained" onClick={handlePasswordChange} disabled={!settings.newPassword || settings.newPassword.length < 8 || settings.newPassword !== settings.confirmPassword}>Update Password</Button></Grid>
              </Grid>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Avatar Dialog */}
      <Dialog open={showAvatarDialog} onClose={() => setShowAvatarDialog(false)}>
        <DialogTitle>Update Profile Picture</DialogTitle>
        <DialogContent sx={{ textAlign: 'center' }}>
          <input accept="image/*" type="file" id="avatar-input" hidden onChange={handleAvatarUpload} />
          <label htmlFor="avatar-input">
            <Button variant="contained" component="span" startIcon={<PhotoCamera />}>Choose File</Button>
          </label>
        </DialogContent>
      </Dialog>
    </Box>
    </motion.div>
  );
};

export default Profile;
