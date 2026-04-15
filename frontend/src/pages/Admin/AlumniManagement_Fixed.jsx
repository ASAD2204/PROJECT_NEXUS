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
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import PageHeader from '../../components/Common/PageHeader';
import StatCard from '../../components/Common/StatCard';
import { pageTransition, staggerContainer, fadeInUp } from '../../utils/animations';
import { alumniAPI } from '../../api/alumni';

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

  useEffect(() => {
    const fetchAlumni = async () => {
      try {
        const res = await alumniAPI.getDirectory();
        setAlumniList(res.data?.alumni || res.data || []);
      } catch (e) { console.error(e); }
    };
    fetchAlumni();
  }, []);

  // Form data mapped to backend AlumniRegisterRequest schema
  const [formData, setFormData] = useState({
    student_id: '',
    grad_year: new Date().getFullYear(),
    degree: '',
    current_employer: '',
    current_position: '',
    location: '',
    photo_url: '',
    linkedin_url: '',
    achievements: '',
    expertise: '',
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

  // Filter alumni
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
        grad_year: alumni.grad_year || new Date().getFullYear(),
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
        grad_year: new Date().getFullYear(),
        degree: '',
        current_employer: '',
        current_position: '',
        location: '',
        photo_url: '',
        linkedin_url: '',
        achievements: '',
        expertise: '',
      });
    }
    setOpenDialog(true);
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
        message: 'Please fill required fields (Student ID, Graduation Year)', 
        severity: 'error' 
      });
      return;
    }

    try {
      if (editMode) {
        await alumniAPI.updateAlumni(selectedAlumni.alumni_id, formData);
        setSnackbar({ open: true, message: 'Alumni updated successfully', severity: 'success' });
      } else {
        await alumniAPI.register(formData);
        setSnackbar({ open: true, message: 'Alumni registered successfully', severity: 'success' });
      }
      // Reload alumni list
      const res = await alumniAPI.getDirectory();
      setAlumniList(res.data?.alumni || res.data || []);
      handleCloseDialog();
    } catch (error) {
      setSnackbar({ 
        open: true, 
        message: error.response?.data?.detail || 'Failed to save alumni', 
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

  return (
    <motion.div {...pageTransition}>
      <Box className="page-container">
        <PageHeader
          title="Alumni Management"
          subtitle="Register and manage alumni records"
          action={
            <Button variant="contained" startIcon={<PersonAdd />} onClick={() => handleOpenDialog()}>
              Register Alumni
            </Button>
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
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Alumni Records ({filteredAlumni.length})
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
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
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  required
                  type="number"
                  label="Student ID"
                  value={formData.student_id}
                  onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>Graduation Year</InputLabel>
                  <Select
                    value={formData.grad_year}
                    onChange={(e) => setFormData({ ...formData, grad_year: e.target.value })}
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
              <Grid size={{ xs: 12, sm: 12 }}>
                <TextField
                  fullWidth
                  label="Degree"
                  value={formData.degree}
                  onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                  placeholder="e.g., BS Computer Science"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Current Employer"
                  value={formData.current_employer}
                  onChange={(e) => setFormData({ ...formData, current_employer: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Current Position"
                  value={formData.current_position}
                  onChange={(e) => setFormData({ ...formData, current_position: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="City, Country"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="LinkedIn URL"
                  value={formData.linkedin_url}
                  onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                  placeholder="https://linkedin.com/in/username"
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Achievements"
                  value={formData.achievements}
                  onChange={(e) => setFormData({ ...formData, achievements: e.target.value })}
                  multiline
                  rows={2}
                  placeholder="JSON string or comma-separated list"
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Expertise"
                  value={formData.expertise}
                  onChange={(e) => setFormData({ ...formData, expertise: e.target.value })}
                  multiline
                  rows={2}
                  placeholder="JSON string or comma-separated list"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} startIcon={<Cancel />}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSave} startIcon={<Save />}>
              {editMode ? 'Update' : 'Register'}
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
