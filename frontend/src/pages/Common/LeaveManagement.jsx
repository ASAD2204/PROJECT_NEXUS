import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
  Stack,
  Grid,
  Tab,
  Tabs,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  CircularProgress,
  IconButton,
  Alert,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Event as EventIcon,
  CloudUpload as CloudUploadIcon,
  AttachFile as AttachFileIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Assignment as AssignmentIcon,
  Feedback as FeedbackIcon,
  Person as PersonIcon,
} from '@mui/icons-material';

import { hrAPI } from '../../api/hr';
import { chatAPI } from '../../api/chat';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { pageTransition } from '../../utils/animations';

const LeaveManagement = () => {
  const theme = useTheme();
  const { user, userType } = useAuth();
  const { showSnackbar } = useSnackbar();

  // Dialog & Form state
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Leave data states
  const [myLeaves, setMyLeaves] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState({
    casual_leave_used: 0,
    casual_leave_remaining: 20,
    casual_leave_total: 20,
    sick_leave_used: 0,
    sick_leave_remaining: 10,
    sick_leave_total: 10,
  });
  const [pendingRequests, setPendingRequests] = useState([]);

  // Form states
  const [leaveType, setLeaveType] = useState('Casual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedUrls, setUploadedUrls] = useState([]);

  // Rejection Dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedLeaveId, setSelectedLeaveId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fileInputRef = useRef(null);

  // Dynamic colors matching userType
  const portalTheme = React.useMemo(() => {
    switch (userType) {
      case 'admin':
      case 'hod':
        return {
          primary: '#1E3A8A',
          gradient: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)',
          softBg: alpha('#1E3A8A', 0.08),
        };
      case 'teacher':
        return {
          primary: '#4C1D95',
          gradient: 'linear-gradient(135deg, #4C1D95 0%, #8B5CF6 100%)',
          softBg: alpha('#4C1D95', 0.08),
        };
      default:
        return {
          primary: '#0F766E',
          gradient: 'linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)',
          softBg: alpha('#0F766E', 0.08),
        };
    }
  }, [userType]);

  // Load initial data
  const loadData = async () => {
    setLoading(true);
    try {
      if (userType === 'admin' || userType === 'hod') {
        const res = await hrAPI.getPendingLeaves();
        setPendingRequests(res.data || []);
      } else {
        const res = await hrAPI.getMyLeaves();
        setMyLeaves(res.data?.leaves || []);
        if (res.data?.balance) {
          setLeaveBalance(prev => ({
            ...prev,
            casual_leave_used: res.data.balance.casual_leave_used ?? 0,
            casual_leave_remaining: res.data.balance.casual_leave_remaining ?? 20,
          }));
        }
      }
    } catch (err) {
      console.error('Failed to load leave data', err);
      showSnackbar('Error loading leave details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userType]);

  // Handle File Selection & Upload
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      showSnackbar('File size cannot exceed 10MB limit', 'warning');
      return;
    }

    setSelectedFile(file);
    setUploading(true);
    setUploadProgress(20);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      setUploadProgress(50);
      const res = await chatAPI.uploadFile(formData);
      setUploadProgress(90);
      
      const fileUrl = res.data?.file_url || res.data?.url;
      if (fileUrl) {
        setUploadedUrls([fileUrl]);
        setUploadProgress(100);
        showSnackbar('Document uploaded successfully!', 'success');
      } else {
        throw new Error('Upload succeeded but no URL returned');
      }
    } catch (err) {
      console.error('File upload failed', err);
      showSnackbar('Document upload failed. Try again.', 'error');
      setSelectedFile(null);
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setUploadedUrls([]);
    setUploadProgress(0);
  };

  // Submit Leave Application
  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason) {
      showSnackbar('Please fill in all required fields', 'warning');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      showSnackbar('Start date cannot be after end date', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: reason,
        supporting_documents: uploadedUrls,
      };

      await hrAPI.applyLeave(payload);
      showSnackbar('Leave applied successfully!', 'success');
      
      // Reset form
      setStartDate('');
      setEndDate('');
      setReason('');
      setSelectedFile(null);
      setUploadedUrls([]);
      
      // Reload history
      await loadData();
      setTabValue(0); // Switch to list tab
    } catch (err) {
      console.error('Failed to submit leave', err);
      const errMsg = err.response?.data?.detail || 'Failed to submit leave request';
      showSnackbar(errMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Approve request
  const handleApprove = async (leaveId) => {
    try {
      await hrAPI.approveLeave(leaveId);
      showSnackbar('Leave request approved', 'success');
      await loadData();
    } catch (err) {
      console.error('Failed to approve leave', err);
      showSnackbar('Approval failed', 'error');
    }
  };

  // Trigger rejection dialog
  const openRejectDialog = (leaveId) => {
    setSelectedLeaveId(leaveId);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  // Reject request
  const handleRejectConfirm = async () => {
    if (!rejectionReason.trim()) {
      showSnackbar('Please provide a reason for rejection', 'warning');
      return;
    }

    try {
      await hrAPI.rejectLeave(selectedLeaveId, rejectionReason);
      showSnackbar('Leave request rejected', 'info');
      setRejectDialogOpen(false);
      await loadData();
    } catch (err) {
      console.error('Failed to reject leave', err);
      showSnackbar('Rejection failed', 'error');
    }
  };

  // Helper for Status Badge styling
  const getStatusBadge = (status) => {
    let color = 'default';
    let icon = <HourglassEmptyIcon sx={{ fontSize: 16 }} />;
    let label = 'Pending';
    
    switch (String(status).toLowerCase()) {
      case 'approved':
        color = 'success';
        icon = <CheckCircleIcon sx={{ fontSize: 16 }} />;
        label = 'Approved';
        break;
      case 'rejected':
        color = 'error';
        icon = <CancelIcon sx={{ fontSize: 16 }} />;
        label = 'Rejected';
        break;
      default:
        color = 'warning';
        icon = <HourglassEmptyIcon sx={{ fontSize: 16 }} />;
        label = 'Pending';
        break;
    }

    return (
      <Chip
        icon={icon}
        label={label}
        color={color}
        size="small"
        variant="filled"
        sx={{ fontWeight: 'bold', px: 0.5 }}
      />
    );
  };

  // Helper to get total leave days
  const getDaysCount = (start, end) => {
    if (!start || !end) return 0;
    const diff = new Date(end) - new Date(start);
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  // Main UI Render
  return (
    <motion.div {...pageTransition}>
      <Box className="page-container" sx={{ pb: 5 }}>
        {/* Banner Card */}
        <Card
          sx={{
            mb: 4,
            background: portalTheme.gradient,
            color: 'white',
            borderRadius: 4,
            boxShadow: theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.3)' : '0 8px 24px rgba(0,0,0,0.1)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '100%',
              height: '100%',
              background: 'radial-gradient(circle at top right, rgba(255,255,255,0.15) 0%, transparent 60%)',
              pointerEvents: 'none',
            }}
          />
          <CardContent sx={{ p: 4 }}>
            <Stack direction="row" spacing={3} alignItems="center">
              <Avatar
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  width: 64,
                  height: 64,
                  border: '2px solid rgba(255,255,255,0.4)',
                }}
              >
                <EventIcon sx={{ fontSize: 32 }} />
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight="800" gutterBottom sx={{ letterSpacing: -0.5 }}>
                  {userType === 'admin' || userType === 'hod' ? 'Leave Management Hub' : 'Campus Leave Portal'}
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  {userType === 'admin' || userType === 'hod'
                    ? 'Review, approve, or decline campus-wide student and faculty leave applications.'
                    : 'Submit leave applications, view remaining quotas, and track request status.'}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Dynamic Teacher Quota Stats Section */}
        {userType === 'teacher' && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6}>
              <Card sx={{ borderLeft: `6px solid ${theme.palette.success.main}`, borderRadius: 3 }}>
                <CardContent sx={{ py: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" fontWeight="bold">
                      Casual Leave Balance
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="success.main" sx={{ mt: 1 }}>
                      {leaveBalance.casual_leave_remaining} / {leaveBalance.casual_leave_total} Days
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), color: 'success.main' }}>
                    <CheckCircleIcon />
                  </Avatar>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Card sx={{ borderLeft: `6px solid ${theme.palette.info.main}`, borderRadius: 3 }}>
                <CardContent sx={{ py: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" fontWeight="bold">
                      Sick Leave Balance
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="info.main" sx={{ mt: 1 }}>
                      {leaveBalance.sick_leave_remaining} / {leaveBalance.sick_leave_total} Days
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), color: 'info.main' }}>
                    <CheckCircleIcon />
                  </Avatar>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Tab Selection */}
        {(userType === 'student' || userType === 'teacher') && (
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs
              value={tabValue}
              onChange={(e, val) => setTabValue(val)}
              sx={{
                '& .MuiTab-root': { fontWeight: '700', fontSize: '0.9rem' },
                '& .Mui-selected': { color: portalTheme.primary },
                '& .MuiTabs-indicator': { backgroundColor: portalTheme.primary },
              }}
            >
              <Tab label="Leave History" />
              <Tab label="Apply for Leave" />
            </Tabs>
          </Box>
        )}

        {/* CONTENT LOADING SKELETON */}
        {loading ? (
          <Box sx={{ width: '100%', py: 5, textAlign: 'center' }}>
            <CircularProgress color="primary" />
            <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary', fontWeight: 'bold' }}>
              Retrieving portal data...
            </Typography>
          </Box>
        ) : (
          <AnimatePresence mode="wait">
            {/* STUDENTS / TEACHERS FLOW */}
            {(userType === 'student' || userType === 'teacher') && (
              <Box>
                {/* 1. HISTORY TAB */}
                {tabValue === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.2 }}
                  >
                    <TableContainer component={Paper} sx={{ borderRadius: 3, overflow: 'hidden' }}>
                      <Table>
                        <TableHead sx={{ bgcolor: portalTheme.softBg }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Leave Type</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Duration</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Days</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Reason</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Attachment</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {myLeaves.length > 0 ? (
                            myLeaves.map((leave) => (
                              <TableRow key={leave.leave_id} hover>
                                <TableCell sx={{ fontWeight: 'bold' }}>{leave.leave_type}</TableCell>
                                <TableCell>
                                  {new Date(leave.start_date).toLocaleDateString()} -{' '}
                                  {new Date(leave.end_date).toLocaleDateString()}
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>
                                  {getDaysCount(leave.start_date, leave.end_date)}
                                </TableCell>
                                <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  <Tooltip title={leave.reason}>
                                    <span>{leave.reason}</span>
                                  </Tooltip>
                                </TableCell>
                                <TableCell>
                                  {leave.supporting_documents && leave.supporting_documents.length > 0 ? (
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      component="a"
                                      href={leave.supporting_documents[0]}
                                      target="_blank"
                                      sx={{ bgcolor: 'action.hover' }}
                                    >
                                      <DownloadIcon fontSize="small" />
                                    </IconButton>
                                  ) : (
                                    <Typography variant="caption" color="text.disabled">None</Typography>
                                  )}
                                </TableCell>
                                <TableCell>{getStatusBadge(leave.status)}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                                <Avatar sx={{ width: 56, height: 56, mx: 'auto', mb: 2, bgcolor: 'action.hover' }}>
                                  <AssignmentIcon sx={{ color: 'text.disabled' }} />
                                </Avatar>
                                <Typography variant="subtitle2" color="text.secondary" fontWeight="bold">
                                  No leave applications logged yet.
                                </Typography>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </motion.div>
                )}

                {/* 2. APPLY TAB */}
                {tabValue === 1 && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Grid container spacing={4}>
                      {/* Left: Form */}
                      <Grid item xs={12} md={7}>
                        <Card sx={{ borderRadius: 3, p: 2 }}>
                          <CardContent>
                            <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
                              New Leave Request
                            </Typography>
                            <Box component="form" onSubmit={handleApplyLeave}>
                              <Grid container spacing={3}>
                                <Grid item xs={12}>
                                  <FormControl fullWidth required>
                                    <InputLabel>Leave Type</InputLabel>
                                    <Select
                                      value={leaveType}
                                      label="Leave Type"
                                      onChange={(e) => setLeaveType(e.target.value)}
                                    >
                                      {userType === 'teacher' ? (
                                        [
                                          <MenuItem key="casual" value="Casual">Casual Leave</MenuItem>,
                                          <MenuItem key="sick" value="Sick">Sick Leave</MenuItem>
                                        ]
                                      ) : (
                                        [
                                          <MenuItem key="medical" value="Medical">Medical Leave</MenuItem>,
                                          <MenuItem key="personal" value="Personal">Personal Leave</MenuItem>,
                                          <MenuItem key="academic" value="Academic">Academic Duty Leave</MenuItem>
                                        ]
                                      )}
                                    </Select>
                                  </FormControl>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                  <TextField
                                    fullWidth
                                    required
                                    type="date"
                                    label="Start Date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                  />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                  <TextField
                                    fullWidth
                                    required
                                    type="date"
                                    label="End Date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                  />
                                </Grid>
                                <Grid item xs={12}>
                                  <TextField
                                    fullWidth
                                    required
                                    multiline
                                    rows={4}
                                    label="Explain Reason for Leave"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Explain your case here..."
                                  />
                                </Grid>
                                <Grid item xs={12}>
                                  <Button
                                    type="submit"
                                    variant="contained"
                                    size="large"
                                    disabled={submitting || uploading}
                                    sx={{
                                      bgcolor: portalTheme.primary,
                                      fontWeight: 'bold',
                                      px: 4,
                                      py: 1.5,
                                      borderRadius: 2,
                                      '&:hover': { bgcolor: portalTheme.primary, filter: 'brightness(0.9)' }
                                    }}
                                  >
                                    {submitting ? <CircularProgress size={24} color="inherit" /> : 'Submit Request'}
                                  </Button>
                                </Grid>
                              </Grid>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>

                      {/* Right: Drag-Drop Attachment */}
                      <Grid item xs={12} md={5}>
                        <Card sx={{ borderRadius: 3, height: '100%' }}>
                          <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '90%', justifyContent: 'center' }}>
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mb: 2 }}>
                              Attach Supporting Document (Optional)
                            </Typography>
                            
                            {!selectedFile ? (
                              <Box
                                onClick={() => fileInputRef.current?.click()}
                                sx={{
                                  border: '2.5px dashed',
                                  borderColor: theme.palette.divider,
                                  borderRadius: 3,
                                  p: 5,
                                  textAlign: 'center',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  '&:hover': {
                                    borderColor: portalTheme.primary,
                                    bgcolor: 'action.hover',
                                  },
                                }}
                              >
                                <CloudUploadIcon sx={{ fontSize: 56, color: 'text.secondary', mb: 2 }} />
                                <Typography variant="body2" fontWeight="bold">
                                  Drag file here or click to browse
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                                  PDF, PNG, JPG, DOCX (Max 10MB)
                                </Typography>
                                <input
                                  type="file"
                                  ref={fileInputRef}
                                  hidden
                                  onChange={handleFileChange}
                                  accept=".pdf,.png,.jpg,.jpeg,.docx"
                                />
                              </Box>
                            ) : (
                              <Paper sx={{ p: 2, border: `1px solid ${portalTheme.primary}`, bgcolor: portalTheme.softBg, borderRadius: 2 }}>
                                <Stack direction="row" spacing={2} alignItems="center">
                                  <Avatar sx={{ bgcolor: portalTheme.primary }}>
                                    <AttachFileIcon />
                                  </Avatar>
                                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                    <Typography variant="body2" fontWeight="bold" noWrap>
                                      {selectedFile.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                    </Typography>
                                  </Box>
                                  {!uploading && (
                                    <IconButton onClick={removeFile} color="error" size="small">
                                      <DeleteIcon />
                                    </IconButton>
                                  )}
                                </Stack>
                                {uploading && (
                                  <Box sx={{ width: '100%', mt: 2 }}>
                                    <LinearProgress variant="determinate" value={uploadProgress} sx={{ height: 6, borderRadius: 3 }} />
                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                      Uploading document...
                                    </Typography>
                                  </Box>
                                )}
                              </Paper>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </motion.div>
                )}
              </Box>
            )}

            {/* ADMINS / HODS FLOW */}
            {(userType === 'admin' || userType === 'hod') && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
              >
                <TableContainer component={Paper} sx={{ borderRadius: 3, overflow: 'hidden' }}>
                  <Table>
                    <TableHead sx={{ bgcolor: portalTheme.softBg }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Applicant ID</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Duration</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Days</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Reason</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Attachment</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pendingRequests.length > 0 ? (
                        pendingRequests.map((request) => (
                          <TableRow key={request.leave_id} hover>
                            <TableCell sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar sx={{ width: 32, height: 32, bgcolor: portalTheme.primary }}>
                                <PersonIcon sx={{ fontSize: 16 }} />
                              </Avatar>
                              <Typography variant="body2" fontWeight="bold">
                                {request.user_id.split('-')[0].toUpperCase()}...
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>{request.leave_type}</TableCell>
                            <TableCell>
                              {new Date(request.start_date).toLocaleDateString()} -{' '}
                              {new Date(request.end_date).toLocaleDateString()}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>
                              {getDaysCount(request.start_date, request.end_date)}
                            </TableCell>
                            <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <Tooltip title={request.reason}>
                                <span>{request.reason}</span>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              {request.supporting_documents && request.supporting_documents.length > 0 ? (
                                <IconButton
                                  size="small"
                                  color="primary"
                                  component="a"
                                  href={request.supporting_documents[0]}
                                  target="_blank"
                                  sx={{ bgcolor: 'action.hover' }}
                                >
                                  <DownloadIcon fontSize="small" />
                                </IconButton>
                              ) : (
                                <Typography variant="caption" color="text.disabled">None</Typography>
                              )}
                            </TableCell>
                            <TableCell align="center">
                              <Stack direction="row" spacing={1} justifyContent="center">
                                <Button
                                  variant="contained"
                                  size="small"
                                  color="success"
                                  startIcon={<CheckCircleIcon />}
                                  onClick={() => handleApprove(request.leave_id)}
                                  sx={{ fontWeight: 'bold', borderRadius: 2 }}
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="contained"
                                  size="small"
                                  color="error"
                                  startIcon={<CancelIcon />}
                                  onClick={() => openRejectDialog(request.leave_id)}
                                  sx={{ fontWeight: 'bold', borderRadius: 2 }}
                                >
                                  Reject
                                </Button>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                            <Avatar sx={{ width: 56, height: 56, mx: 'auto', mb: 2, bgcolor: 'action.hover' }}>
                              <AssignmentIcon sx={{ color: 'text.disabled' }} />
                            </Avatar>
                            <Typography variant="subtitle2" color="text.secondary" fontWeight="bold">
                              No pending leave requests left to review.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* REJECTION REASON DIALOG */}
        <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} PaperProps={{ sx: { borderRadius: 4, width: 420, p: 1 } }}>
          <DialogTitle sx={{ fontWeight: '900', fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: alpha(theme.palette.error.main, 0.1), color: 'error.main' }}>
              <FeedbackIcon />
            </Avatar>
            Reject Application
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary', fontWeight: 500 }}>
              Please specify the reason why you are rejecting this leave application.
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Rejection Reason"
              placeholder="e.g. Insufficient coverage, busy academic schedule..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              autoFocus
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
            />
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 0 }}>
            <Button onClick={() => setRejectDialogOpen(false)} color="inherit" sx={{ fontWeight: 800 }}>
              Cancel
            </Button>
            <Button variant="contained" color="error" onClick={handleRejectConfirm} sx={{ fontWeight: 800, px: 3, borderRadius: 2.5 }}>
              Reject Leave
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </motion.div>
  );
};

export default LeaveManagement;
