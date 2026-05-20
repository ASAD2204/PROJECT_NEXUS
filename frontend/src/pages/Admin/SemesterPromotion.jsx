import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  Alert,
  Divider,
  CircularProgress,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  CalendarMonth,
  PlayCircleFilled,
  CheckCircle,
  History,
  TrendingUp,
  School,
  ArrowForward,
  Settings,
  Add,
  Edit,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import PageHeader from '../../components/Common/PageHeader';
import PageTransition from '../../components/Common/PageTransition';
import { sisAPI } from '../../api/sis';
import { useSnackbar } from '../../contexts/SnackbarContext';

const SemesterPromotion = () => {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  
  // Loading & Data state
  const [loading, setLoading] = useState(false);
  const [semesters, setSemesters] = useState([]);
  const [activeStudents, setActiveStudents] = useState(0);
  const [alumniStudents, setAlumniStudents] = useState(0);

  // Dialog states
  const [openPromoDialog, setOpenPromoDialog] = useState(false);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  
  // Selection states
  const [selectedSem, setSelectedSem] = useState(null);
  const [editingSem, setEditingSem] = useState(null);

  // Form states (Create)
  const [newTitle, setNewTitle] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newStatus, setNewStatus] = useState('Registration');
  const [newIsActive, setNewIsActive] = useState(false);

  const loadSemesters = useCallback(async () => {
    try {
      setLoading(true);
      const res = await sisAPI.getSemesters();
      setSemesters(res.data);
    } catch (e) {
      showSnackbar('Failed to load semesters', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  const loadStats = useCallback(async () => {
    try {
      const res = await sisAPI.getStudents();
      const students = res.data || [];
      const activeCount = students.filter((s) => !s.is_graduated).length;
      const alumniCount = students.filter((s) => s.is_graduated).length;
      setActiveStudents(activeCount);
      setAlumniStudents(alumniCount);
    } catch (e) {
      console.error('Failed to load student statistics', e);
    }
  }, []);

  useEffect(() => {
    loadSemesters();
    loadStats();
  }, [loadSemesters, loadStats]);

  const handleCloseSemester = async () => {
    if (!selectedSem) return;
    setLoading(true);
    try {
      await sisAPI.closeSemester(selectedSem.semester_id);
      showSnackbar('Semester closed and students promoted successfully!', 'success');
      setOpenPromoDialog(false);
      loadSemesters();
      loadStats();
    } catch (e) {
      showSnackbar('Promotion failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSemester = async () => {
    if (!newTitle.trim()) {
      showSnackbar('Semester title is required', 'warning');
      return;
    }
    setLoading(true);
    try {
      await sisAPI.createSemester({
        semester_id: 0, // required by schema
        title: newTitle,
        start_date: newStartDate || null,
        end_date: newEndDate || null,
        status: newStatus,
        is_active: newIsActive,
      });
      showSnackbar('Academic Semester created successfully!', 'success');
      setOpenCreateDialog(false);
      setNewTitle('');
      setNewStartDate('');
      setNewEndDate('');
      setNewStatus('Registration');
      setNewIsActive(false);
      loadSemesters();
    } catch (e) {
      showSnackbar('Failed to create semester', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSemester = async () => {
    if (!editingSem || !editingSem.title.trim()) {
      showSnackbar('Semester title is required', 'warning');
      return;
    }
    setLoading(true);
    try {
      await sisAPI.updateSemester(editingSem.semester_id, {
        semester_id: editingSem.semester_id,
        title: editingSem.title,
        start_date: editingSem.start_date || null,
        end_date: editingSem.end_date || null,
        status: editingSem.status,
        is_active: editingSem.is_active,
      });
      showSnackbar('Semester details updated successfully!', 'success');
      setOpenEditDialog(false);
      setEditingSem(null);
      loadSemesters();
    } catch (e) {
      showSnackbar('Failed to update semester', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'success';
      case 'Completed': return 'default';
      case 'Registration': return 'info';
      case 'Exams': return 'warning';
      default: return 'primary';
    }
  };

  return (
    <PageTransition>
      <Box className="page-container" sx={{ p: 1 }}>
        <PageHeader 
          title="Academic Lifecycle & Promotion" 
          subtitle="Manage academic semesters, transition phases, and student progressions"
        />

        <Grid container spacing={3}>
          {/* Active Semesters List */}
          <Grid item xs={12} lg={8}>
            <Card sx={{ borderRadius: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                  <Typography variant="h6" fontWeight="bold">Academic Semesters</Typography>
                  <Button 
                    startIcon={<Add />} 
                    variant="contained" 
                    onClick={() => setOpenCreateDialog(true)}
                    sx={{ borderRadius: 2 }}
                  >
                    Add Semester
                  </Button>
                </Stack>
                
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, border: '1px solid rgba(0,0,0,0.1)' }}>
                  <Table>
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Semester Name</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Start Date</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>End Date</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }} align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {semesters.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary', fontStyle: 'italic' }}>
                            No semester records found.
                          </TableCell>
                        </TableRow>
                      ) : semesters.map((sem) => (
                        <TableRow key={sem.semester_id} hover>
                          <TableCell sx={{ fontWeight: 600 }}>{sem.title}</TableCell>
                          <TableCell>{sem.start_date || 'TBD'}</TableCell>
                          <TableCell>{sem.end_date || 'TBD'}</TableCell>
                          <TableCell>
                            <Chip 
                              label={sem.status} 
                              size="small" 
                              color={getStatusColor(sem.status)} 
                              sx={{ fontWeight: 700, minWidth: 90 }}
                            />
                            {sem.is_active && (
                              <Chip 
                                label="Current" 
                                size="small" 
                                color="secondary" 
                                variant="outlined" 
                                sx={{ ml: 1, fontWeight: 700 }}
                              />
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <IconButton 
                                size="small" 
                                onClick={() => {
                                  setEditingSem({ ...sem });
                                  setOpenEditDialog(true);
                                }}
                                sx={{ color: 'text.secondary' }}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                              <Button
                                variant="contained"
                                size="small"
                                disabled={sem.status === 'Completed'}
                                startIcon={<PlayCircleFilled />}
                                onClick={() => {
                                  setSelectedSem(sem);
                                  setOpenPromoDialog(true);
                                }}
                                color="warning"
                                sx={{ borderRadius: 2 }}
                              >
                                Close & Promote
                              </Button>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Stats Sidebar */}
          <Grid item xs={12} lg={4}>
            <Stack spacing={3}>
              <Card sx={{ 
                borderRadius: 4, 
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                color: 'white',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)' 
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>System Automation</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900, my: 1 }}>Lifecycle Engine</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 3 }}>
                    Closing a semester transitions all academic records:
                  </Typography>
                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                      <CheckCircle sx={{ fontSize: 18 }} />
                      <Typography variant="caption" fontWeight="bold">Recalculates SGPA/CGPA across all courses</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                      <CheckCircle sx={{ fontSize: 18 }} />
                      <Typography variant="caption" fontWeight="bold">Increments student academic semesters by 1</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                      <CheckCircle sx={{ fontSize: 18 }} />
                      <Typography variant="caption" fontWeight="bold">Promotes eligible final-semester students to Alumni</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>

              <Card sx={{ borderRadius: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>Enrollment Overview</Typography>
                  <Divider sx={{ my: 1.5 }} />
                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">Active Enrolled Students</Typography>
                      <Chip label={activeStudents} color="info" size="small" sx={{ fontWeight: 'bold' }} />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">Graduated Alumni</Typography>
                      <Chip label={alumniStudents} color="success" size="small" sx={{ fontWeight: 'bold' }} />
                    </Box>
                  </Stack>
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    sx={{ mt: 3, borderRadius: 2 }} 
                    endIcon={<ArrowForward />}
                    component="a"
                    href="/admin/alumni"
                  >
                    View Alumni Registry
                  </Button>
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        </Grid>

        {/* Create Semester Dialog */}
        <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
          <DialogTitle sx={{ fontWeight: '900', pt: 3 }}>Create Academic Semester</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Semester Name"
                fullWidth
                variant="outlined"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Fall 2026"
                required
              />
              <TextField
                label="Start Date"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={newStartDate}
                onChange={(e) => setNewStartDate(e.target.value)}
              />
              <TextField
                label="End Date"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
              />
              <TextField
                label="Initial Phase/Status"
                select
                fullWidth
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
              >
                <MenuItem value="Registration">Registration</MenuItem>
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Exams">Exams</MenuItem>
                <MenuItem value="Completed">Completed</MenuItem>
              </TextField>
              <FormControlLabel
                control={
                  <Switch
                    checked={newIsActive}
                    onChange={(e) => setNewIsActive(e.target.checked)}
                    color="secondary"
                  />
                }
                label="Set as Current/Active Semester"
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 0 }}>
            <Button onClick={() => setOpenCreateDialog(false)} color="inherit" sx={{ fontWeight: 'bold' }}>Cancel</Button>
            <Button 
              variant="contained" 
              onClick={handleCreateSemester}
              disabled={loading}
              sx={{ borderRadius: 2.5, px: 3, fontWeight: 'bold' }}
            >
              {loading ? <CircularProgress size={24} /> : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Semester Dialog */}
        <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
          <DialogTitle sx={{ fontWeight: '900', pt: 3 }}>Edit Semester Details</DialogTitle>
          <DialogContent>
            {editingSem && (
              <Stack spacing={2} sx={{ mt: 1 }}>
                <TextField
                  label="Semester Name"
                  fullWidth
                  variant="outlined"
                  value={editingSem.title}
                  onChange={(e) => setEditingSem({ ...editingSem, title: e.target.value })}
                  required
                />
                <TextField
                  label="Start Date"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={editingSem.start_date || ''}
                  onChange={(e) => setEditingSem({ ...editingSem, start_date: e.target.value })}
                />
                <TextField
                  label="End Date"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={editingSem.end_date || ''}
                  onChange={(e) => setEditingSem({ ...editingSem, end_date: e.target.value })}
                />
                <TextField
                  label="Lifecycle Phase/Status"
                  select
                  fullWidth
                  value={editingSem.status}
                  onChange={(e) => setEditingSem({ ...editingSem, status: e.target.value })}
                >
                  <MenuItem value="Registration">Registration</MenuItem>
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Exams">Exams</MenuItem>
                  <MenuItem value="Completed">Completed</MenuItem>
                </TextField>
                <FormControlLabel
                  control={
                    <Switch
                      checked={editingSem.is_active || false}
                      onChange={(e) => setEditingSem({ ...editingSem, is_active: e.target.checked })}
                      color="secondary"
                    />
                  }
                  label="Current/Active Semester"
                />
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 0 }}>
            <Button onClick={() => setOpenEditDialog(false)} color="inherit" sx={{ fontWeight: 'bold' }}>Cancel</Button>
            <Button 
              variant="contained" 
              onClick={handleEditSemester}
              disabled={loading}
              sx={{ borderRadius: 2.5, px: 3, fontWeight: 'bold' }}
            >
              {loading ? <CircularProgress size={24} /> : 'Save Changes'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Close & Promote Confirmation Dialog */}
        <Dialog open={openPromoDialog} onClose={() => setOpenPromoDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
          <DialogTitle sx={{ fontWeight: '900', textAlign: 'center', pt: 4 }}>
             Confirm Semester Transition
          </DialogTitle>
          <DialogContent>
             <Box sx={{ textAlign: 'center', py: 2 }}>
                <History sx={{ fontSize: 60, color: 'warning.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>Closing {selectedSem?.title}</Typography>
                <Alert severity="warning" sx={{ textAlign: 'left', mt: 2, borderRadius: 2 }}>
                   Warning: This action is irreversible. All student grades for this semester will be finalized, and every student in the system will be advanced to their next academic level.
                </Alert>
             </Box>
          </DialogContent>
          <DialogActions sx={{ p: 4, pt: 0 }}>
             <Button onClick={() => setOpenPromoDialog(false)} color="inherit" sx={{ fontWeight: 'bold' }}>Cancel</Button>
             <Button 
                variant="contained" 
                color="warning" 
                onClick={handleCloseSemester}
                disabled={loading}
                sx={{ borderRadius: 2.5, px: 4, fontWeight: 'bold' }}
             >
                {loading ? <CircularProgress size={24} /> : 'Confirm & Promote All'}
             </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageTransition>
  );
};

export default SemesterPromotion;
