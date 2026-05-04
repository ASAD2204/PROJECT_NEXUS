import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  Button,
  Stack,
  Chip,
  LinearProgress,
  Paper,
  Snackbar,
  Alert,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import Grid from '@mui/material/Grid';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  People,
  Assignment,
  CheckCircle,
  School,
  Download,
  Print,
} from '@mui/icons-material';
import PageHeader from '../../components/Common/PageHeader';
import StatCard from '../../components/Common/StatCard';
import PageTransition from '../../components/Common/PageTransition';
import { fadeInUp, staggerContainer } from '../../utils/animations';
import { analyticsAPI } from '../../api/analytics';
import { teacherAPI } from '../../api/teacher';

const toFiniteNumber = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const clampPercent = (value, fallback = 0) => {
  const numericValue = toFiniteNumber(value, fallback);
  return Math.min(100, Math.max(0, numericValue));
};

const formatPercent = (value) => `${clampPercent(value).toFixed(1)}%`;

const safeText = (value, fallback = '—') => {
  if (value === null || value === undefined) {
    return fallback;
  }

  const normalized = String(value).trim();
  if (!normalized || normalized.toLowerCase() === 'nan' || normalized.toLowerCase() === 'undefined') {
    return fallback;
  }

  return normalized;
};

const normalizeSectionSummary = (section = {}) => {
  const sectionId = section.section_id ?? section.id ?? null;

  return {
    sectionId,
    courseName: safeText(
      section.course_name ?? section.course?.title ?? section.title,
      sectionId !== null ? `Section ${sectionId}` : 'Section'
    ),
    enrolledStudents: toFiniteNumber(section.enrolled_students ?? section.students),
    avgAttendancePct: clampPercent(section.avg_attendance_pct),
    avgQuizScore: clampPercent(section.avg_quiz_score),
    avgAssignmentScore: clampPercent(section.avg_assignment_score),
    atRiskCount: toFiniteNumber(section.at_risk_count),
    pendingAssignments: toFiniteNumber(section.pending_assignments),
  };
};

const normalizeCourseOption = (course = {}) => {
  const sectionId = course.section_id ?? course.id ?? null;
  const courseInfo = course.course ?? {};

  return {
    code: safeText(
      courseInfo.code ?? course.code ?? (sectionId !== null ? `SEC-${sectionId}` : null),
      'Course'
    ),
    name: safeText(courseInfo.title ?? course.name ?? course.title, sectionId !== null ? `Section ${sectionId}` : 'Untitled Course'),
  };
};

const Reports = () => {
  const theme = useTheme();
  const handlePrint = () => {
    window.print();
  };

  const [course, setCourse] = useState('all');
  const [range, setRange] = useState('last-30');

  const [gradeDistribution, setGradeDistribution] = useState([]);
  const [attendanceTrend, setAttendanceTrend] = useState([]);
  const [assignmentStats, setAssignmentStats] = useState([]);
  const [studentPerformance, setStudentPerformance] = useState([]);
  const [weeklyProgress, setWeeklyProgress] = useState([]);
  const [courseComparison, setCourseComparison] = useState([]);
  const [courses, setCourses] = useState([{ code: 'all', name: 'All Courses' }]);
  const [summaryTotals, setSummaryTotals] = useState({ sections: 0, students: 0 });
  const [stats, setStats] = useState([
    { title: 'Total Students', value: '—', subtitle: '', icon: People, color: '', tooltip: '' },
    { title: 'Avg Attendance', value: '—', subtitle: '', icon: CheckCircle, color: '', tooltip: '' },
    { title: 'Assignment Completion', value: '—', subtitle: '', icon: Assignment, color: '', tooltip: '' },
    { title: 'Class Average', value: '—', subtitle: '', icon: School, color: '', tooltip: '' },
  ]);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const [res, courseRes] = await Promise.all([
          analyticsAPI.getFacultyDashboard(),
          teacherAPI.getMyCourses().catch(() => ({ data: [] }))
        ]);

        const dashboard = res.data || {};
        const sections = Array.isArray(dashboard?.sections) ? dashboard.sections.map(normalizeSectionSummary) : [];
        const totalStudents = toFiniteNumber(dashboard?.total_students);
        const totalSections = toFiniteNumber(dashboard?.total_sections);
        const avgAttendance = sections.length
          ? sections.reduce((sum, section) => sum + section.avgAttendancePct, 0) / sections.length
          : 0;
        const avgAssignment = sections.length
          ? sections.reduce((sum, section) => sum + section.avgAssignmentScore, 0) / sections.length
          : 0;
        const avgQuiz = sections.length
          ? sections.reduce((sum, section) => sum + section.avgQuizScore, 0) / sections.length
          : 0;

        const crs = Array.isArray(courseRes.data?.courses)
          ? courseRes.data.courses
          : Array.isArray(courseRes.data)
            ? courseRes.data
            : [];
        const normalizedCourses = crs.map(normalizeCourseOption);
        if (normalizedCourses.length > 0) {
          setCourses([{ code: 'all', name: 'All Courses' }, ...normalizedCourses]);
          setCourse('all');
        }

        setSummaryTotals(prev => ({ ...prev, sections: totalSections, students: totalStudents }));

        setStats([
          { title: 'Total Students', value: String(totalStudents), subtitle: `${totalSections} sections`, icon: People, color: 'primary', tooltip: '' },
          { title: 'Avg Attendance', value: formatPercent(avgAttendance), subtitle: 'Across all sections', icon: CheckCircle, color: 'success', tooltip: '' },
          { title: 'Assignment Completion', value: formatPercent(avgAssignment), subtitle: 'Avg section score', icon: Assignment, color: 'warning', tooltip: '' },
          { title: 'Class Average', value: formatPercent(avgQuiz), subtitle: 'Avg quiz score', icon: School, color: 'info', tooltip: '' },
        ]);

        const gradeBuckets = { A: 0, B: 0, C: 0, D: 0, F: 0 };
        sections.forEach((s) => {
          const score = s.avgAssignmentScore;
          if (score >= 85) gradeBuckets.A += 1;
          else if (score >= 75) gradeBuckets.B += 1;
          else if (score >= 65) gradeBuckets.C += 1;
          else if (score >= 55) gradeBuckets.D += 1;
          else gradeBuckets.F += 1;
        });
        const totalBuckets = Math.max(sections.length, 1);
        setGradeDistribution(
          Object.entries(gradeBuckets).map(([grade, count]) => ({
            grade,
            count,
            percentage: Math.round((count / totalBuckets) * 100),
          }))
        );

        setAttendanceTrend(
          sections.map((s, idx) => ({
            week: s.courseName || `Section ${idx + 1}`,
            attendance: s.avgAttendancePct,
          }))
        );

        const onTime = toFiniteNumber(dashboard?.submission_stats?.on_time);
        const late = toFiniteNumber(dashboard?.submission_stats?.late);
        const missing = toFiniteNumber(dashboard?.submission_stats?.missing);
        const totalSub = onTime + late + missing;

        setAssignmentStats([
          { name: 'On Time', value: totalSub > 0 ? Math.round((onTime / totalSub) * 100) : 0, color: '#4caf50' },
          { name: 'Late', value: totalSub > 0 ? Math.round((late / totalSub) * 100) : 0, color: '#ff9800' },
          { name: 'Missing', value: totalSub > 0 ? Math.round((missing / totalSub) * 100) : 0, color: '#f44336' },
        ]);

        const perfRows = [
          { name: 'Excellent', value: sections.filter((s) => s.avgAssignmentScore >= 85).length, color: '#4caf50' },
          { name: 'Good', value: sections.filter((s) => s.avgAssignmentScore >= 70 && s.avgAssignmentScore < 85).length, color: '#2196f3' },
          { name: 'Average', value: sections.filter((s) => s.avgAssignmentScore >= 55 && s.avgAssignmentScore < 70).length, color: '#ff9800' },
          { name: 'Needs Support', value: sections.filter((s) => s.avgAssignmentScore < 55).length, color: '#f44336' },
        ];
        setStudentPerformance(perfRows.map((r) => ({
          ...r,
          percentage: Math.round((r.value / Math.max(sections.length, 1)) * 100),
        })));

        setWeeklyProgress(
          sections.map((s, idx) => ({
            week: s.courseName || `Section ${idx + 1}`,
            avgScore: s.avgAssignmentScore,
            attendance: s.avgAttendancePct,
          }))
        );

        setCourseComparison(
          sections.map((s) => ({
            course: s.courseName || `Section ${s.sectionId}`,
            avgGrade: Number((s.avgAssignmentScore / 25).toFixed(2)),
            passRate: s.avgAssignmentScore,
          }))
        );
      } catch (e) { console.error('Failed to load reports', e); }
    };
    fetchReports();
  }, []);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const handleExport = async () => {
    try {
      const headers = ['Category', 'Value', 'Percentage'];
      const rows = studentPerformance.map(p => [p.name, p.value, `${p.percentage}%`]);
      const content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `faculty_report_${course}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setSnackbar({ open: true, message: 'Report exported successfully', severity: 'success' });
    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: 'Failed to export report', severity: 'error' });
    }
  };

  return (
    <PageTransition>
      <Box className="page-container">
        <PageHeader
          icon={TrendingUp}
          title="Course Analytics & Reports"
          subtitle="Generate performance insights and track student progress"
          gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
          action={
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                startIcon={<Print />}
                onClick={handlePrint}
                sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
              >
                Print
              </Button>
              <Button
                variant="contained"
                startIcon={<Download />}
                onClick={handleExport}
              >
                Export Report
              </Button>
            </Stack>
          }
        />

        {/* STATS CARDS */}
        <Grid 
          container 
          spacing={3} 
          sx={{ mb: 4 }}
          component={motion.div}
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {stats.map((stat, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index} component={motion.div} variants={fadeInUp}>
              <StatCard
                title={stat.title}
                value={stat.value}
                subtitle={stat.subtitle}
                icon={stat.icon}
                color={stat.color}
                tooltip={stat.tooltip}
              />
            </Grid>
          ))}
        </Grid>

        <Grid
          container
          spacing={3}
          component={motion.div}
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {/* FILTERS */}
          <Grid size={{ xs: 12 }} component={motion.div} variants={fadeInUp}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Stack 
                  direction={{ xs: 'column', sm: 'row' }} 
                  spacing={2} 
                  sx={{ mb: 0 }}
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                  justifyContent="space-between"
                >
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ flex: 1 }}>
                    <TextField
                      select
                      label="Course"
                      value={course}
                      onChange={(e) => setCourse(e.target.value)}
                      sx={{ minWidth: { xs: '100%', sm: 220 } }}
                      size="small"
                    >
                      {courses.map(c => (
                        <MenuItem key={c.code} value={c.code}>{c.code === 'all' ? c.name : `${c.code} - ${c.name}`}</MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      select
                      label="Date Range"
                      value={range}
                      onChange={(e) => setRange(e.target.value)}
                      sx={{ minWidth: { xs: '100%', sm: 200 } }}
                      size="small"
                    >
                      <MenuItem value="last-7">Last 7 Days</MenuItem>
                      <MenuItem value="last-30">Last 30 Days</MenuItem>
                      <MenuItem value="semester">This Semester</MenuItem>
                    </TextField>
                  </Stack>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: { xs: 'wrap', sm: 'nowrap' }, gap: { xs: 1, sm: 0 } }}>
                    <Button variant="outlined" startIcon={<Download />} size="small" onClick={handleExport} sx={{ flex: { xs: '1 1 100%', sm: '0 0 auto' } }}>
                      Export
                    </Button>
                    <Button variant="outlined" startIcon={<Print />} size="small" onClick={handlePrint} sx={{ flex: { xs: '1 1 100%', sm: '0 0 auto' } }}>
                      Print
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* GRADE DISTRIBUTION */}
          <Grid size={{ xs: 12 }} component={motion.div} variants={fadeInUp}>
            <Card sx={{ 
              borderRadius: 3, 
              height: '100%',
              background: 'linear-gradient(135deg, rgba(102,126,234,0.05) 0%, rgba(118,75,162,0.05) 100%)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              transition: 'all 0.3s ease',
              '&:hover': { boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }
            }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      Grade Distribution
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Current semester performance breakdown
                    </Typography>
                  </Box>
                  <Chip label={`${summaryTotals.sections} Sections`} size="small" color="primary" variant="outlined" />
                </Stack>
                <Box sx={{ height: { xs: 260, sm: 300, md: 320, lg: 350 }, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={gradeDistribution} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="gradeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={theme.palette.primary.main} stopOpacity={1}/>
                          <stop offset="100%" stopColor={theme.palette.primary.main} stopOpacity={0.4}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} stroke="#e0e0e0" />
                      <XAxis 
                        dataKey="grade" 
                        stroke="#666" 
                        style={{ fontSize: '0.75rem' }}
                        tickLine={false}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        stroke="#666" 
                        style={{ fontSize: '0.75rem' }}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: 8, 
                          border: 'none',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }}
                        cursor={{ fill: 'rgba(102,126,234,0.1)' }}
                      />
                      <Bar 
                        dataKey="count" 
                        fill="url(#gradeGradient)"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={60}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>

                {/* Grade breakdown */}
                <Box sx={{ mt: 3 }}>
                  {gradeDistribution.map((item) => (
                    <Box key={item.grade} sx={{ mb: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" fontWeight={600}>
                          Grade {item.grade}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.count} students ({item.percentage}%)
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={item.percentage * 2.22} 
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* ASSIGNMENT COMPLETION */}
          <Grid size={{ xs: 12 }} component={motion.div} variants={fadeInUp}>
            <Card sx={{ 
              borderRadius: 3, 
              height: '100%',
              background: 'linear-gradient(135deg, rgba(76,175,80,0.05) 0%, rgba(33,150,243,0.05) 100%)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              transition: 'all 0.3s ease',
              '&:hover': { boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }
            }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      Assignment Submission
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Submission status breakdown
                    </Typography>
                  </Box>
                  <Chip label="Submission Snapshot" size="small" color="success" variant="outlined" />
                </Stack>
                <Box sx={{ height: { xs: 300, sm: 350, md: 400 }, width: '100%', display: 'flex', justifyContent: 'center' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        <linearGradient id="onTimeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4caf50" stopOpacity={1}/>
                          <stop offset="100%" stopColor="#2e7d32" stopOpacity={0.8}/>
                        </linearGradient>
                        <linearGradient id="lateGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ff9800" stopOpacity={1}/>
                          <stop offset="100%" stopColor="#f57c00" stopOpacity={0.8}/>
                        </linearGradient>
                        <linearGradient id="missingGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f44336" stopOpacity={1}/>
                          <stop offset="100%" stopColor="#c62828" stopOpacity={0.8}/>
                        </linearGradient>
                      </defs>
                      <Pie
                        data={assignmentStats}
                        cx="50%"
                        cy="50%"
                        innerRadius="35%"
                        outerRadius="55%"
                        dataKey="value"
                        paddingAngle={2}
                        stroke="white"
                        strokeWidth={2}
                        label={(entry) => `${entry.value}%`}
                        labelLine={{ stroke: '#666', strokeWidth: 1 }}
                      >
                        <Cell fill="url(#onTimeGradient)" />
                        <Cell fill="url(#lateGradient)" />
                        <Cell fill="url(#missingGradient)" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
                <Stack spacing={1.5} sx={{ mt: 3 }}>
                  {assignmentStats.map((item) => (
                    <Box 
                      key={item.name} 
                      sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 1.5,
                        borderRadius: 1,
                        backgroundColor: alpha(item.color, 0.1),
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box 
                          sx={{ 
                            width: 12, 
                            height: 12, 
                            borderRadius: '50%', 
                            backgroundColor: item.color 
                          }} 
                        />
                        <Typography variant="body2" fontWeight={600}>
                          {item.name}
                        </Typography>
                      </Box>
                      <Typography variant="body2" fontWeight="bold">
                        {item.value}%
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* ATTENDANCE TREND */}
          <Grid size={{ xs: 12 }} component={motion.div} variants={fadeInUp}>
            <Card sx={{ 
              borderRadius: 3,
              background: 'linear-gradient(135deg, rgba(76,175,80,0.05) 0%, rgba(139,195,74,0.05) 100%)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              transition: 'all 0.3s ease',
              '&:hover': { boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }
            }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      Attendance Trend
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Attendance rates across your current sections
                    </Typography>
                  </Box>
                  <Chip label={`${summaryTotals.sections} Sections`} size="small" color="success" variant="outlined" />
                </Stack>
                <Box sx={{ height: { xs: 260, sm: 300, md: 320, lg: 350 }, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={attendanceTrend} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={theme.palette.success.main} stopOpacity={0.3}/>
                          <stop offset="100%" stopColor={theme.palette.success.main} stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} stroke="#e0e0e0" />
                      <XAxis 
                        dataKey="week" 
                        stroke="#666" 
                        style={{ fontSize: '0.75rem' }}
                        tickLine={false}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        domain={[0, 100]} 
                        stroke="#666" 
                        style={{ fontSize: '0.75rem' }}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: 8, 
                          border: 'none',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="attendance" 
                        stroke={theme.palette.success.main}
                        strokeWidth={3}
                        fill="url(#attendanceGradient)"
                        dot={{ fill: theme.palette.success.main, r: 5, strokeWidth: 2, stroke: 'white' }}
                        activeDot={{ r: 7, strokeWidth: 2, stroke: 'white' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* STUDENT PERFORMANCE DISTRIBUTION */}
          <Grid size={{ xs: 12 }} component={motion.div} variants={fadeInUp}>
            <Card sx={{ 
              borderRadius: 3,
              background: 'linear-gradient(135deg, rgba(156,39,176,0.05) 0%, rgba(123,31,162,0.05) 100%)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              transition: 'all 0.3s ease',
              '&:hover': { boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }
            }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      Student Performance Distribution
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Overall class performance breakdown by category
                    </Typography>
                  </Box>
                  <Chip label={`${summaryTotals.students} Students`} size="small" color="secondary" variant="outlined" />
                </Stack>
                <Box sx={{ height: { xs: 300, sm: 350, md: 400 }, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={studentPerformance} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                      <defs>
                        {studentPerformance.map((item, idx) => (
                          <linearGradient key={idx} id={`perfGrad${idx}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={item.color} stopOpacity={1}/>
                            <stop offset="100%" stopColor={item.color} stopOpacity={0.6}/>
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} stroke="#e0e0e0" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#666" 
                        style={{ fontSize: '0.75rem' }}
                        tickLine={false}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        stroke="#666" 
                        style={{ fontSize: '0.75rem' }}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: 8, 
                          border: 'none',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }}
                        cursor={{ fill: 'rgba(156,39,176,0.1)' }}
                      />
                      <Bar 
                        dataKey="value" 
                        radius={[8, 8, 0, 0]}
                        maxBarSize={80}
                      >
                        {studentPerformance.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={`url(#perfGrad${index})`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
                <Box sx={{ mt: 3 }}>
                  <Grid container spacing={2}>
                    {studentPerformance.map((item, idx) => (
                      <Grid key={idx} size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
                        <Paper 
                          elevation={0}
                          sx={{ 
                            p: 2,
                            borderRadius: 2,
                            backgroundColor: alpha(item.color, 0.1),
                            border: `2px solid ${alpha(item.color, 0.3)}`,
                          }}
                        >
                          <Typography variant="caption" color="text.secondary" display="block">
                            {item.name}
                          </Typography>
                          <Typography variant="h5" fontWeight="bold" color={item.color}>
                            {item.value}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.percentage}% of class
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* WEEKLY PROGRESS TRACKING */}
          <Grid size={{ xs: 12 }} component={motion.div} variants={fadeInUp}>
            <Card sx={{ 
              borderRadius: 3,
              background: 'linear-gradient(135deg, rgba(33,150,243,0.05) 0%, rgba(21,101,192,0.05) 100%)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              transition: 'all 0.3s ease',
              '&:hover': { boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }
            }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      Weekly Progress Tracking
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Average test scores vs attendance correlation
                    </Typography>
                  </Box>
                  <Chip label={`${summaryTotals.sections} Sections`} size="small" color="info" variant="outlined" />
                </Stack>
                <Box sx={{ height: { xs: 300, sm: 350, md: 400 }, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyProgress} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={theme.palette.primary.main} stopOpacity={0.3}/>
                          <stop offset="100%" stopColor={theme.palette.primary.main} stopOpacity={0.05}/>
                        </linearGradient>
                        <linearGradient id="attendGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={theme.palette.success.main} stopOpacity={0.3}/>
                          <stop offset="100%" stopColor={theme.palette.success.main} stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} stroke="#e0e0e0" />
                      <XAxis 
                        dataKey="week" 
                        stroke="#666" 
                        style={{ fontSize: '0.75rem' }}
                        tickLine={false}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        yAxisId="left"
                        domain={[0, 100]} 
                        stroke="#666" 
                        style={{ fontSize: '0.75rem' }}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        domain={[0, 100]} 
                        stroke="#666" 
                        style={{ fontSize: '0.75rem' }}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: 8, 
                          border: 'none',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }}
                      />
                      <Legend />
                      <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="avgScore" 
                        stroke={theme.palette.primary.main}
                        strokeWidth={3}
                        fill="url(#scoreGradient)"
                        dot={{ fill: theme.palette.primary.main, r: 5, strokeWidth: 2, stroke: 'white' }}
                        activeDot={{ r: 7, strokeWidth: 2, stroke: 'white' }}
                        name="Avg Score"
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="attendance" 
                        stroke={theme.palette.success.main}
                        strokeWidth={3}
                        fill="url(#attendGradient)"
                        dot={{ fill: theme.palette.success.main, r: 5, strokeWidth: 2, stroke: 'white' }}
                        activeDot={{ r: 7, strokeWidth: 2, stroke: 'white' }}
                        name="Attendance %"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* COURSE COMPARISON */}
          <Grid size={{ xs: 12 }} component={motion.div} variants={fadeInUp}>
            <Card sx={{ 
              borderRadius: 3,
              background: 'linear-gradient(135deg, rgba(255,152,0,0.05) 0%, rgba(251,140,0,0.05) 100%)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              transition: 'all 0.3s ease',
              '&:hover': { boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }
            }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      Course Comparison Analysis
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Compare average grades and pass rates across your courses
                    </Typography>
                  </Box>
                  <Chip label={`${summaryTotals.sections} Courses`} size="small" color="warning" variant="outlined" />
                </Stack>
                <Box sx={{ height: { xs: 300, sm: 350, md: 400 }, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={courseComparison} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="gradeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={theme.palette.warning.main} stopOpacity={1}/>
                          <stop offset="100%" stopColor={theme.palette.warning.main} stopOpacity={0.6}/>
                        </linearGradient>
                        <linearGradient id="passGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={theme.palette.success.main} stopOpacity={1}/>
                          <stop offset="100%" stopColor={theme.palette.success.main} stopOpacity={0.6}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} stroke="#e0e0e0" />
                      <XAxis 
                        dataKey="course" 
                        stroke="#666" 
                        style={{ fontSize: '0.75rem' }}
                        tickLine={false}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        yAxisId="left"
                        domain={[0, 4]} 
                        stroke="#666" 
                        style={{ fontSize: '0.75rem' }}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                        tick={{ fontSize: 12 }}
                        label={{ value: 'GPA', angle: -90, position: 'insideLeft' }}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        domain={[0, 100]} 
                        stroke="#666" 
                        style={{ fontSize: '0.75rem' }}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                        tick={{ fontSize: 12 }}
                        label={{ value: 'Pass Rate %', angle: 90, position: 'insideRight' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: 8, 
                          border: 'none',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }}
                        cursor={{ fill: 'rgba(255,152,0,0.1)' }}
                      />
                      <Legend />
                      <Bar 
                        yAxisId="left"
                        dataKey="avgGrade" 
                        fill="url(#gradeGrad)"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={60}
                        name="Average Grade (GPA)"
                      />
                      <Bar 
                        yAxisId="right"
                        dataKey="passRate" 
                        fill="url(#passGrad)"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={60}
                        name="Pass Rate %"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </PageTransition>
  );
};

export default Reports;
