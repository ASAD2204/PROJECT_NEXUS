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
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
  SupportAgent as SupportIcon,
  School as AcademicIcon,
  PendingActions as PendingIcon,
  CheckCircle as CheckCircleIcon,
  Forward as ForwardIcon,
} from '@mui/icons-material';
import PageHeader from '../../components/Common/PageHeader';
import StatCard from '../../components/Common/StatCard';
import { motion } from 'framer-motion';
import { pageTransition } from '../../utils/animations';
import { opsAPI } from '../../api/ops';

const TeacherGrievanceManagement = () => {
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [viewDialog, setViewDialog] = useState({ open: false, grievance: null });
  const [teacherNote, setTeacherNote] = useState('');

  const [grievances, setGrievances] = useState([]);

  useEffect(() => {
    const fetchGrievances = async () => {
      try {
        const res = await opsAPI.getGrievances();
        setGrievances(res.data?.grievances || res.data || []);
      } catch (e) { console.error('Failed to load grievances', e); }
    };
    fetchGrievances();
  }, []);

  const stats = [
    {
      title: 'Total Referred',
      value: grievances.length.toString(),
      subtitle: 'By admin',
      color: 'primary',
      icon: SupportIcon,
      tooltip: 'Academic grievances referred to you by administration.',
    },
    {
      title: 'Pending Review',
      value: grievances.filter(g => g.status === 'Pending' || g.status === 'Open').length.toString(),
      subtitle: 'Need attention',
      color: 'warning',
      icon: PendingIcon,
      tooltip: 'Grievances awaiting initial review.',
    },
    {
      title: 'Under Review',
      value: grievances.filter(g => g.status === 'Under Review').length.toString(),
      subtitle: 'In progress',
      color: 'info',
      icon: AcademicIcon,
      tooltip: 'Grievances currently being addressed.',
    },
    {
      title: 'Resolved',
      value: grievances.filter(g => g.status === 'Resolved').length.toString(),
      subtitle: 'Successfully closed',
      color: 'success',
      icon: CheckCircleIcon,
      tooltip: 'Grievances that have been resolved.',
    },
  ];

  const handleViewGrievance = (grievance) => {
    setViewDialog({ open: true, grievance });
    setTeacherNote(grievance.teacherNote || '');
  };

  const handleAddNote = async () => {
    try {
      const gId = viewDialog.grievance.ticket_id || viewDialog.grievance.id;
      await opsAPI.addGrievanceComment(gId, teacherNote);
      await opsAPI.updateGrievanceStatus(gId, { status: 'Under Review' });
      setGrievances(prev => prev.map(g =>
        (g.ticket_id || g.id) === gId
          ? { ...g, status: 'Under Review', teacherNote }
          : g
      ));
    } catch (e) { console.error('Failed to add note', e); }
    setViewDialog({ open: false, grievance: null });
    setTeacherNote('');
  };

  const handleResolve = async () => {
    if (!teacherNote.trim()) {
      alert('Please provide resolution details');
      return;
    }
    try {
      const gId = viewDialog.grievance.ticket_id || viewDialog.grievance.id;
      await opsAPI.updateGrievanceStatus(gId, { 
        status: 'Resolved',
        resolution: teacherNote 
      });
      const updatedGrievances = grievances.map(g =>
        (g.ticket_id || g.id) === gId
          ? { ...g, status: 'Resolved', resolution: teacherNote, resolvedDate: new Date().toISOString().split('T')[0] }
          : g
      );
      setGrievances(updatedGrievances);
      setViewDialog({ open: false, grievance: null });
      setTeacherNote('');
    } catch (e) {
      console.error('Failed to resolve grievance', e);
      alert('Failed to save resolution. Please try again.');
    }
  };

  const filteredGrievances = grievances.filter(g => {
    const sName = g.student_name || '';
    const sSubject = g.subject || '';
    const sId = String(g.ticket_id || g.id || '');
    
    const matchesSearch =
      sSubject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sId.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesCategory = filterCategory === 'all' || g.category === filterCategory;
    const matchesTab =
      tabValue === 0 ||
      (tabValue === 1 && (g.status === 'Pending' || g.status === 'Open')) ||
      (tabValue === 2 && g.status === 'Under Review') ||
      (tabValue === 3 && g.status === 'Resolved');
    return matchesSearch && matchesCategory && matchesTab;
  });

  const getStatusChip = (status) => {
    const config = {
      'Pending': { color: 'warning', icon: <PendingIcon fontSize="small" /> },
      'Open': { color: 'warning', icon: <PendingIcon fontSize="small" /> },
      'Under Review': { color: 'info', icon: <AcademicIcon fontSize="small" /> },
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
      <Box className="page-container">
        <PageHeader
          title="Grievance Management"
          subtitle="Review and respond to student academic grievances referred by admin"
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
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={tabValue}
              onChange={(e, newValue) => setTabValue(newValue)}
              sx={{ px: 2 }}
            >
              <Tab label={`All (${grievances.length})`} />
              <Tab label={`Pending (${grievances.filter(g => g.status === 'Pending Review').length})`} />
              <Tab label={`Under Review (${grievances.filter(g => g.status === 'Under Review').length})`} />
              <Tab label={`Resolved (${grievances.filter(g => g.status === 'Resolved').length})`} />
            </Tabs>
          </Box>
          <CardContent sx={{ pt: 3 }}>
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
                  <InputLabel>Issue Type</InputLabel>
                  <Select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    label="Issue Type"
                  >
                    <MenuItem value="all">All Types</MenuItem>
                    <MenuItem value="Grading Issue">Grading Issue</MenuItem>
                    <MenuItem value="Assignment Extension">Assignment Extension</MenuItem>
                    <MenuItem value="Attendance">Attendance</MenuItem>
                    <MenuItem value="Lab Issues">Lab Issues</MenuItem>
                    <MenuItem value="Course Content">Course Content</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Grievances Table */}
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Ticket ID</TableCell>
                  <TableCell>Student</TableCell>
                  <TableCell>Course</TableCell>
                  <TableCell>Issue</TableCell>
                  <TableCell>Subject</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredGrievances.map((grievance) => (
                  <TableRow key={grievance.ticket_id || grievance.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} fontFamily="monospace">
                        #{grievance.ticket_id || grievance.id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar src={grievance.student_photo} />
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {grievance.student_name || 'Anonymous Student'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {grievance.student_roll_no || 'N/A'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {grievance.category}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {grievance.subject}
                      </Typography>
                    </TableCell>
                    <TableCell>{getPriorityChip(grievance.priority)}</TableCell>
                    <TableCell>{getStatusChip(grievance.status)}</TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {grievance.created_at ? new Date(grievance.created_at).toLocaleDateString() : 'N/A'}
                      </Typography>
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
                  <AcademicIcon color="primary" />
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
                  {/* Info Card */}
                  <Paper elevation={0} sx={{ p: 2, backgroundColor: 'action.hover' }}>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">
                          Student
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {viewDialog.grievance.student_name}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">
                          Roll Number
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {viewDialog.grievance.student_roll_no}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">
                          Issue Category
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {viewDialog.grievance.category}
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

                  {/* Existing Note */}
                  {viewDialog.grievance.teacherNote && viewDialog.grievance.status !== 'Resolved' && (
                    <Paper elevation={0} sx={{ p: 2, backgroundColor: 'info.main', color: 'white' }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        Your Note
                      </Typography>
                      <Typography variant="body2">{viewDialog.grievance.teacherNote}</Typography>
                    </Paper>
                  )}

                  {/* Resolution */}
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
                      label="Your Response / Resolution"
                      multiline
                      rows={4}
                      value={teacherNote}
                      onChange={(e) => setTeacherNote(e.target.value)}
                      placeholder="Provide your response, action taken, or resolution details..."
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
                      onClick={handleAddNote}
                    >
                      Add Note & Mark Under Review
                    </Button>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircleIcon />}
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

export default TeacherGrievanceManagement;
