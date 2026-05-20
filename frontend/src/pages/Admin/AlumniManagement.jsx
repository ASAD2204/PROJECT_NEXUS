import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Avatar,
  InputAdornment,
  Stack,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Tooltip,
  Alert,
  Paper,
  Divider,
  alpha,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add,
  Edit,
  Delete,
  Search,
  Email,
  Phone,
  Business,
  LocationOn,
  School,
  LinkedIn,
  CheckCircle,
  Cancel,
  Save,
  PersonAdd,
  Download,
  Upload,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import PageHeader from '../../components/Common/PageHeader';
import StatCard from '../../components/Common/StatCard';
import { pageTransition, staggerContainer, fadeInUp } from '../../utils/animations';
import { alumniAPI } from '../../api/alumni';
import { sisAPI } from '../../api/sis';
import { authAPI } from '../../api/auth';

const URL_REGEX = /^https?:\/\/.+/i;
const MIN_PASSWORD_LENGTH = 8;

const AlumniManagement = () => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterYear, setFilterYear] = useState('all');
  const [filterProgram, setFilterProgram] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedAlumni, setSelectedAlumni] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Alumni data from API (backend schema: alumni_id, student_id, grad_year, current_employer, etc.)
  const [alumniList, setAlumniList] = useState([]);
  const [studentsList, setStudentsList] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [alumniRes, studentsRes] = await Promise.all([
          alumniAPI.getDirectory(),
          sisAPI.getStudents()
        ]);
        setAlumniList(alumniRes.data?.alumni || alumniRes.data || []);
        setStudentsList(studentsRes.data?.students || studentsRes.data || []);
      } catch (e) { console.error(e); }
    };
    fetchData();
  }, []);

  // Form data mapped to backend AlumniRegisterRequest schema
  const [formData, setFormData] = useState({
    student_id: '',
    grad_year: String(new Date().getFullYear()),
    degree: '',
    current_employer: '',
    current_position: '',
    location: '',
    photo_url: '',
    linkedin_url: '',
    achievements: '',
    expertise: '',
    password: '', // Added password field
  });

  // Stats
  const stats = {
    total: alumniList.length,
    verified: alumniList.filter((a) => a.verified).length,
    thisYear: alumniList.filter((a) => a.grad_year === new Date().getFullYear()).length,
    employed: alumniList.filter((a) => a.current_employer).length,
  };

  const programs = ['BS Computer Science', 'BS Software Engineering', 'BBA', 'BS Data Science', 'MBA'];
  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  // Filter students based on grad_year in form
  const filteredStudentsForSelection = studentsList.filter((student) => {
    if (!formData.grad_year) return true;
    const rollNo = String(student.roll_no || student.rollNo || '');
    const shortYear = formData.grad_year.toString().slice(-2);
    // Usually batch is identified by the first 2 digits (e.g. BIT22031 -> 2022)
    // We assume graduation year is roughly 4 years after enrollment
    const enrollmentYear = parseInt(shortYear) + 2000;
    const expectedGradYear = enrollmentYear + 4;
    
    // If roll_no matches the short year of (GradYear - 4), it's a likely match
    const targetEnrollmentShortYear = (parseInt(formData.grad_year) - 4).toString().slice(-2);
    
    return rollNo.includes(targetEnrollmentShortYear);
  });

  // Filter alumni for the main list
  const filteredAlumni = alumniList.filter((alumni) => {
    const matchesSearch =
      String(alumni.student_id || '').includes(searchQuery) ||
      String(alumni.degree || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesYear = filterYear === 'all' || alumni.grad_year === parseInt(filterYear);
    return matchesSearch && matchesYear;
  });

  const handleOpenDialog = (alumni = null) => {
    if (alumni) {
      setEditMode(true);
      setSelectedAlumni(alumni);
      setFormData({
        student_id: alumni.student_id || '',
        grad_year: String(alumni.grad_year || new Date().getFullYear()),
        degree: alumni.degree || '',
        current_employer: alumni.current_employer || '',
        current_position: alumni.current_position || '',
        location: alumni.location || '',
        photo_url: alumni.photo_url || '',
        linkedin_url: alumni.linkedin_url || '',
        achievements: alumni.achievements || '',
        expertise: alumni.expertise || '',
      });
    } else {
      setEditMode(false);
      setSelectedAlumni(null);
      setFormData({
        student_id: '',
        grad_year: String(new Date().getFullYear()),
        degree: '',
        current_employer: '',
        current_position: '',
        location: '',
        photo_url: '',
        linkedin_url: '',
        achievements: '',
        expertise: '',
        password: '', // Explicitly reset password
      });
    }
    setOpenDialog(true);
  };

  const handleFormFieldChange = (field) => (event) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditMode(false);
    setSelectedAlumni(null);
  };

  const handleSave = async () => {
    if (!formData.student_id || !formData.grad_year) {
      setSnackbar({ 
        open: true, 
        message: 'Please fill required fields (Student, Graduation Year)', 
        severity: 'error' 
      });
      return;
    }

    if (!editMode && (!formData.password || String(formData.password).length < MIN_PASSWORD_LENGTH)) {
      setSnackbar({
        open: true,
        message: `Password is required and must be at least ${MIN_PASSWORD_LENGTH} characters.`,
        severity: 'error',
      });
      return;
    }
    if (formData.linkedin_url && !URL_REGEX.test(formData.linkedin_url)) {
      setSnackbar({ open: true, message: 'LinkedIn URL must start with http:// or https://', severity: 'error' });
      return;
    }
    if (formData.photo_url && !URL_REGEX.test(formData.photo_url)) {
      setSnackbar({ open: true, message: 'Photo URL must start with http:// or https://', severity: 'error' });
      return;
    }

    try {
      const selectedStudent = studentsList.find(s => String(s.student_id || s.id) === String(formData.student_id));
      const userId = selectedStudent?.user_id;

      if (!editMode && userId) {
        // 1. Promote User to Alumni Role and set Password
        const authPayload = {
          role: 'alumni',
        };
        if (formData.password) {
          authPayload.password = formData.password;
        }
        await authAPI.updateUser(userId, authPayload);
      }

      // 2. Save Alumni Profile
      const payload = {
        ...formData,
        student_id: Number(formData.student_id),
        grad_year: Number(formData.grad_year),
      };
      
      // Remove password from alumni-service payload (it doesn't exist in that schema)
      delete payload.password;

      if (editMode) {
        await alumniAPI.updateAlumni(selectedAlumni.alumni_id, payload);
        setSnackbar({ open: true, message: 'Alumni updated successfully', severity: 'success' });
      } else {
        await alumniAPI.register(payload);
        setSnackbar({ open: true, message: 'Alumni registered and role updated', severity: 'success' });
      }
      // Reload alumni list
      const res = await alumniAPI.getDirectory();
      setAlumniList(res.data?.alumni || res.data || []);
      handleCloseDialog();
    } catch (error) {
      console.error('[SAVE ALUMNI] Error:', error);
      setSnackbar({ 
        open: true, 
        message: error.response?.data?.detail || 'Failed to save alumni records', 
        severity: 'error' 
      });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this alumni?')) {
      try {
        await alumniAPI.deleteAlumni(id);
        setSnackbar({ open: true, message: 'Alumni deleted successfully', severity: 'info' });
        // Reload alumni list
        const res = await alumniAPI.getDirectory();
        setAlumniList(res.data?.alumni || res.data || []);
      } catch (error) {
        setSnackbar({ 
          open: true, 
          message: error.response?.data?.detail || 'Failed to delete alumni', 
          severity: 'error' 
        });
      }
    }
  };

  const handleToggleVerify = (id) => {
    setSnackbar({ 
      open: true, 
      message: 'Verification status managed via profile attributes', 
      severity: 'info' 
    });
  };
  const handleExportAlumni = async () => {
    try {
      const response = await alumniAPI.exportAlumni();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `alumni_directory_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setSnackbar({ open: true, message: 'Directory exported successfully', severity: 'success' });
    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: 'Failed to export alumni', severity: 'error' });
    }
  };

  const handleImportAlumni = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      await alumniAPI.importAlumni(file);
      setSnackbar({ open: true, message: 'Alumni imported successfully', severity: 'success' });
      // Reload list
      const res = await alumniAPI.getDirectory();
      setAlumniList(res.data?.alumni || res.data || []);
    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: e.response?.data?.detail || 'Failed to import alumni', severity: 'error' });
    }
    event.target.value = '';
  };

  const handleDownloadReport = async () => {
    try {
      const response = await alumniAPI.downloadReport();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `alumni_report_${new Date().toISOString().slice(0, 10)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: 'Failed to download report', severity: 'error' });
    }
  };

  return (
    <motion.div {...pageTransition}>
      <Box className="page-container">
        <PageHeader
          title="Alumni Management"
          subtitle="Register and manage alumni records"
          action={
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
              <input
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                id="import-alumni-input"
                onChange={handleImportAlumni}
              />
              <label htmlFor="import-alumni-input">
                <Button component="span" variant="outlined" startIcon={<Upload />} size="small">
                  Import
                </Button>
              </label>
              <Button variant="outlined" startIcon={<Download />} onClick={handleExportAlumni} size="small">
                Export
              </Button>
              <Button variant="outlined" onClick={handleDownloadReport} size="small">
                PDF
              </Button>
              <Button variant="contained" startIcon={<PersonAdd />} onClick={() => handleOpenDialog()} size="small">
                Register
              </Button>
            </Box>
          }
        />

        {/* Stats */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard 
              title="Total Alumni" 
              value={stats.total} 
              icon={School} 
              color="primary"
              tooltip="Total number of alumni registered in the system"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Verified Alumni"
              value={stats.verified}
              icon={CheckCircle}
              color="success"
              subtitle={`${((stats.verified / stats.total) * 100).toFixed(0)}% verified`}
              tooltip="Number of alumni with verified profiles and credentials"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="This Year Graduates"
              value={stats.thisYear}
              icon={School}
              color="info"
              subtitle={`Class of ${new Date().getFullYear()}`}
              tooltip="Number of alumni who graduated this year"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Employed"
              value={stats.employed}
              icon={Business}
              color="warning"
              subtitle={`${((stats.employed / stats.total) * 100).toFixed(0)}% employment rate`}
              tooltip="Number of alumni currently employed with registered companies"
            />
          </Grid>
        </Grid>

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  placeholder="Search by student ID or degree..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <FormControl fullWidth>
                  <InputLabel>Graduation Year</InputLabel>
                  <Select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} label="Graduation Year">
                    <MenuItem value="all">All Years</MenuItem>
                    {years.map((year) => (
                      <MenuItem key={year} value={year}>
                        {year}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Alumni Table */}
        <Card sx={{ borderRadius: 3, boxShadow: theme.shadows[3] }}>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
              Alumni Records ({filteredAlumni.length})
            </Typography>
            <TableContainer sx={{ borderRadius: 2, border: `1px solid ${theme.palette.divider}`, overflowX: 'auto' }}>
              <Table sx={{ minWidth: 850 }}>
                <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                  <TableRow>
                    <TableCell>Student ID</TableCell>
                    <TableCell>Degree</TableCell>
                    <TableCell>Graduation Year</TableCell>
                    <TableCell>Current Position</TableCell>
                    <TableCell>Employer</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAlumni.map((alumni) => (
                    <TableRow key={alumni.alumni_id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {alumni.student_id}
                        </Typography>
                      </TableCell>
                      <TableCell>{alumni.degree || '-'}</TableCell>
                      <TableCell>{alumni.grad_year}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="500">
                          {alumni.current_position || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {alumni.current_employer || 'Not specified'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          <LocationOn fontSize="inherit" /> {alumni.location || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => handleOpenDialog(alumni)}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => handleDelete(alumni.alumni_id)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>{editMode ? 'Edit Alumni' : 'Register Alumni'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              {/* Step 1: Selection Flow */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>Graduation Year</InputLabel>
                  <Select
                    value={formData.grad_year}
                    onChange={handleFormFieldChange('grad_year')}
                    label="Graduation Year"
                  >
                    {years.map((year) => (
                      <MenuItem key={year} value={year}>
                        {year}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth required disabled={!formData.grad_year}>
                  <InputLabel>Select Student</InputLabel>
                  <Select
                    value={formData.student_id}
                    onChange={handleFormFieldChange('student_id')}
                    label="Select Student"
                  >
                    {filteredStudentsForSelection.length > 0 ? (
                      filteredStudentsForSelection.map((student) => (
                        <MenuItem key={student.student_id || student.id} value={String(student.student_id || student.id)}>
                          {student.name || student.full_name} ({student.roll_no || student.rollNo})
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem disabled>No students found for this year</MenuItem>
                    )}
                  </Select>
                </FormControl>
              </Grid>

              {/* Step 2: Account Security */}
              {!editMode && (
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Set Alumni Account Password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleFormFieldChange('password')}
                    placeholder="Provide a new password for the alumni account"
                    helperText="This will be the password the alumnus uses to login."
                    inputProps={{ minLength: MIN_PASSWORD_LENGTH, maxLength: 128 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CheckCircle color="primary" fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              )}

              <Grid size={{ xs: 12 }}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Professional Details
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Degree Title"
                  value={formData.degree}
                  onChange={handleFormFieldChange('degree')}
                  placeholder="e.g., BS Computer Science"
                />
              </Grid>
              
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Current Employer"
                  value={formData.current_employer}
                  onChange={handleFormFieldChange('current_employer')}
                  placeholder="e.g., Google, Microsoft"
                />
              </Grid>
              
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Current Position"
                  value={formData.current_position}
                  onChange={handleFormFieldChange('current_position')}
                  placeholder="e.g., Senior Software Engineer"
                />
              </Grid>
              
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Location"
                  value={formData.location}
                  onChange={handleFormFieldChange('location')}
                  placeholder="City, Country"
                />
              </Grid>
              
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="LinkedIn Profile URL"
                  type="url"
                  value={formData.linkedin_url}
                  onChange={handleFormFieldChange('linkedin_url')}
                  placeholder="https://linkedin.com/in/username"
                  inputProps={{ maxLength: 255 }}
                />
              </Grid>
              
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Profile Photo URL"
                  type="url"
                  value={formData.photo_url}
                  onChange={handleFormFieldChange('photo_url')}
                  placeholder="https://example.com/photo.jpg"
                  inputProps={{ maxLength: 255 }}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Expertise & Skills"
                  value={formData.expertise}
                  onChange={handleFormFieldChange('expertise')}
                  multiline
                  rows={2}
                  placeholder="e.g. React, Python, Cloud Architecture (comma separated)"
                />
              </Grid>
              
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Notable Achievements"
                  value={formData.achievements}
                  onChange={handleFormFieldChange('achievements')}
                  multiline
                  rows={2}
                  placeholder="e.g. Dean's List, Award Winner, etc."
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleCloseDialog} startIcon={<Cancel />}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              startIcon={<Save />}
              disabled={
                !formData.student_id ||
                !formData.grad_year ||
                (!editMode && String(formData.password || '').length < MIN_PASSWORD_LENGTH)
              }
            >
              {editMode ? 'Update Alumni' : 'Complete Registration'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        {snackbar.open && (
          <Alert
            severity={snackbar.severity}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}
          >
            {snackbar.message}
          </Alert>
        )}
      </Box>
    </motion.div>
  );
};

export default AlumniManagement;
