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
  InputAdornment,
  Stack,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Tooltip,
  Alert,
  Divider,
  alpha,
  Paper,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add,
  Edit,
  Delete,
  Search,
  School,
  People,
  Description,
  Cancel,
  Save,
  Visibility,
  MenuBook,
  TrendingUp,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import PageHeader from '../../components/Common/PageHeader';
import StatCard from '../../components/Common/StatCard';
import { pageTransition } from '../../utils/animations';

const DepartmentManagement = () => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Mock programs data
  const [programs, setPrograms] = useState([
    {
      id: 1,
      name: 'Bachelor of Science in Computer Science',
      shortName: 'BS CS',
      code: 'CS-001',
      department: 'Computer Science',
      level: 'Undergraduate',
      duration: '4 years',
      totalCredits: 132,
      semesters: 8,
      tuitionFee: 450000,
      enrolledStudents: 856,
      faculty: 45,
      status: 'Active',
      accreditation: 'HEC Recognized',
      startYear: 2015,
    },
    {
      id: 2,
      name: 'Bachelor of Science in Software Engineering',
      shortName: 'BS SE',
      code: 'SE-001',
      department: 'Computer Science',
      level: 'Undergraduate',
      duration: '4 years',
      totalCredits: 132,
      semesters: 8,
      tuitionFee: 480000,
      enrolledStudents: 642,
      faculty: 38,
      status: 'Active',
      accreditation: 'PEC & HEC Recognized',
      startYear: 2016,
    },
    {
      id: 3,
      name: 'Bachelor of Business Administration',
      shortName: 'BBA',
      code: 'BBA-001',
      department: 'Business Administration',
      level: 'Undergraduate',
      duration: '4 years',
      totalCredits: 120,
      semesters: 8,
      tuitionFee: 350000,
      enrolledStudents: 743,
      faculty: 32,
      status: 'Active',
      accreditation: 'HEC Recognized',
      startYear: 2012,
    },
    {
      id: 4,
      name: 'Master of Business Administration',
      shortName: 'MBA',
      code: 'MBA-001',
      department: 'Business Administration',
      level: 'Graduate',
      duration: '2 years',
      totalCredits: 72,
      semesters: 4,
      tuitionFee: 600000,
      enrolledStudents: 234,
      faculty: 28,
      status: 'Active',
      accreditation: 'HEC Recognized',
      startYear: 2010,
    },
    {
      id: 5,
      name: 'Bachelor of Science in Data Science',
      shortName: 'BS DS',
      code: 'DS-001',
      department: 'Computer Science',
      level: 'Undergraduate',
      duration: '4 years',
      totalCredits: 132,
      semesters: 8,
      tuitionFee: 500000,
      enrolledStudents: 312,
      faculty: 26,
      status: 'Active',
      accreditation: 'HEC Recognized',
      startYear: 2020,
    },
  ]);

  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
    code: '',
    department: '',
    level: 'Undergraduate',
    duration: '',
    totalCredits: '',
    semesters: '',
    tuitionFee: '',
    enrolledStudents: 0,
    faculty: 0,
    status: 'Active',
    accreditation: '',
    startYear: new Date().getFullYear(),
  });

  // Stats
  const stats = {
    totalPrograms: programs.length,
    activePrograms: programs.filter((p) => p.status === 'Active').length,
    totalStudents: programs.reduce((sum, p) => sum + p.enrolledStudents, 0),
    totalFaculty: programs.reduce((sum, p) => sum + p.faculty, 0),
  };

  const departments = [...new Set(programs.map((p) => p.department))];
  const levels = ['Undergraduate', 'Graduate', 'Postgraduate'];

  // Filter programs
  const filteredPrograms = programs.filter((program) => {
    const matchesSearch =
      program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      program.shortName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      program.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment = filterDepartment === 'all' || program.department === filterDepartment;
    const matchesLevel = filterLevel === 'all' || program.level === filterLevel;
    return matchesSearch && matchesDepartment && matchesLevel;
  });

  const handleOpenDialog = (program = null) => {
    if (program) {
      setEditMode(true);
      setSelectedProgram(program);
      setFormData(program);
    } else {
      setEditMode(false);
      setSelectedProgram(null);
      setFormData({
        name: '',
        shortName: '',
        code: '',
        department: '',
        level: 'Undergraduate',
        duration: '',
        totalCredits: '',
        semesters: '',
        tuitionFee: '',
        enrolledStudents: 0,
        faculty: 0,
        status: 'Active',
        accreditation: '',
        startYear: new Date().getFullYear(),
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditMode(false);
    setSelectedProgram(null);
  };

  const handleSave = () => {
    if (!formData.name || !formData.code || !formData.department) {
      setSnackbar({ open: true, message: 'Please fill required fields', severity: 'error' });
      return;
    }

    if (editMode) {
      setPrograms(programs.map((p) => (p.id === selectedProgram.id ? { ...formData, id: p.id } : p)));
      setSnackbar({ open: true, message: 'Program updated successfully', severity: 'success' });
    } else {
      const newProgram = {
        ...formData,
        id: programs.length + 1,
        enrolledStudents: parseInt(formData.enrolledStudents) || 0,
        faculty: parseInt(formData.faculty) || 0,
        totalCredits: parseInt(formData.totalCredits) || 0,
        semesters: parseInt(formData.semesters) || 0,
        tuitionFee: parseInt(formData.tuitionFee) || 0,
      };
      setPrograms([...programs, newProgram]);
      setSnackbar({ open: true, message: 'Program created successfully', severity: 'success' });
    }
    handleCloseDialog();
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this program?')) {
      setPrograms(programs.filter((p) => p.id !== id));
      setSnackbar({ open: true, message: 'Program deleted successfully', severity: 'info' });
    }
  };

  const handleToggleStatus = (id) => {
    setPrograms(
      programs.map((p) =>
        p.id === id ? { ...p, status: p.status === 'Active' ? 'Inactive' : 'Active' } : p
      )
    );
  };

  return (
    <motion.div {...pageTransition}>
      <Box className="page-container">
        <PageHeader
          title="Department & Program Management"
          subtitle="Manage degree programs and academic departments"
          action={
            <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
              Add New Program
            </Button>
          }
        />

        {/* Stats */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Total Programs"
              value={stats.totalPrograms}
              icon={School}
              color="primary"
              subtitle={`${stats.activePrograms} active`}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Enrolled Students"
              value={stats.totalStudents.toLocaleString()}
              icon={People}
              color="success"
              subtitle="Across all programs"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Faculty Members"
              value={stats.totalFaculty}
              icon={People}
              color="info"
              subtitle="Teaching staff"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Departments"
              value={departments.length}
              icon={MenuBook}
              color="warning"
              subtitle="Academic departments"
            />
          </Grid>
        </Grid>

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  placeholder="Search by program name, code..."
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
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>Department</InputLabel>
                  <Select
                    value={filterDepartment}
                    onChange={(e) => setFilterDepartment(e.target.value)}
                    label="Department"
                  >
                    <MenuItem value="all">All Departments</MenuItem>
                    {departments.map((dept) => (
                      <MenuItem key={dept} value={dept}>
                        {dept}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>Level</InputLabel>
                  <Select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} label="Level">
                    <MenuItem value="all">All Levels</MenuItem>
                    {levels.map((level) => (
                      <MenuItem key={level} value={level}>
                        {level}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Programs Table */}
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Degree Programs ({filteredPrograms.length})
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Program</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Level</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Credits</TableCell>
                    <TableCell>Students</TableCell>
                    <TableCell>Tuition Fee</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPrograms.map((program) => (
                    <TableRow key={program.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {program.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {program.shortName} ({program.code})
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{program.department}</TableCell>
                      <TableCell>
                        <Chip label={program.level} size="small" color="primary" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        {program.duration}
                        <br />
                        <Typography variant="caption" color="text.secondary">
                          {program.semesters} semesters
                        </Typography>
                      </TableCell>
                      <TableCell>{program.totalCredits} hrs</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="500">
                          {program.enrolledStudents}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {program.faculty} faculty
                        </Typography>
                      </TableCell>
                      <TableCell>PKR {(program.tuitionFee / 1000).toFixed(0)}K</TableCell>
                      <TableCell>
                        <Chip
                          label={program.status}
                          size="small"
                          color={program.status === 'Active' ? 'success' : 'default'}
                          onClick={() => handleToggleStatus(program.id)}
                          sx={{ cursor: 'pointer' }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => handleOpenDialog(program)}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => handleDelete(program.id)}>
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
          <DialogTitle>{editMode ? 'Edit Program' : 'Add New Program'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={12}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Basic Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  required
                  label="Program Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Bachelor of Science in Computer Science"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  required
                  label="Short Name"
                  value={formData.shortName}
                  onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                  placeholder="BS CS"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  required
                  label="Program Code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="CS-001"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  required
                  label="Department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="Computer Science"
                />
              </Grid>

              <Grid size={12}>
                <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>
                  Academic Details
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>Level</InputLabel>
                  <Select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    label="Level"
                  >
                    {levels.map((level) => (
                      <MenuItem key={level} value={level}>
                        {level}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Duration"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  placeholder="4 years"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Total Credits"
                  value={formData.totalCredits}
                  onChange={(e) => setFormData({ ...formData, totalCredits: e.target.value })}
                  placeholder="132"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Number of Semesters"
                  value={formData.semesters}
                  onChange={(e) => setFormData({ ...formData, semesters: e.target.value })}
                  placeholder="8"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Accreditation"
                  value={formData.accreditation}
                  onChange={(e) => setFormData({ ...formData, accreditation: e.target.value })}
                  placeholder="HEC Recognized"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Start Year"
                  value={formData.startYear}
                  onChange={(e) => setFormData({ ...formData, startYear: e.target.value })}
                />
              </Grid>

              <Grid size={12}>
                <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>
                  Enrollment & Finance
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Tuition Fee (PKR)"
                  value={formData.tuitionFee}
                  onChange={(e) => setFormData({ ...formData, tuitionFee: e.target.value })}
                  placeholder="450000"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    label="Status"
                  >
                    <MenuItem value="Active">Active</MenuItem>
                    <MenuItem value="Inactive">Inactive</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} startIcon={<Cancel />}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSave} startIcon={<Save />}>
              {editMode ? 'Update' : 'Create'}
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

export default DepartmentManagement;
