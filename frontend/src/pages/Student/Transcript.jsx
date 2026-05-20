/**
 * Student Transcript Page
 * 
 * Displays academic transcript with semester-wise course grades.
 * Provides GPA calculations and transcript download functionality.
 * 
 * Features:
 * - Semester-wise grade display
 * - Course details with grades and credit hours
 * - GPA calculation (semester and cumulative)
 * - Transcript download (PDF)
 * - Grade statistics and analytics
 * - Academic performance charts
 * - Honor roll and dean's list indicators
 * 
 * @component
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Divider,
  Stack,
  Paper,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Download, School, TrendingUp, AssignmentTurnedIn, EmojiEvents } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { studentAPI } from '../../api/student';
import client from '../../api/client';
import PageHeader from '../../components/Common/PageHeader';
import StatCard from '../../components/Common/StatCard';
import { Button } from '@mui/material';
import { TableSkeleton } from '../../components/Common/LoadingSkeleton';
import { pageTransition } from '../../utils/animations';

const Transcript = () => {
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);

  useEffect(() => {
    const fetchTranscript = async () => {
      try {
        const [profileRes, transcriptRes, coursesRes] = await Promise.allSettled([
          studentAPI.getProfile(),
          studentAPI.getTranscript(),
          studentAPI.getEnrolledCourses(),
        ]);

        if (profileRes.status === 'fulfilled') setProfile(profileRes.value.data || null);

        if (transcriptRes.status === 'fulfilled') {
          const rows = transcriptRes.value.data?.rows || transcriptRes.value.data?.semesters || transcriptRes.value.data || [];
          setTranscript(rows);
        }

        if (coursesRes.status === 'fulfilled') {
          setEnrolledCourses(coursesRes.value.data?.courses || coursesRes.value.data || []);
        }
      } catch (err) { 
        console.error(err);
        showSnackbar('Failed to load transcript data', 'error');
      }
      setLoading(false);
    };
    fetchTranscript();
  }, []);

  const latestTranscript = transcript.length > 0 ? transcript[transcript.length - 1] : null;
  const currentCgpa = Number(profile?.cgpa ?? latestTranscript?.cumulativeGPA ?? latestTranscript?.cgpa ?? 0);
  const highestSemesterGpa = transcript.length > 0
    ? Math.max(...transcript.map((row) => Number(row.semesterGPA ?? row.sgpa ?? 0)))
    : 0;
  const totalCredits = enrolledCourses.reduce(
    (total, course) => total + Number(course.creditHours || course.credit_hours || 0),
    0
  );

  const handleDownloadPdf = async () => {
    try {
      setDownloadLoading(true);
      const response = await client.get('/sis/transcripts/me/pdf', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `transcript_${user?.rollNo || profile?.rollNo || 'student'}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setDownloadLoading(false);
    }
  };

  const calculateTotalCredits = () => {
    return totalCredits;
  };

  if (loading) {
    return (
      <Box>
        <PageHeader
          title="Academic Transcript"
          subtitle="Complete record of your academic performance"
          action={
            <Button variant="contained" startIcon={<Download />} disabled>
              Download PDF
            </Button>
          }
        />
        <TableSkeleton rows={8} />
      </Box>
    );
  }

  return (
    <motion.div {...pageTransition}>
    <Box className="page-container">
      <PageHeader
        title="Academic Transcript"
        subtitle="Complete record of your academic performance"
        action={
          <Button variant="contained" startIcon={<Download />} onClick={handleDownloadPdf} disabled={downloadLoading}>
            Download PDF
          </Button>
        }
      />

      {/* Academic Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="CGPA"
            value={currentCgpa ? currentCgpa.toFixed(2) : '—'}
            icon={TrendingUp}
            color="primary"
            subtitle="Out of 4.0"
            tooltip="Your Cumulative Grade Point Average across all completed semesters. This reflects your overall academic performance."
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total Credits"
            value={calculateTotalCredits()}
            icon={School}
            color="success"
            subtitle="Credits earned"
            tooltip="Total credit hours you have successfully completed towards your degree requirement."
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Semesters"
            value={transcript.length}
            icon={AssignmentTurnedIn}
            color="info"
            subtitle="Completed"
            tooltip="Number of academic semesters you have completed so far in your degree program."
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Highest GPA"
            value={highestSemesterGpa ? highestSemesterGpa.toFixed(2) : '—'}
            icon={EmojiEvents}
            color="warning"
            subtitle="Best semester"
            tooltip="Your highest semester GPA achieved during your academic journey."
          />
        </Grid>
      </Grid>

      {/* Student Info Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant="caption" color="text.secondary">
                Student Name
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {user?.name}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant="caption" color="text.secondary">
                Roll Number
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {profile?.rollNo || user?.rollNo}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant="caption" color="text.secondary">
                Program
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {profile?.program || user?.program || 'Program not assigned'}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant="caption" color="text.secondary">
                Cumulative GPA
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="primary">
                {currentCgpa ? currentCgpa.toFixed(2) : '—'}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Semester-wise Transcript */}
      {transcript.length === 0 ? (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="body1" color="text.secondary">
              No transcript records are available yet.
            </Typography>
          </CardContent>
        </Card>
      ) : transcript.map((sem) => {
        // Find courses for this semester (assuming enrolledCourses has semester info)
        // Or if not, we show all courses in the most recent semester block
        // For project nexus, we group enrolledCourses by semesterId
        const semesterCourses = enrolledCourses.filter(c => 
          String(c.semesterId || c.semester_id) === String(sem.semesterId)
        );

        return (
          <Card key={sem.id || sem.transcriptId || sem.semesterId} sx={{ mb: 4, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight="bold">
                {sem.semester}
              </Typography>
              <Stack direction="row" spacing={2}>
                <Chip label={`SGPA: ${Number(sem.semesterGPA ?? sem.sgpa ?? 0).toFixed(2)}`} size="small" sx={{ bgcolor: 'white', color: 'primary.main', fontWeight: 'bold' }} />
                <Chip label={`CGPA: ${Number(sem.cumulativeGPA ?? sem.cgpa ?? 0).toFixed(2)}`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
              </Stack>
            </Box>
            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 0 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'background.neutral' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Course Code</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Course Title</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Credits</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Grade Points</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {semesterCourses.length > 0 ? (
                    semesterCourses.map((course) => (
                      <TableRow key={course.id} hover>
                        <TableCell><Typography variant="body2" fontWeight="600">{course.code}</Typography></TableCell>
                        <TableCell>{course.title}</TableCell>
                        <TableCell align="center">{course.creditHours || course.credit_hours}</TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={(course.status === 'Completed' || course.status === 'Graded') && course.finalGradePoints !== null 
                              ? Number(course.finalGradePoints).toFixed(2) 
                              : '—'} 
                            size="small" 
                            variant="outlined"
                            color={(course.status === 'Completed' || course.status === 'Graded') && Number(course.finalGradePoints) >= 2.0 ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={course.status === 'Completed' || course.status === 'Graded' ? 'Finalized' : 'In-Progress'} 
                            size="small"
                            color={course.status === 'Completed' || course.status === 'Graded' ? 'success' : 'warning'}
                            variant={course.status === 'Completed' || course.status === 'Graded' ? 'filled' : 'outlined'}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary', fontStyle: 'italic' }}>
                        No course records found for this semester.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        );
      })}

      {/* Summary Card */}
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Academic Summary
          </Typography>
          <Divider sx={{ mb: 3 }} />
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Box sx={{ textAlign: 'center', p: 2, backgroundColor: 'primary.main', borderRadius: '12px', color: 'white' }}>
                <School sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" fontWeight="bold">
                  {currentCgpa ? currentCgpa.toFixed(2) : '—'}
                </Typography>
                <Typography variant="body2">Cumulative GPA</Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Box sx={{ textAlign: 'center', p: 2, backgroundColor: 'secondary.main', borderRadius: '12px', color: 'white' }}>
                <Typography variant="h4" fontWeight="bold">
                  {calculateTotalCredits()}
                </Typography>
                <Typography variant="body2">Total Credits Earned</Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Box sx={{ textAlign: 'center', p: 2, backgroundColor: 'success.main', borderRadius: '12px', color: 'white' }}>
                <Typography variant="h4" fontWeight="bold">
                  {transcript.length}
                </Typography>
                <Typography variant="body2">Semesters Completed</Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Box sx={{ textAlign: 'center', p: 2, backgroundColor: 'info.main', borderRadius: '12px', color: 'white' }}>
                <Typography variant="h4" fontWeight="bold">
                  {profile?.semester || profile?.currentSemester || user?.semester || '—'}
                </Typography>
                <Typography variant="body2">Current Semester</Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
    </motion.div>
  );
};

export default Transcript;
