import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  IconButton,
  Chip,
  Tab,
  Tabs,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Paper,
  Avatar,
  AvatarGroup,
  Tooltip,
  alpha,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add,
  Search,
  Edit,
  Delete,
  Visibility,
  People,
  Schedule,
  MenuBook,
  School,
  MoreVert,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import PageHeader from '../../components/Common/PageHeader';
import StatCard from '../../components/Common/StatCard';
import { pageTransition } from '../../utils/animations';

const CourseManagement = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    courseCode: '',
    courseTitle: '',
    creditHours: 3,
    department: '',
    instructor: '',
    semester: '',
    capacity: 50,
    description: '',
  });

  const handleChange = (field) => (event) => {
    setFormData({ ...formData, [field]: event.target.value });
  };

  const courses = [
    {
      id: 1,
      code: 'CS-301',
      name: 'Data Structures & Algorithms',
      department: 'Computer Science',
      creditHours: 3,
      semester: 'Fall 2025',
      instructor: { name: 'Dr. Ahmed Hassan', avatar: 'https://i.pravatar.cc/150?img=33' },
      enrolled: 85,
      capacity: 100,
      schedule: 'Mon, Wed 9:00 AM',
      status: 'active',
    },
    {
      id: 2,
      code: 'BBA-201',
      name: 'Marketing Management',
      department: 'Business Admin',
      creditHours: 3,
      semester: 'Fall 2025',
      instructor: { name: 'Prof. Sarah Khan', avatar: 'https://i.pravatar.cc/150?img=20' },
      enrolled: 72,
      capacity: 80,
      schedule: 'Tue, Thu 11:00 AM',
      status: 'active',
    },
    {
      id: 3,
      code: 'ENG-401',
      name: 'Digital Signal Processing',
      department: 'Engineering',
      creditHours: 4,
      semester: 'Fall 2025',
      instructor: { name: 'Dr. Usman Ali', avatar: 'https://i.pravatar.cc/150?img=15' },
      enrolled: 45,
      capacity: 60,
      schedule: 'Mon, Wed, Fri 2:00 PM',
      status: 'active',
    },
    {
      id: 4,
      code: 'CS-102',
      name: 'Introduction to Programming',
      department: 'Computer Science',
      creditHours: 4,
      semester: 'Spring 2026',
      instructor: null,
      enrolled: 0,
      capacity: 120,
      schedule: 'TBA',
      status: 'draft',
    },
  ];

  const departments = [
    { name: 'Computer Science', courses: 98, activeStudents: 852 },
    { name: 'Business Admin', courses: 87, activeStudents: 743 },
    { name: 'Engineering', courses: 76, activeStudents: 621 },
    { name: 'Medical Sciences', courses: 54, activeStudents: 431 },
  ];

  const getEnrollmentPercentage = (enrolled, capacity) => {
    return Math.round((enrolled / capacity) * 100);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'draft':
        return 'default';
      case 'archived':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <motion.div {...pageTransition}>
      <Box className="page-container">
        <PageHeader
          title="Course Management"
          subtitle="Manage courses, schedules, and enrollments"
        />

        {/* Department Overview */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {departments.map((dept, index) => (
            <Grid key={index} size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatCard
                title={dept.name}
                value={`${dept.courses} Courses`}
                subtitle={`${dept.activeStudents} Students`}
                icon={School}
                color={index === 0 ? 'primary' : index === 1 ? 'success' : index === 2 ? 'info' : 'warning'}
                tooltip={`${dept.name} department with ${dept.courses} active courses and ${dept.activeStudents} enrolled students`}
              />
            </Grid>
          ))}
        </Grid>

        <Card>
          <CardContent>
            {/* Toolbar */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search courses..."
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
              <Grid size={{ xs: 12, md: 6 }}>
                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Department</InputLabel>
                    <Select label="Department" defaultValue="all">
                      <MenuItem value="all">All Departments</MenuItem>
                      <MenuItem value="cs">Computer Science</MenuItem>
                      <MenuItem value="bba">Business Admin</MenuItem>
                      <MenuItem value="eng">Engineering</MenuItem>
                    </Select>
                  </FormControl>
                  <Button 
                    startIcon={<Add />} 
                    variant="contained" 
                    size="small"
                    onClick={() => setOpenDialog(true)}
                    sx={{ minWidth: { xs: '100%', sm: 'auto' }, mt: { xs: 1, sm: 0 } }}
                  >
                    Add Course
                  </Button>
                </Stack>
              </Grid>
            </Grid>

            {/* Courses Grid */}
            <Grid container spacing={3}>
              {courses.map((course) => (
                <Grid key={course.id} size={{ xs: 12, md: 6, lg: 4 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 2,
                      height: '100%',
                      transition: 'all 0.3s',
                      '&:hover': {
                        borderColor: theme.palette.primary.main,
                        boxShadow: theme.shadows[4],
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                      <Box>
                        <Chip label={course.code} size="small" color="primary" sx={{ mb: 1 }} />
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                          {course.name}
                        </Typography>
                      </Box>
                      <IconButton size="small">
                        <MoreVert />
                      </IconButton>
                    </Box>

                    <Stack spacing={1.5} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <School fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {course.department}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Schedule fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {course.schedule}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <MenuBook fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {course.creditHours} Credit Hours
                        </Typography>
                      </Box>
                    </Stack>

                    {course.instructor && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                        <Avatar src={course.instructor.avatar} sx={{ width: 32, height: 32 }} />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Instructor
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {course.instructor.name}
                          </Typography>
                        </Box>
                      </Box>
                    )}

                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        backgroundColor: alpha(theme.palette.primary.main, 0.05),
                        mb: 2,
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Enrollment
                        </Typography>
                        <Typography variant="caption" fontWeight="bold">
                          {course.enrolled}/{course.capacity}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: alpha(theme.palette.primary.main, 0.15),
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            height: '100%',
                            width: `${getEnrollmentPercentage(course.enrolled, course.capacity)}%`,
                            backgroundColor: theme.palette.primary.main,
                            transition: 'width 0.3s',
                          }}
                        />
                      </Box>
                    </Box>

                    <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
                      <Chip label={course.status} size="small" color={getStatusColor(course.status)} />
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="View Details">
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => window.open(`/admin/courses/${course.id}`, '_self')}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => {
                              setFormData({
                                courseCode: course.code,
                                courseTitle: course.name,
                                creditHours: course.creditHours,
                                department: course.department,
                                instructor: course.instructor.name,
                                semester: course.semester,
                                capacity: course.capacity,
                                description: course.description || '',
                              });
                              setOpenDialog(true);
                            }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>

        {/* Add Course Dialog */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Add New Course</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField 
                  fullWidth 
                  label="Course Code *" 
                  placeholder="e.g., CS-501"
                  value={formData.courseCode}
                  onChange={handleChange('courseCode')}
                  required 
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField 
                  fullWidth 
                  label="Course Title *" 
                  placeholder="e.g., Advanced Web Technologies"
                  value={formData.courseTitle}
                  onChange={handleChange('courseTitle')}
                  required 
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth required>
                  <InputLabel>Credit Hours *</InputLabel>
                  <Select 
                    value={formData.creditHours}
                    onChange={handleChange('creditHours')}
                    label="Credit Hours *"
                  >
                    <MenuItem value={1}>1</MenuItem>
                    <MenuItem value={2}>2</MenuItem>
                    <MenuItem value={3}>3</MenuItem>
                    <MenuItem value={4}>4</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                <FormControl fullWidth required>
                  <InputLabel>Department *</InputLabel>
                  <Select 
                    value={formData.department}
                    onChange={handleChange('department')}
                    label="Department *"
                  >
                    <MenuItem value="Computer Science">Computer Science</MenuItem>
                    <MenuItem value="Information Technology">Information Technology</MenuItem>
                    <MenuItem value="Business Administration">Business Administration</MenuItem>
                    <MenuItem value="Engineering">Engineering</MenuItem>
                    <MenuItem value="Medical Sciences">Medical Sciences</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>Instructor *</InputLabel>
                  <Select 
                    value={formData.instructor}
                    onChange={handleChange('instructor')}
                    label="Instructor *"
                  >
                    <MenuItem value="dr-ahmed">Dr. Ahmed Hassan - Computer Science</MenuItem>
                    <MenuItem value="prof-sarah">Prof. Sarah Khan - Business Admin</MenuItem>
                    <MenuItem value="dr-usman">Dr. Usman Ali - Engineering</MenuItem>
                    <MenuItem value="dr-mustafa">Dr. Ghulam Mustafa - Data Science</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <FormControl fullWidth required>
                  <InputLabel>Semester *</InputLabel>
                  <Select 
                    value={formData.semester}
                    onChange={handleChange('semester')}
                    label="Semester *"
                  >
                    <MenuItem value="1">1st Semester</MenuItem>
                    <MenuItem value="2">2nd Semester</MenuItem>
                    <MenuItem value="3">3rd Semester</MenuItem>
                    <MenuItem value="4">4th Semester</MenuItem>
                    <MenuItem value="5">5th Semester</MenuItem>
                    <MenuItem value="6">6th Semester</MenuItem>
                    <MenuItem value="7">7th Semester</MenuItem>
                    <MenuItem value="8">8th Semester</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField 
                  fullWidth 
                  label="Capacity *" 
                  type="number" 
                  placeholder="e.g., 50"
                  value={formData.capacity}
                  onChange={handleChange('capacity')}
                  inputProps={{ min: 10, max: 200 }}
                  required 
                />
              </Grid>
              <Grid size={12}>
                <TextField 
                  fullWidth 
                  label="Course Description" 
                  multiline 
                  rows={3} 
                  placeholder="Brief description of the course content and objectives"
                  value={formData.description}
                  onChange={handleChange('description')}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button variant="contained" onClick={() => setOpenDialog(false)}>
              Create Course
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </motion.div>
  );
};

export default CourseManagement;
