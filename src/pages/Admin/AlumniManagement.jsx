import React, { useState } from 'react';
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

const AlumniManagement = () => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterYear, setFilterYear] = useState('all');
  const [filterProgram, setFilterProgram] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedAlumni, setSelectedAlumni] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Mock alumni data
  const [alumniList, setAlumniList] = useState([
    {
      id: 1,
      name: 'Ali Hassan',
      rollNo: 'CS-2019-001',
      email: 'ali.hassan@gmail.com',
      phone: '+92 300 1234567',
      program: 'BS Computer Science',
      graduationYear: 2023,
      currentCompany: 'Google',
      designation: 'Software Engineer',
      location: 'Karachi, Pakistan',
      linkedIn: 'linkedin.com/in/alihassan',
      verified: true,
      registrationDate: '2023-08-15',
    },
    {
      id: 2,
      name: 'Fatima Noor',
      rollNo: 'CS-2020-045',
      email: 'fatima.noor@outlook.com',
      phone: '+92 321 9876543',
      program: 'BS Software Engineering',
      graduationYear: 2024,
      currentCompany: 'Microsoft',
      designation: 'Product Manager',
      location: 'Lahore, Pakistan',
      linkedIn: 'linkedin.com/in/fatimanoor',
      verified: true,
      registrationDate: '2024-07-20',
    },
    {
      id: 3,
      name: 'Ahmed Khan',
      rollNo: 'BBA-2018-089',
      email: 'ahmed.khan@yahoo.com',
      phone: '+92 333 5551234',
      program: 'BBA',
      graduationYear: 2022,
      currentCompany: 'Unilever',
      designation: 'Marketing Manager',
      location: 'Islamabad, Pakistan',
      linkedIn: 'linkedin.com/in/ahmedkhan',
      verified: false,
      registrationDate: '2022-09-10',
    },
  ]);

  const [formData, setFormData] = useState({
    name: '',
    rollNo: '',
    email: '',
    phone: '',
    program: '',
    graduationYear: new Date().getFullYear(),
    currentCompany: '',
    designation: '',
    location: '',
    linkedIn: '',
    verified: false,
  });

  // Stats
  const stats = {
    total: alumniList.length,
    verified: alumniList.filter((a) => a.verified).length,
    thisYear: alumniList.filter((a) => a.graduationYear === new Date().getFullYear()).length,
    employed: alumniList.filter((a) => a.currentCompany).length,
  };

  const programs = ['BS Computer Science', 'BS Software Engineering', 'BBA', 'BS Data Science', 'MBA'];
  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  // Filter alumni
  const filteredAlumni = alumniList.filter((alumni) => {
    const matchesSearch =
      alumni.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alumni.rollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alumni.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesYear = filterYear === 'all' || alumni.graduationYear === parseInt(filterYear);
    const matchesProgram = filterProgram === 'all' || alumni.program === filterProgram;
    return matchesSearch && matchesYear && matchesProgram;
  });

  const handleOpenDialog = (alumni = null) => {
    if (alumni) {
      setEditMode(true);
      setSelectedAlumni(alumni);
      setFormData(alumni);
    } else {
      setEditMode(false);
      setSelectedAlumni(null);
      setFormData({
        name: '',
        rollNo: '',
        email: '',
        phone: '',
        program: '',
        graduationYear: new Date().getFullYear(),
        currentCompany: '',
        designation: '',
        location: '',
        linkedIn: '',
        verified: false,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditMode(false);
    setSelectedAlumni(null);
  };

  const handleSave = () => {
    if (!formData.name || !formData.email || !formData.rollNo) {
      setSnackbar({ open: true, message: 'Please fill required fields', severity: 'error' });
      return;
    }

    if (editMode) {
      setAlumniList(alumniList.map((a) => (a.id === selectedAlumni.id ? { ...formData, id: a.id } : a)));
      setSnackbar({ open: true, message: 'Alumni updated successfully', severity: 'success' });
    } else {
      const newAlumni = {
        ...formData,
        id: alumniList.length + 1,
        registrationDate: new Date().toISOString().split('T')[0],
      };
      setAlumniList([...alumniList, newAlumni]);
      setSnackbar({ open: true, message: 'Alumni registered successfully', severity: 'success' });
    }
    handleCloseDialog();
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this alumni?')) {
      setAlumniList(alumniList.filter((a) => a.id !== id));
      setSnackbar({ open: true, message: 'Alumni deleted successfully', severity: 'info' });
    }
  };

  const handleToggleVerify = (id) => {
    setAlumniList(
      alumniList.map((a) => (a.id === id ? { ...a, verified: !a.verified } : a))
    );
    setSnackbar({ open: true, message: 'Verification status updated', severity: 'success' });
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
                  placeholder="Search by name, roll no, or email..."
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
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <FormControl fullWidth>
                  <InputLabel>Program</InputLabel>
                  <Select value={filterProgram} onChange={(e) => setFilterProgram(e.target.value)} label="Program">
                    <MenuItem value="all">All Programs</MenuItem>
                    {programs.map((program) => (
                      <MenuItem key={program} value={program}>
                        {program}
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
                    <TableCell>Alumni</TableCell>
                    <TableCell>Program</TableCell>
                    <TableCell>Graduation Year</TableCell>
                    <TableCell>Current Position</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAlumni.map((alumni) => (
                    <TableRow key={alumni.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>{alumni.name[0]}</Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {alumni.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {alumni.rollNo}
                            </Typography>
                            <br />
                            <Typography variant="caption" color="text.secondary">
                              <Email fontSize="inherit" /> {alumni.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>{alumni.program}</TableCell>
                      <TableCell>{alumni.graduationYear}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="500">
                          {alumni.designation || '-'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {alumni.currentCompany || 'Not specified'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          <LocationOn fontSize="inherit" /> {alumni.location || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={alumni.verified ? 'Verified' : 'Unverified'}
                          size="small"
                          color={alumni.verified ? 'success' : 'default'}
                          icon={alumni.verified ? <CheckCircle /> : <Cancel />}
                          onClick={() => handleToggleVerify(alumni.id)}
                          sx={{ cursor: 'pointer' }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => handleOpenDialog(alumni)}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => handleDelete(alumni.id)}>
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
                  label="Full Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  required
                  label="Roll Number"
                  value={formData.rollNo}
                  onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  required
                  type="email"
                  label="Email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+92 300 1234567"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>Program</InputLabel>
                  <Select
                    value={formData.program}
                    onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                    label="Program"
                  >
                    {programs.map((program) => (
                      <MenuItem key={program} value={program}>
                        {program}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>Graduation Year</InputLabel>
                  <Select
                    value={formData.graduationYear}
                    onChange={(e) => setFormData({ ...formData, graduationYear: e.target.value })}
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
                <TextField
                  fullWidth
                  label="Current Company"
                  value={formData.currentCompany}
                  onChange={(e) => setFormData({ ...formData, currentCompany: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Designation"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
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
                  label="LinkedIn Profile"
                  value={formData.linkedIn}
                  onChange={(e) => setFormData({ ...formData, linkedIn: e.target.value })}
                  placeholder="linkedin.com/in/username"
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
