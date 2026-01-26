import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  Avatar,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  Stack,
  alpha,
  Tooltip,
  Divider,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Search,
  Add,
  MoreVert,
  Edit,
  Delete,
  Block,
  CheckCircle,
  FilterList,
  Download,
  Upload,
  PersonAdd,
  Email,
  Phone,
  LocationOn,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import PageHeader from '../../components/Common/PageHeader';
import StatusBadge from '../../components/Common/StatusBadge';
import { pageTransition } from '../../utils/animations';

const UserManagement = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [userType, setUserType] = useState('student');
  const [formData, setFormData] = useState({
    // Student fields
    fullName: '',
    email: '',
    rollNumber: '',
    department: '',
    program: '',
    semester: '',
    session: '',
    password: '',
    // Teacher fields
    employeeId: '',
    designation: '',
    specialization: '',
    type: '',
    // Alumni fields
    graduationYear: '',
    degree: '',
    personalEmail: '',
    currentCompany: '',
    linkedInProfile: '',
  });

  // Mock data
  const students = [
    {
      id: 1,
      name: 'Muhammad Asad',
      rollNo: 'CS-2023-001',
      email: 'asad@nexus.edu',
      phone: '+92 300 1234567',
      department: 'Computer Science',
      semester: 6,
      cgpa: 3.85,
      status: 'active',
      enrollDate: '2023-09-01',
      avatar: 'https://i.pravatar.cc/150?img=12',
    },
    {
      id: 2,
      name: 'Ayesha Khan',
      rollNo: 'BBA-2022-045',
      email: 'ayesha@nexus.edu',
      phone: '+92 301 9876543',
      department: 'Business Admin',
      semester: 8,
      cgpa: 3.92,
      status: 'active',
      enrollDate: '2022-09-01',
      avatar: 'https://i.pravatar.cc/150?img=5',
    },
    {
      id: 3,
      name: 'Ali Ahmed',
      rollNo: 'ENG-2023-112',
      email: 'ali@nexus.edu',
      phone: '+92 302 5551234',
      department: 'Engineering',
      semester: 5,
      cgpa: 3.45,
      status: 'probation',
      enrollDate: '2023-09-01',
      avatar: 'https://i.pravatar.cc/150?img=8',
    },
  ];

  const faculty = [
    {
      id: 1,
      name: 'Dr. Ahmed Hassan',
      empId: 'FAC-001',
      email: 'ahmed.hassan@nexus.edu',
      phone: '+92 300 1111111',
      department: 'Computer Science',
      designation: 'Professor',
      qualification: 'PhD CS',
      experience: '15 years',
      status: 'active',
      joinDate: '2010-08-01',
      avatar: 'https://i.pravatar.cc/150?img=33',
    },
    {
      id: 2,
      name: 'Prof. Sarah Khan',
      empId: 'FAC-002',
      email: 'sarah.khan@nexus.edu',
      phone: '+92 301 2222222',
      department: 'Business Admin',
      designation: 'Associate Professor',
      qualification: 'PhD Management',
      experience: '12 years',
      status: 'active',
      joinDate: '2012-09-01',
      avatar: 'https://i.pravatar.cc/150?img=20',
    },
    {
      id: 3,
      name: 'Dr. Usman Ali',
      empId: 'FAC-003',
      email: 'usman@nexus.edu',
      phone: '+92 302 3333333',
      department: 'Engineering',
      designation: 'Assistant Professor',
      qualification: 'PhD Engineering',
      experience: '8 years',
      status: 'leave',
      joinDate: '2016-08-15',
      avatar: 'https://i.pravatar.cc/150?img=15',
    },
  ];

  const admins = [
    {
      id: 1,
      name: 'Admin User',
      empId: 'ADM-001',
      email: 'admin@nexus.edu',
      phone: '+92 300 9999999',
      role: 'Super Admin',
      department: 'Administration',
      status: 'active',
      lastLogin: '2026-01-12 09:30 AM',
      avatar: 'https://i.pravatar.cc/150?img=25',
    },
    {
      id: 2,
      name: 'Registrar Office',
      empId: 'ADM-002',
      email: 'registrar@nexus.edu',
      phone: '+92 301 8888888',
      role: 'Registrar',
      department: 'Admissions',
      status: 'active',
      lastLogin: '2026-01-12 08:15 AM',
      avatar: 'https://i.pravatar.cc/150?img=30',
    },
  ];

  const librarians = [
    {
      id: 1,
      name: 'Ayesha Malik',
      empId: 'LIB-001',
      email: 'ayesha.malik@nexus.edu',
      phone: '+92 303 5555555',
      department: 'Library Services',
      qualification: 'MLIS',
      experience: '5 years',
      status: 'active',
      joinDate: '2019-07-01',
      avatar: 'https://i.pravatar.cc/150?img=45',
    },
    {
      id: 2,
      name: 'Hassan Raza',
      empId: 'LIB-002',
      email: 'hassan.raza@nexus.edu',
      phone: '+92 304 6666666',
      department: 'Library Services',
      qualification: 'MLS',
      experience: '3 years',
      status: 'active',
      joinDate: '2021-08-15',
      avatar: 'https://i.pravatar.cc/150?img=12',
    },
  ];

  const handleMenuOpen = (event, user) => {
    setAnchorEl(event.currentTarget);
    setSelectedUser(user);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedUser(null);
  };

  const handleAddUser = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData({
      fullName: '',
      email: '',
      rollNumber: '',
      department: '',
      program: '',
      semester: '',
      session: '',
      password: '',
      employeeId: '',
      designation: '',
      specialization: '',
      type: '',
      graduationYear: '',
      degree: '',
      personalEmail: '',
      currentCompany: '',
      linkedInProfile: '',
    });
  };

  const handleChange = (field) => (event) => {
    setFormData({ ...formData, [field]: event.target.value });
  };

  const handleUserTypeChange = (event) => {
    setUserType(event.target.value);
    // Reset form when changing user type
    setFormData({
      fullName: '',
      email: '',
      rollNumber: '',
      department: '',
      program: '',
      semester: '',
      session: '',
      password: '',
      employeeId: '',
      designation: '',
      specialization: '',
      type: '',
      graduationYear: '',
      degree: '',
      personalEmail: '',
      currentCompany: '',
      linkedInProfile: '',
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'default';
      case 'probation':
        return 'warning';
      case 'leave':
        return 'info';
      case 'suspended':
        return 'error';
      default:
        return 'default';
    }
  };

  const renderStudentTable = () => (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Student</TableCell>
            <TableCell>Roll No</TableCell>
            <TableCell>Department</TableCell>
            <TableCell>Semester</TableCell>
            <TableCell>CGPA</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {students.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((student) => (
            <TableRow key={student.id} hover>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar src={student.avatar} alt={student.name} />
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {student.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {student.email}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
              <TableCell>{student.rollNo}</TableCell>
              <TableCell>{student.department}</TableCell>
              <TableCell>{student.semester}</TableCell>
              <TableCell>
                <Chip
                  label={student.cgpa}
                  size="small"
                  color={student.cgpa >= 3.5 ? 'success' : student.cgpa >= 3.0 ? 'info' : 'warning'}
                />
              </TableCell>
              <TableCell>
                <Chip label={student.status} size="small" color={getStatusColor(student.status)} />
              </TableCell>
              <TableCell>
                <IconButton size="small" onClick={(e) => handleMenuOpen(e, student)}>
                  <MoreVert />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderFacultyTable = () => (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Faculty</TableCell>
            <TableCell>Emp ID</TableCell>
            <TableCell>Department</TableCell>
            <TableCell>Designation</TableCell>
            <TableCell>Experience</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {faculty.map((member) => (
            <TableRow key={member.id} hover>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar src={member.avatar} alt={member.name} />
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {member.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {member.email}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
              <TableCell>{member.empId}</TableCell>
              <TableCell>{member.department}</TableCell>
              <TableCell>{member.designation}</TableCell>
              <TableCell>{member.experience}</TableCell>
              <TableCell>
                <Chip label={member.status} size="small" color={getStatusColor(member.status)} />
              </TableCell>
              <TableCell>
                <IconButton size="small" onClick={(e) => handleMenuOpen(e, member)}>
                  <MoreVert />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderAdminTable = () => (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Admin</TableCell>
            <TableCell>Emp ID</TableCell>
            <TableCell>Role</TableCell>
            <TableCell>Department</TableCell>
            <TableCell>Last Login</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {admins.map((admin) => (
            <TableRow key={admin.id} hover>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar src={admin.avatar} alt={admin.name} />
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {admin.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {admin.email}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
              <TableCell>{admin.empId}</TableCell>
              <TableCell>
                <Chip label={admin.role} size="small" color="primary" />
              </TableCell>
              <TableCell>{admin.department}</TableCell>
              <TableCell>
                <Typography variant="caption">{admin.lastLogin}</Typography>
              </TableCell>
              <TableCell>
                <Chip label={admin.status} size="small" color={getStatusColor(admin.status)} />
              </TableCell>
              <TableCell>
                <IconButton size="small" onClick={(e) => handleMenuOpen(e, admin)}>
                  <MoreVert />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderLibrarianTable = () => (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Librarian</TableCell>
            <TableCell>Employee ID</TableCell>
            <TableCell>Department</TableCell>
            <TableCell>Qualification</TableCell>
            <TableCell>Experience</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {librarians.map((librarian) => (
            <TableRow key={librarian.id} hover>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar src={librarian.avatar} alt={librarian.name} />
                  <Box>
                    <Typography variant="body2" fontWeight="600">
                      {librarian.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {librarian.email}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
              <TableCell>{librarian.empId}</TableCell>
              <TableCell>{librarian.department}</TableCell>
              <TableCell>{librarian.qualification}</TableCell>
              <TableCell>{librarian.experience}</TableCell>
              <TableCell>
                <Chip label={librarian.status} size="small" color={getStatusColor(librarian.status)} />
              </TableCell>
              <TableCell>
                <IconButton size="small" onClick={(e) => handleMenuOpen(e, librarian)}>
                  <MoreVert />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <motion.div {...pageTransition}>
      <Box className="page-container">
        <PageHeader
          title="User Management"
          subtitle="Manage students, faculty, and administrative users"
        />

        <Card>
          <CardContent>
            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
                <Tab label={`Students (${students.length})`} />
                <Tab label={`Faculty (${faculty.length})`} />
                <Tab label={`Librarians (${librarians.length})`} />
                <Tab label={`Admin (${admins.length})`} />
              </Tabs>
            </Box>

            {/* Toolbar */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search users..."
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
              <Grid size={{ xs: 12, md: 8 }}>
                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <Button
                    startIcon={<FilterList />}
                    variant="outlined"
                    size="small"
                  >
                    Filters
                  </Button>
                  <Button startIcon={<Download />} variant="outlined" size="small">
                    Export
                  </Button>
                  <Button startIcon={<Upload />} variant="outlined" size="small">
                    Import
                  </Button>
                  <Button startIcon={<Add />} variant="contained" size="small" onClick={handleAddUser}>
                    Add User
                  </Button>
                </Stack>
              </Grid>
            </Grid>

            {/* Table */}
            {activeTab === 0 && renderStudentTable()}
            {activeTab === 1 && renderFacultyTable()}
            {activeTab === 2 && renderLibrarianTable()}
            {activeTab === 3 && renderAdminTable()}

            {/* Pagination */}
            <TablePagination
              component="div"
              count={activeTab === 0 ? students.length : activeTab === 1 ? faculty.length : activeTab === 2 ? librarians.length : admins.length}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
            />
          </CardContent>
        </Card>

        {/* Actions Menu */}
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          <MenuItem onClick={handleMenuClose}>
            <Edit fontSize="small" sx={{ mr: 1 }} /> Edit
          </MenuItem>
          <MenuItem onClick={handleMenuClose}>
            <Email fontSize="small" sx={{ mr: 1 }} /> Send Email
          </MenuItem>
          <MenuItem onClick={handleMenuClose}>
            <Block fontSize="small" sx={{ mr: 1 }} /> Suspend
          </MenuItem>
          <MenuItem onClick={handleMenuClose} sx={{ color: 'error.main' }}>
            <Delete fontSize="small" sx={{ mr: 1 }} /> Delete
          </MenuItem>
        </Menu>

        {/* Add User Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>Add New User</DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 2 }}>
              {/* User Type Selection */}
              <FormControl fullWidth>
                <InputLabel>User Type *</InputLabel>
                <Select value={userType} onChange={handleUserTypeChange} label="User Type *">
                  <MenuItem value="student">Student</MenuItem>
                  <MenuItem value="teacher">Teacher / Faculty</MenuItem>
                  <MenuItem value="alumni">Alumni</MenuItem>
                </Select>
              </FormControl>

              <Divider />

              {/* Student Form */}
              {userType === 'student' && (
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Full Name *"
                      placeholder="e.g., Muhammad Asad"
                      value={formData.fullName}
                      onChange={handleChange('fullName')}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Email *"
                      type="email"
                      placeholder="e.g., bit22031@uni.edu.pk"
                      value={formData.email}
                      onChange={handleChange('email')}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Roll Number *"
                      placeholder="e.g., BIT22031"
                      value={formData.rollNumber}
                      onChange={handleChange('rollNumber')}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Department *</InputLabel>
                      <Select
                        value={formData.department}
                        onChange={handleChange('department')}
                        label="Department *"
                      >
                        <MenuItem value="Information Technology">Information Technology</MenuItem>
                        <MenuItem value="Computer Science">Computer Science</MenuItem>
                        <MenuItem value="Business Administration">Business Administration</MenuItem>
                        <MenuItem value="Engineering">Engineering</MenuItem>
                        <MenuItem value="Medical Sciences">Medical Sciences</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Program *</InputLabel>
                      <Select
                        value={formData.program}
                        onChange={handleChange('program')}
                        label="Program *"
                      >
                        <MenuItem value="BS IT">BS IT</MenuItem>
                        <MenuItem value="BS CS">BS CS</MenuItem>
                        <MenuItem value="BBA">BBA</MenuItem>
                        <MenuItem value="BS Engineering">BS Engineering</MenuItem>
                        <MenuItem value="MBBS">MBBS</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      fullWidth
                      label="Semester *"
                      type="number"
                      placeholder="e.g., 1"
                      value={formData.semester}
                      onChange={handleChange('semester')}
                      inputProps={{ min: 1, max: 8 }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      fullWidth
                      label="Session *"
                      placeholder="e.g., 2022-2026"
                      value={formData.session}
                      onChange={handleChange('session')}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      fullWidth
                      label="Initial Password *"
                      type="password"
                      placeholder="Auto-generated"
                      value={formData.password}
                      onChange={handleChange('password')}
                    />
                  </Grid>
                </Grid>
              )}

              {/* Teacher Form */}
              {userType === 'teacher' && (
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Full Name *"
                      placeholder="e.g., Dr. Ghulam Mustafa"
                      value={formData.fullName}
                      onChange={handleChange('fullName')}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Email *"
                      type="email"
                      placeholder="Official faculty email"
                      value={formData.email}
                      onChange={handleChange('email')}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Employee ID *"
                      placeholder="e.g., EMP-102"
                      value={formData.employeeId}
                      onChange={handleChange('employeeId')}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Designation *</InputLabel>
                      <Select
                        value={formData.designation}
                        onChange={handleChange('designation')}
                        label="Designation *"
                      >
                        <MenuItem value="Lecturer">Lecturer</MenuItem>
                        <MenuItem value="Assistant Professor">Assistant Professor</MenuItem>
                        <MenuItem value="Associate Professor">Associate Professor</MenuItem>
                        <MenuItem value="Professor">Professor</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Department *</InputLabel>
                      <Select
                        value={formData.department}
                        onChange={handleChange('department')}
                        label="Department *"
                      >
                        <MenuItem value="Information Technology">Information Technology</MenuItem>
                        <MenuItem value="Computer Science">Computer Science</MenuItem>
                        <MenuItem value="Business Administration">Business Administration</MenuItem>
                        <MenuItem value="Engineering">Engineering</MenuItem>
                        <MenuItem value="Medical Sciences">Medical Sciences</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Specialization"
                      placeholder="e.g., Data Science"
                      value={formData.specialization}
                      onChange={handleChange('specialization')}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Type *</InputLabel>
                      <Select
                        value={formData.type}
                        onChange={handleChange('type')}
                        label="Type *"
                      >
                        <MenuItem value="Permanent">Permanent</MenuItem>
                        <MenuItem value="Visiting">Visiting</MenuItem>
                        <MenuItem value="Contract">Contract</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Initial Password *"
                      type="password"
                      placeholder="Auto-generated"
                      value={formData.password}
                      onChange={handleChange('password')}
                    />
                  </Grid>
                </Grid>
              )}

              {/* Alumni Form */}
              {userType === 'alumni' && (
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Full Name *"
                      placeholder="Full name of alumni"
                      value={formData.fullName}
                      onChange={handleChange('fullName')}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Graduation Year *</InputLabel>
                      <Select
                        value={formData.graduationYear}
                        onChange={handleChange('graduationYear')}
                        label="Graduation Year *"
                      >
                        <MenuItem value="2026">2026</MenuItem>
                        <MenuItem value="2025">2025</MenuItem>
                        <MenuItem value="2024">2024</MenuItem>
                        <MenuItem value="2023">2023</MenuItem>
                        <MenuItem value="2022">2022</MenuItem>
                        <MenuItem value="2021">2021</MenuItem>
                        <MenuItem value="2020">2020</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Degree *</InputLabel>
                      <Select
                        value={formData.degree}
                        onChange={handleChange('degree')}
                        label="Degree *"
                      >
                        <MenuItem value="BS CS">BS CS</MenuItem>
                        <MenuItem value="BS IT">BS IT</MenuItem>
                        <MenuItem value="BBA">BBA</MenuItem>
                        <MenuItem value="BS Engineering">BS Engineering</MenuItem>
                        <MenuItem value="MBBS">MBBS</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Personal Email *"
                      type="email"
                      placeholder="Contact email outside university"
                      value={formData.personalEmail}
                      onChange={handleChange('personalEmail')}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Current Company"
                      placeholder="Optional"
                      value={formData.currentCompany}
                      onChange={handleChange('currentCompany')}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="LinkedIn Profile"
                      placeholder="https://linkedin.com/in/username"
                      value={formData.linkedInProfile}
                      onChange={handleChange('linkedInProfile')}
                    />
                  </Grid>
                </Grid>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button variant="contained" onClick={handleCloseDialog}>
              Add {userType === 'student' ? 'Student' : userType === 'teacher' ? 'Teacher' : 'Alumni'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </motion.div>
  );
};

export default UserManagement;
