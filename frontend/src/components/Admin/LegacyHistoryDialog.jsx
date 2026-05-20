import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  IconButton,
  Typography,
  Box,
  Stack,
  Autocomplete,
  Chip,
  Alert,
} from '@mui/material';
import { Delete, Add, Save, History, School } from '@mui/icons-material';
import { sisAPI } from '../../api/sis';
import { lmsAPI } from '../../api/lms';
import { useSnackbar } from '../../contexts/SnackbarContext';

const LegacyHistoryDialog = ({ open, onClose, student }) => {
  const { showSnackbar } = useSnackbar();
  const [courses, setCourses] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && student) {
      loadData();
    }
  }, [open, student]);

  const loadData = async () => {
    try {
      const res = await lmsAPI.getCoursesAdmin();
      setCourses(Array.isArray(res.data) ? res.data : (res.data.courses || []));
      
      // Load existing history if any
      // For now we start with empty or current student's existing transcript logic
      setHistory([]);
    } catch (e) {
      showSnackbar('Failed to load courses', 'error');
    }
  };

  const handleAddRow = () => {
    setHistory([...history, { 
      id: Date.now(),
      semester_id: 1, 
      course_id: null, 
      course_code: '', 
      course_title: '', 
      final_grade_points: 4.0 
    }]);
  };

  const handleRemoveRow = (id) => {
    setHistory(history.filter(row => row.id !== id));
  };

  const handleRowChange = (id, field, value) => {
    setHistory(history.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const handleSave = async () => {
    if (history.length === 0) return;
    
    setLoading(true);
    try {
      await sisAPI.importStudentHistory(student.id, {
        student_id: student.id,
        academic_history: history.map(h => ({
            semester_id: Number(h.semester_id),
            course_id: h.course_id,
            final_grade_points: Number(h.final_grade_points)
        }))
      });
      showSnackbar('Academic history imported successfully!', 'success');
      onClose();
    } catch (e) {
      showSnackbar('Import failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 900 }}>
        <History color="primary" /> Manage Legacy History: {student?.name}
      </DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
            Use this tool to manually enter academic records for semesters prior to the current one. This data will be used to calculate the student's CGPA.
        </Alert>

        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', width: 100 }}>Sem #</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Course Selection</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: 120 }}>Grade Points</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: 60 }}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <TextField 
                      type="number" 
                      size="small" 
                      value={row.semester_id} 
                      onChange={(e) => handleRowChange(row.id, 'semester_id', e.target.value)}
                      inputProps={{ min: 1, max: 8 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Autocomplete
                      size="small"
                      options={courses}
                      getOptionLabel={(option) => `${option.code} - ${option.title}`}
                      onChange={(e, val) => handleRowChange(row.id, 'course_id', val?.course_id)}
                      renderInput={(params) => <TextField {...params} placeholder="Search Course..." />}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField 
                      type="number" 
                      size="small" 
                      value={row.final_grade_points} 
                      onChange={(e) => handleRowChange(row.id, 'final_grade_points', e.target.value)}
                      inputProps={{ min: 0, max: 4, step: 0.1 }}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton color="error" onClick={() => handleRemoveRow(row.id)}><Delete /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {history.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4, opacity: 0.5 }}>
                    No records added yet. Click "Add Course Row" to begin.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Button 
          startIcon={<Add />} 
          onClick={handleAddRow} 
          sx={{ mt: 2, fontWeight: 'bold' }}
        >
          Add Course Row
        </Button>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button 
          variant="contained" 
          startIcon={<Save />} 
          onClick={handleSave}
          disabled={loading || history.length === 0}
          sx={{ borderRadius: 2, px: 4, fontWeight: 'bold' }}
        >
          {loading ? 'Saving...' : 'Finalize Transcript'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LegacyHistoryDialog;
