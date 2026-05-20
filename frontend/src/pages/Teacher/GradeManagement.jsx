import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Stack,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Divider,
  LinearProgress,
  alpha,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import { 
  Grade, 
  Save, 
  Publish, 
  Download, 
  TrendingUp, 
  ErrorOutline,
  CheckCircle,
  Calculate,
  AutoAwesome,
  Refresh,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import PageHeader from '../../components/Common/PageHeader';
import PageTransition from '../../components/Common/PageTransition';
import StatCard from '../../components/Common/StatCard';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { fadeInUp, staggerContainer } from '../../utils/animations';
import { lmsAPI } from '../../api/lms';
import { teacherAPI } from '../../api/teacher';

const TeacherGradebook = () => {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  
  // -- State --
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [gradebook, setGradebook] = useState(null);
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  // -- Data Loading --
  const loadCourses = useCallback(async () => {
    try {
      const res = await lmsAPI.getMyCourses();
      setCourses(res.data?.courses || res.data || []);
    } catch (e) {
      showSnackbar('Failed to load courses', 'error');
    }
  }, [showSnackbar]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const fetchGradebook = useCallback(async (courseId) => {
    if (!courseId) return;
    setLoading(true);
    try {
      const res = await lmsAPI.getGradebookData(courseId);
      setGradebook(res.data);
    } catch (e) {
      showSnackbar('Failed to load gradebook', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  const handleCourseChange = (e) => {
    const cid = e.target.value;
    setSelectedCourse(cid);
    fetchGradebook(cid);
  };

  const handleFinalize = async () => {
    setProcessing(true);
    try {
      await lmsAPI.finalizeResults(selectedCourse);
      showSnackbar('Grades finalized and submitted to Controller successfully!', 'success');
      setFinalizeDialogOpen(false);
      fetchGradebook(selectedCourse);
    } catch (e) {
      showSnackbar('Finalization failed', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const calculateTotal = (student) => {
    return (student.midterm || 0) + (student.finalterm || 0) + (student.sessional || 0);
  };

  const getGPColor = (gp) => {
    if (gp >= 3.5) return 'success';
    if (gp >= 2.5) return 'info';
    if (gp > 0) return 'warning';
    return 'error';
  };

  const stats = useMemo(() => {
    if (!gradebook) return null;
    const totals = gradebook.students.map(s => calculateTotal(s));
    const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
    const passCount = gradebook.students.filter(s => calculateTotal(s) >= 50).length;
    return {
      average: avg.toFixed(1),
      passRate: ((passCount / gradebook.students.length) * 100).toFixed(1),
      atRisk: gradebook.students.filter(s => calculateTotal(s) < 50).length
    };
  }, [gradebook]);

  return (
    <PageTransition>
      <Box className="page-container">
        <PageHeader 
          title="Master Gradebook" 
          subtitle="Unified assessment matrix and institutional result finalization"
          action={
            <Stack direction="row" spacing={2}>
                <Button startIcon={<Refresh />} variant="outlined" onClick={() => fetchGradebook(selectedCourse)} disabled={!selectedCourse}>Refresh</Button>
                <Button startIcon={<Download />} variant="outlined" disabled={!gradebook}>Export CSV</Button>
                <Button 
                    startIcon={<Publish />} 
                    variant="contained" 
                    color="primary" 
                    disabled={!gradebook}
                    onClick={() => setFinalizeDialogOpen(true)}
                >
                    Finalize Results
                </Button>
            </Stack>
          }
        />

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: 4 }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom fontWeight="bold">Select Section</Typography>
                <FormControl fullWidth>
                  <InputLabel>Section</InputLabel>
                  <Select
                    value={selectedCourse}
                    label="Section"
                    onChange={handleCourseChange}
                  >
                    {courses.map(c => (
                      <MenuItem key={c.course_id} value={c.course_id}>
                        {c.code} - {c.title}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </CardContent>
            </Card>
          </Grid>

          {stats && (
            <>
              <Grid item xs={12} md={2.6}>
                <StatCard title="Class Average" value={`${stats.average}%`} icon={Calculate} color="primary" />
              </Grid>
              <Grid item xs={12} md={2.6}>
                <StatCard title="Pass Rate" value={`${stats.passRate}%`} icon={CheckCircle} color="success" />
              </Grid>
              <Grid item xs={12} md={2.8}>
                <StatCard title="At-Risk Students" value={stats.atRisk} icon={ErrorOutline} color="error" />
              </Grid>
            </>
          )}
        </Grid>

        {loading ? (
            <Box sx={{ width: '100%', mt: 4 }}><LinearProgress /></Box>
        ) : gradebook ? (
          <Card sx={{ borderRadius: 4, overflow: 'hidden' }}>
            <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), borderBottom: 1, borderColor: 'divider' }}>
               <Typography variant="h6" fontWeight="bold">{gradebook.course_title} - Grading Matrix</Typography>
            </Box>
            <TableContainer component={Paper} elevation={0} sx={{ maxHeight: '60vh' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', minWidth: 150 }}>Student</TableCell>
                    {gradebook.columns.map(col => (
                      <TableCell key={col.id} align="center" sx={{ fontWeight: 'bold' }}>
                        <Tooltip title={`Total: ${col.total}`}>
                          <Box>
                            <Typography variant="caption" display="block" sx={{ fontWeight: 800 }}>{col.type.toUpperCase()}</Typography>
                            {col.title}
                          </Box>
                        </Tooltip>
                      </TableCell>
                    ))}
                    <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: alpha(theme.palette.info.main, 0.1) }}>Midterm (30)</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: alpha(theme.palette.info.main, 0.1) }}>Final (50)</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: alpha(theme.palette.info.main, 0.1) }}>Sessional (20)</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: alpha(theme.palette.primary.main, 0.1) }}>Total (100)</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: alpha(theme.palette.warning.main, 0.1) }}>GP (4.0)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {gradebook.students.map((student) => {
                    const total = calculateTotal(student);
                    return (
                      <TableRow key={student.student_id} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">{student.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{student.roll_no}</Typography>
                          </Box>
                        </TableCell>
                        {gradebook.columns.map(col => (
                          <TableCell key={col.id} align="center">
                            {student.marks[col.id] || 0}
                          </TableCell>
                        ))}
                        <TableCell align="center" sx={{ fontWeight: 700 }}>
                            <Tooltip title="Max: 30">
                                <Typography variant="body2">{student.midterm}</Typography>
                            </Tooltip>
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>
                            <Tooltip title="Max: 50">
                                <Typography variant="body2">{student.finalterm}</Typography>
                            </Tooltip>
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>
                            <Tooltip title="Max: 20">
                                <Typography variant="body2">{student.sessional}</Typography>
                            </Tooltip>
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900, color: total >= 50 ? 'success.main' : 'error.main' }}>
                          {total}
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={student.final_grade_points || '-'} 
                            size="small" 
                            color={getGPColor(student.final_grade_points)}
                            sx={{ fontWeight: 'bold' }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        ) : (
          <Box sx={{ textAlign: 'center', py: 10, bgcolor: 'background.paper', borderRadius: 4, border: '1px dashed', borderColor: 'divider' }}>
             <Grade sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
             <Typography variant="h6" color="text.secondary">Select a section to view the Gradebook</Typography>
          </Box>
        )}

        {/* Finalize Dialog */}
        <Dialog open={finalizeDialogOpen} onClose={() => setFinalizeDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
          <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1.5 }}>
             <AutoAwesome color="primary" /> Institutional Grade Submission
          </DialogTitle>
          <DialogContent>
             <Box sx={{ py: 2 }}>
                <Typography variant="body1" gutterBottom>
                  You are about to finalize results for <b>{gradebook?.course_title}</b>.
                </Typography>
                <Alert severity="warning" sx={{ mt: 2, borderRadius: 3 }}>
                   <b>Action Required:</b> By clicking confirm, all student marks will be locked, and their final Grade Points (GP) will be calculated and pushed to the SIS Controller for permanent transcript updates.
                </Alert>
                <Stack spacing={2} sx={{ mt: 3 }}>
                   <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">Students to be processed:</Typography>
                      <Typography variant="body2" fontWeight="bold">{gradebook?.students.length}</Typography>
                   </Box>
                   <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">Average Performance:</Typography>
                      <Typography variant="body2" fontWeight="bold" color="primary">{stats?.average}%</Typography>
                   </Box>
                </Stack>
             </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 0 }}>
             <Button onClick={() => setFinalizeDialogOpen(false)} color="inherit" sx={{ fontWeight: 'bold' }}>Cancel</Button>
             <Button 
                variant="contained" 
                startIcon={<CheckCircle />} 
                onClick={handleFinalize}
                disabled={processing}
                sx={{ borderRadius: 2.5, px: 4, fontWeight: 'bold' }}
             >
                {processing ? 'Processing...' : 'Confirm & Submit to Controller'}
             </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageTransition>
  );
};

export default TeacherGradebook;
