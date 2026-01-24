import React, { useState } from 'react';
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

const LibrarianGrievances = () => {
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewDialog, setViewDialog] = useState({ open: false, grievance: null });
  const [responseText, setResponseText] = useState('');

  // Mock library-specific grievances
  const [grievances, setGrievances] = useState([
    {
      id: 1,
      ticketId: 'LIB-001',
      studentName: 'Ali Hassan',
      studentRollNo: 'F21-BS-001',
      studentPhoto: 'https://i.pravatar.cc/150?img=31',
      category: 'Library',
      subcategory: 'Book Unavailability',
      subject: 'Required textbook not available',
      description: 'The book "Database Systems" by Ramez Elmasri is required for my coursework but has been unavailable for 2 weeks. All copies are issued.',
      priority: 'High',
      status: 'Pending',
      submittedDate: '2026-01-20',
      bookTitle: 'Database Systems',
      isbn: '978-0133970777',
    },
    {
      id: 2,
      ticketId: 'LIB-002',
      studentName: 'Sara Ahmed',
      studentRollNo: 'F21-BS-002',
      studentPhoto: 'https://i.pravatar.cc/150?img=32',
      category: 'Library',
      subcategory: 'Reading Room',
      subject: 'AC not working in reading room',
      description: 'The air conditioning in Reading Room 2 has not been working for the past 3 days. It is very hot and difficult to study.',
      priority: 'Medium',
      status: 'In Progress',
      submittedDate: '2026-01-22',
      assignedTo: 'Facilities Team',
      response: 'AC repair has been scheduled for tomorrow morning.',
    },
    {
      id: 3,
      ticketId: 'LIB-003',
      studentName: 'Omar Khan',
      studentRollNo: 'F21-BS-003',
      studentPhoto: 'https://i.pravatar.cc/150?img=33',
      category: 'Library',
      subcategory: 'Late Fee Issue',
      subject: 'Incorrect late fee charged',
      description: 'I returned "Clean Code" on time but was charged a late fee. I have the return receipt showing I returned it before the due date.',
      priority: 'High',
      status: 'Resolved',
      submittedDate: '2026-01-18',
      resolvedDate: '2026-01-19',
      resolution: 'Late fee has been waived after verification of return receipt. Amount will be refunded to your account within 3-5 business days.',
    },
    {
      id: 4,
      ticketId: 'LIB-004',
      studentName: 'Fatima Zahra',
      studentRollNo: 'F21-BS-004',
      studentPhoto: 'https://i.pravatar.cc/150?img=34',
      category: 'Library',
      subcategory: 'Computer Lab',
      subject: 'Computer not starting in Lab B',
      description: 'Computer #12 in Lab B is not starting. I need to access research databases for my thesis work.',
      priority: 'Medium',
      status: 'Pending',
      submittedDate: '2026-01-23',
    },
    {
      id: 5,
      ticketId: 'LIB-005',
      studentName: 'Ahmed Raza',
      studentRollNo: 'F21-BS-005',
      studentPhoto: 'https://i.pravatar.cc/150?img=35',
      category: 'Library',
      subcategory: 'Reservation System',
      subject: 'Book reservation not working',
      description: 'I tried to reserve "Artificial Intelligence" through the online system but keep getting an error message.',
      priority: 'Low',
      status: 'Resolved',
      submittedDate: '2026-01-21',
      resolvedDate: '2026-01-22',
      resolution: 'System issue was fixed. Book has been reserved for you. You will be notified when it becomes available.',
    },
  ]);

  const stats = [
    {
      label: 'Total Library Complaints',
      value: grievances.length.toString(),
      change: 'This month',
      trend: 'up',
      color: 'primary',
      icon: LibraryIcon,
    },
    {
      label: 'Pending',
      value: grievances.filter(g => g.status === 'Pending').length.toString(),
      change: 'Need attention',
      trend: 'up',
      color: 'warning',
      icon: PendingIcon,
    },
    {
      label: 'In Progress',
      value: grievances.filter(g => g.status === 'In Progress').length.toString(),
      change: 'Being handled',
      trend: 'up',
      color: 'info',
      icon: SupportIcon,
    },
    {
      label: 'Resolved',
      value: grievances.filter(g => g.status === 'Resolved').length.toString(),
      change: 'This month',
      trend: 'up',
      color: 'success',
      icon: CheckCircleIcon,
    },
  ];

  const handleViewGrievance = (grievance) => {
    setViewDialog({ open: true, grievance });
    setResponseText(grievance.response || '');
  };

  const handleResolve = () => {
    if (!responseText.trim()) {
      alert('Please provide a resolution response');
      return;
    }
    const updatedGrievances = grievances.map(g =>
      g.id === viewDialog.grievance.id
        ? { ...g, status: 'Resolved', resolution: responseText, resolvedDate: new Date().toISOString().split('T')[0] }
        : g
    );
    setGrievances(updatedGrievances);
    setViewDialog({ open: false, grievance: null });
    setResponseText('');
  };

  const handleUpdateStatus = (status) => {
    const updatedGrievances = grievances.map(g =>
      g.id === viewDialog.grievance.id
        ? { ...g, status, response: responseText }
        : g
    );
    setGrievances(updatedGrievances);
    setViewDialog({ open: false, grievance: null });
    setResponseText('');
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
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
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
              <Grid size={{ xs: 12, md: 8 }}>
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
              <Grid size={{ xs: 12, md: 4 }}>
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
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">
                          Student
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {viewDialog.grievance.studentName}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">
                          Roll Number
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {viewDialog.grievance.studentRollNo}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">
                          Issue Type
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {viewDialog.grievance.subcategory}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
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
      </Box>
    </motion.div>
  );
};

export default LibrarianGrievances;
