import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Stack,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Avatar,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Paper,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
  CheckCircle as ResolveIcon,
  Cancel as RejectIcon,
  PendingActions as PendingIcon,
  SupportAgent as SupportIcon,
  MenuBook as LibraryIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import PageHeader from '../../components/Common/PageHeader';
import StatCard from '../../components/Common/StatCard';
import { motion } from 'framer-motion';
import { pageTransition } from '../../utils/animations';
import { opsAPI } from '../../api/ops';

const LibrarianGrievances = () => {
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewDialog, setViewDialog] = useState({ open: false, grievance: null });
  const [responseText, setResponseText] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const [grievances, setGrievances] = useState([]);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  useEffect(() => {
    const fetchGrievances = async () => {
      try {
        const res = await opsAPI.getGrievances({ category: 'Library' });
        setGrievances(res.data?.grievances || res.data || []);
      } catch (e) { console.error(e); }
    };
    fetchGrievances();
  }, []);

  const stats = [
    {
      title: 'Total Library Complaints',
      value: grievances.length.toString(),
      subtitle: 'This month',
      color: 'primary',
      icon: LibraryIcon,
      tooltip: 'All library-related grievances submitted this month including book issues, facility problems, and system errors',
    },
    {
      title: 'Pending',
      value: grievances.filter(g => g.status === 'Pending').length.toString(),
      subtitle: 'Need attention',
      color: 'warning',
      icon: PendingIcon,
      tooltip: 'Grievances awaiting initial review and assignment. These require immediate attention from library staff',
    },
    {
      title: 'In Progress',
      value: grievances.filter(g => g.status === 'In Progress').length.toString(),
      subtitle: 'Being handled',
      color: 'info',
      icon: SupportIcon,
      tooltip: 'Grievances currently being addressed by the library team. Students will receive updates as progress is made',
    },
    {
      title: 'Resolved',
      value: grievances.filter(g => g.status === 'Resolved').length.toString(),
      subtitle: 'This month',
      color: 'success',
      icon: CheckCircleIcon,
      tooltip: 'Successfully resolved grievances this month. Resolution details and actions taken are documented for each case',
    },
  ];

  const handleViewGrievance = (grievance) => {
    setViewDialog({ open: true, grievance });
    setResponseText(grievance.response || '');
  };

  const handleResolve = async () => {
    if (!responseText.trim()) {
      showSnackbar('Please provide a resolution response', 'warning');
      return;
    }
    try {
        await opsAPI.updateGrievanceStatus(viewDialog.grievance.id, { 
            status: 'Resolved', 
            response: responseText 
        });
        showSnackbar('Grievance resolved successfully', 'success');
        
        // Refresh
        const res = await opsAPI.getGrievances({ category: 'Library' });
        setGrievances(res.data?.grievances || res.data || []);
        
        setViewDialog({ open: false, grievance: null });
        setResponseText('');
    } catch (e) {
        showSnackbar('Failed to update grievance', 'error');
    }
  };

  const handleUpdateStatus = async (status) => {
    try {
        await opsAPI.updateGrievanceStatus(viewDialog.grievance.id, { 
            status, 
            response: responseText 
        });
        showSnackbar(`Status updated to ${status}`, 'success');
        
        // Refresh
        const res = await opsAPI.getGrievances({ category: 'Library' });
        setGrievances(res.data?.grievances || res.data || []);
        
        setViewDialog({ open: false, grievance: null });
        setResponseText('');
    } catch (e) {
        showSnackbar('Failed to update grievance', 'error');
    }
  };

  const filteredGrievances = grievances.filter(g => {
    const matchesSearch =
      g.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.ticketId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || g.status === filterStatus;
    const matchesTab =
      tabValue === 0 ||
      (tabValue === 1 && g.status === 'Pending') ||
      (tabValue === 2 && g.status === 'In Progress') ||
      (tabValue === 3 && g.status === 'Resolved');
    return matchesSearch && matchesStatus && matchesTab;
  });

  const getStatusChip = (status) => {
    const config = {
      Pending: { color: 'warning', icon: <PendingIcon fontSize="small" /> },
      'In Progress': { color: 'info', icon: <SupportIcon fontSize="small" /> },
      Resolved: { color: 'success', icon: <CheckCircleIcon fontSize="small" /> },
    };
    return (
      <Chip
        label={status}
        size="small"
        color={config[status]?.color || 'default'}
        icon={config[status]?.icon}
      />
    );
  };

  const getPriorityChip = (priority) => {
    const colors = { High: 'error', Medium: 'warning', Low: 'info' };
    return <Chip label={priority} size="small" color={colors[priority]} variant="outlined" />;
  };

  return (
    <motion.div {...pageTransition}>
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <PageHeader
          title="Library Grievances"
          subtitle="Manage student complaints related to library services and facilities"
        />

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {stats.map((stat, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <StatCard {...stat} />
            </Grid>
          ))}
        </Grid>

        {/* Tabs and Filters */}
        <Card sx={{ mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={(e, newValue) => setTabValue(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
          >
            <Tab label={`All (${grievances.length})`} />
            <Tab label={`Pending (${grievances.filter(g => g.status === 'Pending').length})`} />
            <Tab label={`In Progress (${grievances.filter(g => g.status === 'In Progress').length})`} />
            <Tab label={`Resolved (${grievances.filter(g => g.status === 'Resolved').length})`} />
          </Tabs>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  placeholder="Search by ticket ID, student name, or subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    label="Status"
                  >
                    <MenuItem value="all">All Status</MenuItem>
                    <MenuItem value="Pending">Pending</MenuItem>
                    <MenuItem value="In Progress">In Progress</MenuItem>
                    <MenuItem value="Resolved">Resolved</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Grievances Table */}
        <Card>
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Ticket ID</TableCell>
                  <TableCell>Student</TableCell>
                  <TableCell>Issue Type</TableCell>
                  <TableCell>Subject</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredGrievances.map((grievance) => (
                  <TableRow key={grievance.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} fontFamily="monospace">
                        {grievance.ticketId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar src={grievance.studentPhoto} />
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {grievance.studentName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {grievance.studentRollNo}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{grievance.subcategory}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {grievance.subject}
                      </Typography>
                    </TableCell>
                    <TableCell>{getPriorityChip(grievance.priority)}</TableCell>
                    <TableCell>{getStatusChip(grievance.status)}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{grievance.submittedDate}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleViewGrievance(grievance)}
                      >
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>

        {/* View/Response Dialog */}
        <Dialog
          open={viewDialog.open}
          onClose={() => setViewDialog({ open: false, grievance: null })}
          maxWidth="md"
          fullWidth
        >
          {viewDialog.grievance && (
            <>
              <DialogTitle>
                <Stack direction="row" spacing={2} alignItems="center">
                  <LibraryIcon color="primary" />
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      {viewDialog.grievance.ticketId} - {viewDialog.grievance.subject}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Submitted by {viewDialog.grievance.studentName} on {viewDialog.grievance.submittedDate}
                    </Typography>
                  </Box>
                </Stack>
              </DialogTitle>
              <DialogContent dividers>
                <Stack spacing={3}>
                  {/* Student Info */}
                  <Paper elevation={0} sx={{ p: 2, backgroundColor: 'action.hover' }}>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Student
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {viewDialog.grievance.studentName}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Roll Number
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {viewDialog.grievance.studentRollNo}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Issue Type
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {viewDialog.grievance.subcategory}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Priority
                        </Typography>
                        <Box sx={{ mt: 0.5 }}>{getPriorityChip(viewDialog.grievance.priority)}</Box>
                      </Grid>
                    </Grid>
                  </Paper>

                  {/* Description */}
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      Description
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {viewDialog.grievance.description}
                    </Typography>
                  </Box>

                  {/* Existing Response */}
                  {viewDialog.grievance.response && (
                    <Paper elevation={0} sx={{ p: 2, backgroundColor: 'info.main', color: 'white' }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        Current Response
                      </Typography>
                      <Typography variant="body2">{viewDialog.grievance.response}</Typography>
                    </Paper>
                  )}

                  {/* Resolution (if resolved) */}
                  {viewDialog.grievance.resolution && (
                    <Paper elevation={0} sx={{ p: 2, backgroundColor: 'success.main', color: 'white' }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        Resolution
                      </Typography>
                      <Typography variant="body2">{viewDialog.grievance.resolution}</Typography>
                    </Paper>
                  )}

                  {/* Response Input */}
                  {viewDialog.grievance.status !== 'Resolved' && (
                    <TextField
                      label="Your Response"
                      multiline
                      rows={4}
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      placeholder="Provide details about the resolution or current status..."
                      fullWidth
                    />
                  )}
                </Stack>
              </DialogContent>
              <DialogActions sx={{ p: 2 }}>
                <Button onClick={() => setViewDialog({ open: false, grievance: null })}>
                  Close
                </Button>
                {viewDialog.grievance.status !== 'Resolved' && (
                  <>
                    <Button
                      variant="outlined"
                      color="info"
                      onClick={() => handleUpdateStatus('In Progress')}
                    >
                      Mark In Progress
                    </Button>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<ResolveIcon />}
                      onClick={handleResolve}
                    >
                      Resolve
                    </Button>
                  </>
                )}
              </DialogActions>
            </>
          )}
        </Dialog>

        <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({...snackbar, open: false})}>
          <Alert severity={snackbar.severity} sx={{ borderRadius: 2 }}>{snackbar.message}</Alert>
        </Snackbar>
      </Box>
    </motion.div>
  );
};

export default LibrarianGrievances;
