import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Paper,
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
  Alert,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  Stack,
  alpha,
  Tooltip,
  Divider,
  Snackbar,
  CircularProgress,
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
import { useAuth } from '../../contexts/AuthContext';
import { pageTransition } from '../../utils/animations';
import { authAPI } from '../../api/auth';
import { sisAPI } from '../../api/sis';

const UserManagement = () => {
  const theme = useTheme();
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openFilterDialog, setOpenFilterDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [userType, setUserType] = useState('student');
  const fileInputRef = useRef(null);
  const [openMappingDialog, setOpenMappingDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importHeaders, setImportHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [isImporting, setIsImporting] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);

  const blankFormData = {
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
  };

  const [formData, setFormData] = useState(blankFormData);

  // User lists from API
  const [students, setStudents] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [librarians, setLibrarians] = useState([]);
  const [editFormData, setEditFormData] = useState({
    userId: '',
    fullName: '',
    email: '',
    phone: '',
    status: 'active',
    role: '',
  });

  const normalizeAuthUser = useCallback((u) => ({
    id: u.user_id || u.id,
    user_id: u.user_id || u.id,
    first_name: u.first_name || '',
    last_name: u.last_name || '',
    name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
    email: u.email,
    phone: u.phone || '',
    role: u.role,
    status: u.is_active ? 'active' : 'inactive',
    is_active: Boolean(u.is_active),
    lastLogin: u.created_at || '-',
  }), []);

  const normalizeStudent = useCallback((student, authUserMap, departmentMap, programMap) => {
    const studentId = student.student_id || student.id;
    const authUser = authUserMap.get(String(student.user_id));
    const program = programMap.get(String(student.program_id));
    const department = program ? departmentMap.get(String(program.dept_id)) : null;

    return {
      id: studentId,
      user_id: student.user_id,
      programId: student.program_id || null,
      role: 'student',
      name: authUser?.name || student.name || `Student ${studentId || ''}`,
      email: authUser?.email || student.email || '-',
      phone: authUser?.phone || student.phone || '',
      rollNo: student.roll_no || student.rollNo || '-',
      department: department?.name || student.department || '-',
      program: program?.title || student.program || '-',
      semester: student.current_semester || student.semester || '-',
      cgpa: student.cgpa || 0,
      status: (authUser?.status || student.status || 'active').toLowerCase(),
    };
  }, []);

  const normalizeFaculty = useCallback((facultyMember, authUserMap, departmentMap) => {
    const facultyId = facultyMember.faculty_id || facultyMember.id;
    const authUser = authUserMap.get(String(facultyMember.user_id));
    const department = departmentMap.get(String(facultyMember.dept_id));

    return {
      id: facultyId,
      user_id: facultyMember.user_id,
      role: 'faculty',
      name: authUser?.name || facultyMember.name || `Faculty ${facultyId || ''}`,
      email: authUser?.email || facultyMember.email || '-',
      phone: authUser?.phone || facultyMember.phone || '',
      empId: facultyMember.employee_code || facultyMember.empId || '-',
      department: department?.name || facultyMember.department || (facultyMember.dept_id ? `Dept ${facultyMember.dept_id}` : '-'),
      designation: facultyMember.designation || '-',
      qualification: facultyMember.qualification || '-',
      specialization: facultyMember.specialization || '-',
      experience: facultyMember.experience || '-',
      status: (authUser?.status || facultyMember.status || 'active').toLowerCase(),
    };
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const [usersRes, studentsRes, facultyRes, departmentsRes, programsRes] = await Promise.allSettled([
        authAPI.listUsers(),
        sisAPI.getStudents(),
        sisAPI.getFaculty(),
        sisAPI.getDepartments(),
        sisAPI.getPrograms(),
      ]);
      const allUsersRaw = usersRes.status === 'fulfilled' ? (usersRes.value.data?.users || usersRes.value.data || []) : [];
      const allUsers = (Array.isArray(allUsersRaw) ? allUsersRaw : []).map(normalizeAuthUser);
      const authUserMap = new Map(allUsers.map((user) => [String(user.user_id), user]));

      const departmentRows = departmentsRes.status === 'fulfilled'
        ? (departmentsRes.value.data?.departments || departmentsRes.value.data || [])
        : [];
      const programRows = programsRes.status === 'fulfilled'
        ? (programsRes.value.data?.programs || programsRes.value.data || [])
        : [];
      const departmentMap = new Map((Array.isArray(departmentRows) ? departmentRows : []).map((dept) => [String(dept.dept_id), dept]));
      const programMap = new Map((Array.isArray(programRows) ? programRows : []).map((program) => [String(program.program_id), program]));

      const studentData = studentsRes.status === 'fulfilled' ? (studentsRes.value.data?.students || studentsRes.value.data || []) : [];
      const facultyData = facultyRes.status === 'fulfilled' ? (facultyRes.value.data?.faculty || facultyRes.value.data || []) : [];

      setDepartments(Array.isArray(departmentRows) ? departmentRows : []);
      setPrograms(Array.isArray(programRows) ? programRows : []);
      setStudents((Array.isArray(studentData) ? studentData : []).map((student) => normalizeStudent(student, authUserMap, departmentMap, programMap)));
      setFaculty((Array.isArray(facultyData) ? facultyData : []).map((member) => normalizeFaculty(member, authUserMap, departmentMap)));
      setAdmins(allUsers.filter((u) => u.role === 'admin'));
      setLibrarians(allUsers.filter((u) => u.role === 'librarian'));
    } catch (e) {
      console.error(e);
    }
  }, [normalizeAuthUser, normalizeFaculty, normalizeStudent]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const currentUserId = currentUser?.user_id || currentUser?.id || '';
  const isSelfSelected = Boolean(
    currentUserId && selectedUser?.user_id && String(currentUserId) === String(selectedUser.user_id)
  );

  const handleMenuOpen = (event, user) => {
    setAnchorEl(event.currentTarget);
    setSelectedUser(user);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleAddUser = () => {
    setOpenDialog(true);
  };

  const resetFormData = () => {
    setFormData(blankFormData);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    resetFormData();
  };

  const handleChange = (field) => (event) => {
    setFormData({ ...formData, [field]: event.target.value });
  };

  const handleUserTypeChange = (event) => {
    setUserType(event.target.value);
    // Reset form when changing user type
    resetFormData();
  };

  const getStatusColor = (status) => {
    const normalized = String(status || '').toLowerCase();
    switch (normalized) {
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
        return normalized === 'true' ? 'success' : 'default';
    }
  };

  const handleDeleteClick = () => {
    if (isSelfSelected) {
      setSnackbar({ open: true, message: 'You cannot delete your own account.', severity: 'warning' });
      handleMenuClose();
      return;
    }
    handleMenuClose();
    setOpenDeleteDialog(true);
  };

  const handleEditClick = () => {
    if (!selectedUser) {
      handleMenuClose();
      return;
    }

    handleMenuClose();
    setEditFormData({
      userId: selectedUser.user_id || selectedUser.id || '',
      fullName: selectedUser.name || '',
      email: selectedUser.email || '',
      phone: selectedUser.phone || '',
      status: selectedUser.status === 'inactive' ? 'inactive' : 'active',
      role: selectedUser.role || '',
    });
    setOpenEditDialog(true);
  };

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
    setEditFormData({
      userId: '',
      fullName: '',
      email: '',
      phone: '',
      status: 'active',
      role: '',
    });
  };

  const handleUpdateSelectedUser = async () => {
    if (!editFormData.userId || !editFormData.fullName || !editFormData.email) {
      setSnackbar({ open: true, message: 'Name and email are required.', severity: 'error' });
      return;
    }

    const { firstName, lastName } = splitFullName(editFormData.fullName);
    const payload = {
      email: editFormData.email.trim(),
      first_name: firstName,
      last_name: lastName || null,
      phone: editFormData.phone.trim() || null,
      is_active: editFormData.status !== 'inactive',
    };

    try {
      await authAPI.updateUser(editFormData.userId, payload);
      setSnackbar({ open: true, message: 'User updated successfully.', severity: 'success' });
      handleCloseEditDialog();
      await loadUsers();
    } catch (e) {
      console.error(e);
      setSnackbar({
        open: true,
        message: e?.response?.data?.detail || 'Unable to update user.',
        severity: 'error',
      });
    }
  };

  const handleDeleteSelectedUser = async () => {
    console.log('[DELETE] Initiating deletion process...');
    console.log('[DELETE] Selected user object:', selectedUser);
    
    if (!selectedUser) {
      console.warn('[DELETE] No user selected for deletion');
      return;
    }

    const targetId = selectedUser.user_id || selectedUser.id;
    console.log('[DELETE] Resolved target ID:', targetId);
    
    try {
      console.log('[DELETE] Calling authAPI.deleteUser...');
      const response = await authAPI.deleteUser(targetId);
      console.log('[DELETE] API Response:', response);
      
      setSnackbar({ open: true, message: 'User deleted successfully.', severity: 'success' });
      console.log('[DELETE] Refreshing user list...');
      await loadUsers();
    } catch (e) {
      console.error('[DELETE] Deletion failed with error:', e);
      const errorMsg = e.response?.data?.detail || e.message || 'Failed to delete user.';
      setSnackbar({ open: true, message: errorMsg, severity: 'error' });
    } finally {
      console.log('[DELETE] Closing dialog and clearing selection');
      setOpenDeleteDialog(false);
      setSelectedUser(null);
    }
  };

  const normalizeText = (value) => String(value || '').trim().toLowerCase();

  const canonicalKey = (value) =>
    String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '');

  const buildFieldLookup = (source = {}) =>
    Object.entries(source).reduce((acc, [key, value]) => {
      acc[canonicalKey(key)] = value;
      return acc;
    }, {});

  const readSourceValue = (source, ...keys) => {
    const lookup = buildFieldLookup(source);
    for (const key of keys) {
      const value = lookup[canonicalKey(key)];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return value;
      }
    }
    return '';
  };

  const splitFullName = (fullName) => {
    const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    return {
      firstName: parts[0] || '',
      lastName: parts.slice(1).join(' '),
    };
  };

  const resolveDepartmentId = (value) => {
    const rawValue = String(value || '').trim();
    if (!rawValue) return null;
    const directMatch = departments.find((dept) => String(dept.dept_id) === rawValue);
    if (directMatch) return directMatch.dept_id;
    const nameMatch = departments.find((dept) => normalizeText(dept.name) === normalizeText(rawValue) || normalizeText(dept.code) === normalizeText(rawValue));
    return nameMatch?.dept_id || null;
  };

  const resolveProgramId = (value) => {
    const rawValue = String(value || '').trim();
    if (!rawValue) return null;
    const directMatch = programs.find((program) => String(program.program_id) === rawValue);
    if (directMatch) return directMatch.program_id;
    const textMatch = programs.find((program) => normalizeText(program.title) === normalizeText(rawValue));
    return textMatch?.program_id || null;
  };

  const getFilteredRows = (rows) => rows.filter((row) => {
    const matchesSearch = !normalizeText(searchQuery) || [
      row.name,
      row.email,
      row.rollNo,
      row.empId,
      row.department,
      row.designation,
      row.qualification,
      row.specialization,
      row.program,
      row.status,
    ].some((field) => normalizeText(field).includes(normalizeText(searchQuery)));

    const matchesDepartment = filterDepartment === 'all' || normalizeText(row.department) === normalizeText(filterDepartment);
    const matchesStatus = filterStatus === 'all' || normalizeText(row.status) === normalizeText(filterStatus);

    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const escapeCsvValue = (value) => {
    const safeValue = String(value ?? '').replace(/"/g, '""');
    return /[",\n]/.test(safeValue) ? `"${safeValue}"` : safeValue;
  };

  const downloadCsv = (filename, headers, rows) => {
    const content = [headers.map(escapeCsvValue).join(',')]
      .concat(rows.map((row) => row.map(escapeCsvValue).join(',')))
      .join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportUsers = () => {
    const filenameBase = ['students', 'faculty', 'librarians', 'admins'][activeTab] || 'users';
    const filteredRows = [filteredStudents, filteredFaculty, filteredLibrarians, filteredAdmins][activeTab] || [];
    const exportRows = {
      0: filteredRows.map((student) => [student.name, student.email, student.rollNo, student.department, student.program, student.semester, student.cgpa, student.status]),
      1: filteredRows.map((member) => [member.name, member.email, member.empId, member.department, member.designation, member.experience, member.status]),
      2: filteredRows.map((librarian) => [librarian.name, librarian.email, librarian.empId || '-', librarian.department || '-', librarian.qualification || '-', librarian.experience || '-', librarian.status]),
      3: filteredRows.map((admin) => [admin.name, admin.email, admin.role, admin.status]),
    }[activeTab] || [];
    const headers = {
      0: ['Full Name', 'Email', 'Roll No', 'Department', 'Program', 'Semester', 'CGPA', 'Status'],
      1: ['Full Name', 'Email', 'Employee Code', 'Department', 'Designation', 'Experience', 'Status'],
      2: ['Full Name', 'Email', 'Employee Code', 'Department', 'Qualification', 'Experience', 'Status'],
      3: ['Full Name', 'Email', 'Role', 'Status'],
    }[activeTab] || ['Full Name', 'Email'];

    downloadCsv(`users-${filenameBase}-${new Date().toISOString().slice(0, 10)}.csv`, headers, exportRows);
    setSnackbar({ open: true, message: 'Export downloaded successfully.', severity: 'success' });
  };

  const buildRegisterPayload = (source) => {
    const normalizedRole = normalizeText(readSourceValue(source, 'role', 'userType', 'type', 'accountType'));
    let role = normalizedRole === 'teacher' ? 'faculty' : normalizedRole;
    if (!role) {
      if (readSourceValue(source, 'employee_code', 'employeeId', 'empId', 'employee id')) {
        role = 'faculty';
      } else if (readSourceValue(source, 'roll_no', 'rollNo', 'rollNumber', 'roll number', 'program_id', 'programId')) {
        role = 'student';
      }
    }
    const fallbackName = String(readSourceValue(source, 'full_name', 'fullName', 'name', 'full name')).trim();
    const { firstName, lastName } = splitFullName(fallbackName);
    const email = String(readSourceValue(source, 'email')).trim();
    const password = String(readSourceValue(source, 'password', 'initialPassword', 'initial password') || 'TempPass@123');

    const payload = {
      email,
      password,
      role,
      first_name: String(source.first_name || source.firstName || firstName || '').trim(),
      last_name: String(source.last_name || source.lastName || lastName || '').trim() || null,
    };

    if (role === 'student') {
      const programId = resolveProgramId(
        readSourceValue(source, 'program_id', 'programId', 'program', 'programName', 'program name')
      );
      const rollNo = String(readSourceValue(source, 'roll_no', 'rollNo', 'rollNumber', 'roll number')).trim();
      const currentSemesterValue = readSourceValue(
        source,
        'current_semester',
        'currentSemester',
        'semester',
        'current semester'
      );
      payload.roll_no = rollNo;
      payload.program_id = programId;
      payload.current_semester = currentSemesterValue ? Number(currentSemesterValue) : null;
    }

    if (role === 'faculty') {
      const deptId = resolveDepartmentId(
        readSourceValue(source, 'dept_id', 'departmentId', 'department', 'departmentName', 'department name')
      );
      payload.employee_code = String(readSourceValue(source, 'employee_code', 'employeeId', 'empId', 'employee id')).trim();
      payload.dept_id = deptId;
      payload.designation = String(readSourceValue(source, 'designation')).trim() || null;
    }

    return payload;
  };

  const handleCreateUser = async () => {
    const role = userType === 'teacher' ? 'faculty' : userType;
    const email = userType === 'alumni' ? formData.personalEmail : formData.email;
    const password = formData.password || 'TempPass@123';
    const { firstName, lastName } = splitFullName(formData.fullName);

    if (!email || !firstName) {
      setSnackbar({ open: true, message: 'Name and email are required.', severity: 'error' });
      return;
    }

    const payload = {
      email,
      password,
      role,
      first_name: firstName,
      last_name: lastName || null,
    };

    if (role === 'student') {
      const programId = Number(formData.program) || resolveProgramId(formData.program);
      if (!formData.rollNumber || !programId) {
        setSnackbar({ open: true, message: 'Select a department and program for the student.', severity: 'error' });
        return;
      }
      payload.roll_no = formData.rollNumber;
      payload.program_id = programId;
      payload.current_semester = formData.semester ? Number(formData.semester) : null;
    }

    if (role === 'faculty') {
      const deptId = Number(formData.department) || resolveDepartmentId(formData.department);
      if (!formData.employeeId || !deptId) {
        setSnackbar({ open: true, message: 'Select a department and enter an employee ID.', severity: 'error' });
        return;
      }
      payload.employee_code = formData.employeeId;
      payload.dept_id = deptId;
      payload.designation = formData.designation || null;
    }

    try {
      await authAPI.register(payload);
      handleCloseDialog();
      await loadUsers();
      setPage(0);
      setActiveTab(
        role === 'faculty'
          ? 1
          : role === 'librarian'
            ? 2
            : role === 'admin'
              ? 3
              : 0
      );
      setSnackbar({ open: true, message: 'User added successfully.', severity: 'success' });
    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: e?.response?.data?.detail || 'Unable to add user.', severity: 'error' });
    }
  };

  const handleToggleSelectedUser = async () => {
    if (!selectedUser?.user_id) {
      handleMenuClose();
      return;
    }
    try {
      await authAPI.toggleUserActive(selectedUser.user_id);
      handleMenuClose();
      await loadUsers();
      setSnackbar({ open: true, message: 'User status updated.', severity: 'success' });
    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: 'Unable to update user status.', severity: 'error' });
      handleMenuClose();
    }
  };

  const handleImportUsers = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const parseCsvLine = (line) => {
      const values = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i+1] === '"') { current += '"'; i++; }
          else inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else current += char;
      }
      values.push(current.trim());
      return values;
    };

    try {
      const text = await file.text();
      let headers = [];
      let rows = [];

      if (file.name.toLowerCase().endsWith('.json')) {
        const parsed = JSON.parse(text);
        rows = Array.isArray(parsed) ? parsed : (parsed.users || parsed.records || []);
        if (rows.length > 0) headers = Object.keys(rows[0]);
      } else {
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) throw new Error('File is empty or missing data rows');
        headers = parseCsvLine(lines[0]).map(h => h.replace(/^"|"$/g, ''));
        rows = lines.slice(1).map(l => {
          const vals = parseCsvLine(l).map(v => v.replace(/^"|"$/g, ''));
          return headers.reduce((acc, h, i) => { acc[h] = vals[i] || ''; return acc; }, {});
        });
      }

      setImportHeaders(headers);
      setImportRows(rows);
      
      // Auto-mapping logic
      const initialMapping = {};
      const targets = ['full_name', 'email', 'role', 'roll_no', 'current_semester', 'employee_code', 'department', 'program'];
      targets.forEach(target => {
        const match = headers.find(h => canonicalKey(h) === canonicalKey(target) || canonicalKey(h).includes(canonicalKey(target)));
        if (match) initialMapping[target] = match;
      });
      
      setMapping(initialMapping);
      setOpenMappingDialog(true);
    } catch (e) {
      setSnackbar({ open: true, message: e.message, severity: 'error' });
    }
  };

  const handleFinishImport = async () => {
    setIsImporting(true);
    try {
      const payloads = importRows.map(row => {
        const mappedRow = {};
        Object.entries(mapping).forEach(([target, source]) => {
          mappedRow[target] = row[source];
        });
        return buildRegisterPayload(mappedRow);
      });

      const results = await Promise.allSettled(payloads.map(p => authAPI.register(p)));
      const success = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.length - success;
      
      setSnackbar({
        open: true,
        message: `Import complete: ${success} success, ${failed} failed.`,
        severity: failed > 0 ? 'warning' : 'success'
      });
      await loadUsers();
      setOpenMappingDialog(false);
    } catch (e) {
      setSnackbar({ open: true, message: 'Import failed: ' + e.message, severity: 'error' });
    } finally {
      setIsImporting(false);
    }
  };

  const filteredStudents = getFilteredRows(students);
  const filteredFaculty = getFilteredRows(faculty);
  const filteredAdmins = getFilteredRows(admins);
  const filteredLibrarians = getFilteredRows(librarians);

  const paginatedStudents = filteredStudents.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const paginatedFaculty = filteredFaculty.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const paginatedAdmins = filteredAdmins.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const paginatedLibrarians = filteredLibrarians.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  useEffect(() => {
    setPage(0);
  }, [activeTab, searchQuery, filterDepartment, filterStatus]);

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
          {paginatedStudents.map((student) => (
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
          {paginatedFaculty.map((member) => (
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
          {paginatedAdmins.map((admin) => (
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
          {paginatedLibrarians.map((librarian) => (
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
                <Stack 
                  direction={{ xs: 'column', sm: 'row' }} 
                  spacing={1.5} 
                  justifyContent="flex-end"
                  sx={{ flexWrap: 'wrap' }}
                >
                  <Button
                    startIcon={<FilterList />}
                    variant="outlined"
                    size="small"
                    onClick={() => setOpenFilterDialog(true)}
                    sx={{ flex: { xs: '1 1 100%', sm: '0 0 auto' } }}
                  >
                    Filters
                  </Button>
                  <Button 
                    startIcon={<Download />} 
                    variant="outlined" 
                    size="small"
                    onClick={handleExportUsers}
                    sx={{ flex: { xs: '1 1 100%', sm: '0 0 auto' } }}
                  >
                    Export
                  </Button>
                  <Button 
                    startIcon={<Upload />} 
                    variant="outlined" 
                    size="small"
                    onClick={() => fileInputRef.current?.click()}
                    sx={{ flex: { xs: '1 1 100%', sm: '0 0 auto' } }}
                  >
                    Import
                  </Button>
                  <Button 
                    startIcon={<Add />} 
                    variant="contained" 
                    size="small" 
                    onClick={handleAddUser}
                    sx={{ flex: { xs: '1 1 100%', sm: '0 0 auto' } }}
                  >
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
              count={
                activeTab === 0
                  ? filteredStudents.length
                  : activeTab === 1
                    ? filteredFaculty.length
                    : activeTab === 2
                      ? filteredLibrarians.length
                      : filteredAdmins.length
              }
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
            />
          </CardContent>
        </Card>

        <Dialog open={openFilterDialog} onClose={() => setOpenFilterDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Filter Users</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <FormControl fullWidth>
                <InputLabel>Department</InputLabel>
                <Select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  label="Department"
                >
                  <MenuItem value="all">All Departments</MenuItem>
                  {departments.map((department) => (
                    <MenuItem key={department.dept_id} value={department.name}>
                      {department.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setFilterDepartment('all');
                setFilterStatus('all');
              }}
            >
              Reset
            </Button>
            <Button variant="contained" onClick={() => setOpenFilterDialog(false)}>
              Apply
            </Button>
          </DialogActions>
        </Dialog>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.json,text/csv,application/json"
          style={{ display: 'none' }}
          onChange={handleImportUsers}
        />

        {/* Actions Menu */}
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          <MenuItem onClick={handleEditClick}>
            <Edit fontSize="small" sx={{ mr: 1 }} /> Edit
          </MenuItem>
          <MenuItem onClick={handleMenuClose}>
            <Email fontSize="small" sx={{ mr: 1 }} /> Send Email
          </MenuItem>
          <MenuItem onClick={handleToggleSelectedUser}>
            <Block fontSize="small" sx={{ mr: 1 }} /> {selectedUser?.is_active ? 'Suspend' : 'Activate'}
          </MenuItem>
          <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }} disabled={isSelfSelected}>
            <Delete fontSize="small" sx={{ mr: 1 }} /> Delete
          </MenuItem>
        </Menu>

        {/* Edit User Dialog */}
        <Dialog open={openEditDialog} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
          <DialogTitle>Edit User</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Full Name *"
                value={editFormData.fullName}
                onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
              />
              <TextField
                fullWidth
                label="Email *"
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
              />
              <TextField
                fullWidth
                label="Phone"
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
              />
              <TextField
                fullWidth
                label="Role"
                value={editFormData.role || 'user'}
                InputProps={{ readOnly: true }}
              />
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  label="Status"
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={handleCloseEditDialog}>Cancel</Button>
            <Button variant="contained" onClick={handleUpdateSelectedUser}>
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>

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
                  <MenuItem value="librarian">Librarian</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
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
                        onChange={(e) => setFormData({ ...formData, department: e.target.value, program: '' })}
                        label="Department *"
                      >
                        <MenuItem value="">Select department</MenuItem>
                        {departments.map((department) => (
                          <MenuItem key={department.dept_id} value={String(department.dept_id)}>
                            {department.name} ({department.code})
                          </MenuItem>
                        ))}
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
                        disabled={!formData.department}
                      >
                        <MenuItem value="">Select program</MenuItem>
                        {programs
                          .filter((program) => !formData.department || String(program.dept_id) === String(formData.department))
                          .map((program) => (
                            <MenuItem key={program.program_id} value={String(program.program_id)}>
                              {program.title}
                            </MenuItem>
                          ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      fullWidth
                      label="Current Semester *"
                      type="number"
                      placeholder="e.g., 5"
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
                        <MenuItem value="">Select department</MenuItem>
                        {departments.map((department) => (
                          <MenuItem key={department.dept_id} value={String(department.dept_id)}>
                            {department.name} ({department.code})
                          </MenuItem>
                        ))}
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

              {(userType === 'admin' || userType === 'librarian') && (
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Full Name *"
                      placeholder={userType === 'admin' ? 'e.g., System Administrator' : 'e.g., Library Staff'}
                      value={formData.fullName}
                      onChange={handleChange('fullName')}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Email *"
                      type="email"
                      placeholder="Official email address"
                      value={formData.email}
                      onChange={handleChange('email')}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Initial Password *"
                      type="password"
                      placeholder="Auto-generated if empty"
                      value={formData.password}
                      onChange={handleChange('password')}
                    />
                  </Grid>
                </Grid>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button variant="contained" onClick={handleCreateUser}>
              Add {userType === 'student' ? 'Student' : userType === 'teacher' ? 'Teacher' : userType === 'librarian' ? 'Librarian' : 'Admin'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Delete color="error" /> Confirm Delete
          </DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to permanently delete <strong>{selectedUser?.name}</strong>?
              This action cannot be undone and will remove all associated records.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
            <Button variant="contained" color="error" onClick={handleDeleteSelectedUser}>
              Delete Permanently
            </Button>
          </DialogActions>
        </Dialog>

        {/* Mapping Dialog */}
        <Dialog open={openMappingDialog} onClose={() => setOpenMappingDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', py: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Upload />
              <Typography variant="h6">Import Mapping Wizard</Typography>
            </Stack>
          </DialogTitle>
          <DialogContent sx={{ mt: 2 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              Select which columns from your file match the Nexus user fields. We've attempted to auto-match them for you.
            </Alert>
            <Grid container spacing={3}>
              {[
                { key: 'full_name', label: 'Full Name', required: true },
                { key: 'email', label: 'Email Address', required: true },
                { key: 'role', label: 'User Role', required: true, helper: 'student, faculty, librarian, or admin' },
                { key: 'roll_no', label: 'Roll Number', helper: 'Required for students' },
                { key: 'employee_code', label: 'Employee Code', helper: 'Required for staff' },
                { key: 'department', label: 'Department Name/ID' },
                { key: 'program', label: 'Program Name/ID' },
              ].map((field) => (
                <Grid item xs={12} sm={6} key={field.key}>
                  <FormControl fullWidth size="small">
                    <InputLabel>{field.label} {field.required && '*'}</InputLabel>
                    <Select
                      value={mapping[field.key] || ''}
                      onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                      label={`${field.label} ${field.required ? '*' : ''}`}
                    >
                      <MenuItem value=""><em>None</em></MenuItem>
                      {importHeaders.map(h => (
                        <MenuItem key={h} value={h}>{h}</MenuItem>
                      ))}
                    </Select>
                    {field.helper && <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1 }}>{field.helper}</Typography>}
                  </FormControl>
                </Grid>
              ))}
            </Grid>

            <Box sx={{ mt: 4 }}>
              <Typography variant="subtitle2" gutterBottom fontWeight="bold">Data Preview (First 3 rows):</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      {Object.keys(mapping).filter(k => mapping[k]).map(k => (
                        <TableCell key={k} sx={{ fontWeight: 'bold' }}>{k}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {importRows.slice(0, 3).map((row, i) => (
                      <TableRow key={i}>
                        {Object.keys(mapping).filter(k => mapping[k]).map(k => (
                          <TableCell key={k}>{row[mapping[k]]}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setOpenMappingDialog(false)}>Cancel</Button>
            <Button 
              variant="contained" 
              onClick={handleFinishImport} 
              disabled={isImporting || !mapping.full_name || !mapping.email}
              startIcon={isImporting ? <CircularProgress size={20} color="inherit" /> : <CheckCircle />}
            >
              {isImporting ? 'Importing...' : `Import ${importRows.length} Users`}
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </motion.div>
  );
};

export default UserManagement;
