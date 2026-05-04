import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Stack,
  Chip,
  IconButton,
  alpha,
  Alert,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Download,
  TrendingUp,
  People,
  School,
  Payment,
  Assessment,
  Print,
  Share,
  PictureAsPdf,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import PageHeader from '../../components/Common/PageHeader';
import StatCard from '../../components/Common/StatCard';
import { pageTransition } from '../../utils/animations';
import { analyticsAPI } from '../../api/analytics';
import { sisAPI } from '../../api/sis';

const AdminReports = () => {
  const theme = useTheme();
  const [reportType, setReportType] = useState('enrollment');
  const [semester, setSemester] = useState('current');
  const [department, setDepartment] = useState('all');
  const [departments, setDepartments] = useState([]);
  const [lastGeneratedAt, setLastGeneratedAt] = useState('');
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [dashboardData, setDashboardData] = useState(null);

  const normalizeText = (value) => String(value || '').trim().toLowerCase();

  const unwrapCollection = (payload, keys = []) => {
    if (Array.isArray(payload)) {
      return payload;
    }

    for (const key of keys) {
      if (Array.isArray(payload?.[key])) {
        return payload[key];
      }
    }

    return [];
  };

  const reportTypes = [
    { value: 'enrollment', label: 'Enrollment Report' },
    { value: 'financial', label: 'Financial Report' },
    { value: 'academic', label: 'Academic Performance' },
    { value: 'attendance', label: 'Attendance Report' },
    { value: 'faculty', label: 'Faculty Report' },
  ];

  const [summaryStats, setSummaryStats] = useState([
    { title: 'Total Students', value: '—', subtitle: 'Loading...', color: 'primary', icon: People, tooltip: '' },
    { title: 'Total Revenue', value: '—', subtitle: 'Loading...', color: 'success', icon: Payment, tooltip: '' },
    { title: 'Avg Attendance', value: '—', subtitle: 'Loading...', color: 'info', icon: School, tooltip: '' },
    { title: 'Course Completion', value: '—', subtitle: 'Loading...', color: 'warning', icon: Assessment, tooltip: '' },
  ]);
  const [enrollmentData, setEnrollmentData] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [attendanceByDepartment, setAttendanceByDepartment] = useState([]);
  const [studentGrowth, setStudentGrowth] = useState([]);
  const [facultyDistribution, setFacultyDistribution] = useState([]);

  const buildDepartmentRows = (departmentsSource, fallbackAttendance) => {
    const rows = (Array.isArray(departmentsSource) ? departmentsSource : []).map((dp) => ({
      department: dp.name || dp.code || 'Department',
      students: Number(dp.students || 0),
      faculty: Number(dp.faculty || 0),
      attendance: Number(dp.attendance || fallbackAttendance),
      dept: dp.name || dp.code || 'Department',
    }));

    return department === 'all'
      ? rows
      : rows.filter((row) => normalizeText(row.department) === normalizeText(department) || normalizeText(row.dept) === normalizeText(department));
  };

  const fetchReports = async () => {
    const [analyticsRes, deptRes] = await Promise.allSettled([
      analyticsAPI.getAdminDashboard(),
      sisAPI.getDepartments(),
    ]);

    const dashboard = analyticsRes.status === 'fulfilled' ? analyticsRes.value.data : null;
    const departmentRows = deptRes.status === 'fulfilled'
      ? unwrapCollection(deptRes.value.data, ['departments'])
      : [];

    setDepartments(Array.isArray(departmentRows) ? departmentRows : []);
    setDashboardData(dashboard);

    if (!dashboard) {
      setToast({ open: true, message: 'Unable to load analytics dashboard data.', severity: 'error' });
      return;
    }

    const atRiskTotal = Number(dashboard?.at_risk_summary?.red || 0) + Number(dashboard?.at_risk_summary?.yellow || 0);
    const attendancePct = Number(dashboard?.attendance?.attendance_pct || 0);
    const deptRows = buildDepartmentRows(departmentRows, attendancePct);

    setSummaryStats([
      {
        title: 'Total Students',
        value: String(dashboard.total_students ?? 0),
        subtitle: `${dashboard.active_students ?? 0} active`,
        color: 'primary',
        icon: People,
        tooltip: 'Total and active students from analytics service.',
      },
      {
        title: 'Total Revenue',
        value: `PKR ${Number(dashboard?.revenue?.total_collected || 0).toLocaleString()}`,
        subtitle: `Collection rate ${Number(dashboard?.revenue?.collection_rate_pct || 0).toFixed(1)}%`,
        color: 'success',
        icon: Payment,
        tooltip: 'Collected revenue from finance transactions.',
      },
      {
        title: 'Avg Attendance',
        value: `${Number(dashboard?.attendance?.attendance_pct || 0).toFixed(1)}%`,
        subtitle: `${dashboard?.attendance?.present_count || 0}/${dashboard?.attendance?.total_records || 0} present`,
        color: 'info',
        icon: School,
        tooltip: 'Attendance KPI from attendance records.',
      },
      {
        title: 'At-Risk Students',
        value: String(atRiskTotal),
        subtitle: `Avg CGPA ${Number(dashboard?.avg_cgpa || 0).toFixed(2)}`,
        color: 'warning',
        icon: Assessment,
        tooltip: 'Red + yellow risk buckets from analytics.',
      },
    ]);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

    // Note: Revenue from backend is in Millions
    setRevenueData(months.map((m, idx) => ({
      month: m,
      revenue: Number(dashboard?.monthly_revenue?.[idx] || 0)
    })));

    setStudentGrowth(months.map((m, idx) => ({
      year: m,
      students: Number(dashboard?.monthly_enrollment?.[idx] || 0)
    })));

    setAttendanceByDepartment(months.map((m, idx) => ({
      dept: m,
      attendance: Number(dashboard?.monthly_attendance?.[idx] || 0)
    })));

    setEnrollmentData(deptRows);
    setFacultyDistribution(deptRows.length
      ? deptRows
      : [{ department: 'All', faculty: 0, students: Number(dashboard.total_students || 0) }]);

    const failureCount = [analyticsRes, deptRes].filter((result) => result.status === 'rejected').length;
    if (failureCount > 0) {
      setToast({ open: true, message: 'Loaded report data with partial failures.', severity: 'warning' });
    }
  };

  useEffect(() => {
    fetchReports().catch((e) => console.error(e));
  }, []);

  const handleGenerateReport = async () => {
    try {
      await fetchReports();
      setLastGeneratedAt(new Date().toLocaleString());
      setToast({ open: true, message: 'Report generated successfully.', severity: 'success' });
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: 'Unable to generate the report.', severity: 'error' });
    }
  };

  const downloadTextFile = (filename, content, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const csvEscape = (value) => {
    const text = String(value ?? '').replace(/"/g, '""');
    return /[",\n\t]/.test(text) ? `"${text}"` : text;
  };

  const buildReportRows = () => {
    const selectedReportLabel = reportTypes.find((type) => type.value === reportType)?.label || reportType;
    const summaryRows = summaryStats.map((stat) => ['Summary', stat.title, stat.value, stat.subtitle || '']);
    const revenueRows = revenueData.map((item) => ['Revenue Trend (M)', item.month, `PKR ${item.revenue}M`, selectedReportLabel]);
    const enrollmentRows = enrollmentData.map((item) => ['Department Enrollment', item.department, item.students, `Faculty: ${item.faculty}`]);
    const attendanceRows = attendanceByDepartment.map((item) => ['Attendance %', item.dept, `${item.attendance}%`, selectedReportLabel]);
    const facultyRows = facultyDistribution.map((item) => ['Faculty Ratio', item.department, `Faculty: ${item.faculty}`, `Students: ${item.students}`]);

    return {
      label: selectedReportLabel,
      rows: [
        ...summaryRows,
        ...revenueRows,
        ...enrollmentRows,
        ...attendanceRows,
        ...facultyRows,
      ],
    };
  };

  const handleExportCsv = () => {
    const { label, rows } = buildReportRows();
    const headers = ['Section', 'Label', 'Value', 'Details'];
    const csv = [headers.join(',')]
      .concat(rows.map((row) => row.map(csvEscape).join(',')))
      .join('\n');
    downloadTextFile(`admin-report-${reportType}-${semester}-${department}.csv`, csv, 'text/csv;charset=utf-8;');
    setToast({ open: true, message: `${label} exported as CSV.`, severity: 'success' });
  };

  const handleExportExcel = () => {
    const { label, rows } = buildReportRows();
    const headers = ['Section', 'Label', 'Value', 'Details'];
    const tsv = [headers.join('\t')]
      .concat(rows.map((row) => row.map((value) => String(value ?? '')).join('\t')))
      .join('\n');
    downloadTextFile(`admin-report-${reportType}-${semester}-${department}.xls`, tsv, 'application/vnd.ms-excel;charset=utf-8;');
    setToast({ open: true, message: `${label} exported for Excel.`, severity: 'success' });
  };

  const handleExportPdf = () => {
    const doc = new jsPDF();
    const selectedReportLabel = reportTypes.find((type) => type.value === reportType)?.label || reportType;
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(theme.palette.primary.main);
    doc.text('Project Nexus - Administrative Report', 14, 22);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Report Type: ${selectedReportLabel}`, 14, 32);
    doc.text(`Semester: ${semester === 'current' ? 'Spring 2026' : semester}`, 14, 38);
    doc.text(`Department: ${department === 'all' ? 'All Departments' : department}`, 14, 44);
    doc.text(`Generated At: ${lastGeneratedAt || new Date().toLocaleString()}`, 14, 50);
    
    doc.setDrawColor(theme.palette.divider);
    doc.line(14, 55, 196, 55);

    // Summary Section
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text('Summary Statistics', 14, 65);
    
    const summaryData = summaryStats.map(stat => [stat.title, stat.value, stat.subtitle]);
    autoTable(doc, {
      startY: 70,
      head: [['Metric', 'Value', 'Context']],
      body: summaryData,
      theme: 'striped',
      headStyles: { fillStyle: theme.palette.primary.main },
    });

    // Data Tables
    doc.setFontSize(16);
    doc.text('Detailed Analytics', 14, doc.lastAutoTable.finalY + 15);

    const { rows } = buildReportRows();
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Section', 'Category', 'Data', 'Details']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [66, 66, 66] },
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text(`Page ${i} of ${pageCount} | Nexus Analytics Service`, 14, 285);
    }

    doc.save(`admin-report-${reportType}.pdf`);
    setToast({ open: true, message: 'PDF report downloaded successfully.', severity: 'success' });
  };

  const handlePrintReport = () => {
    window.print();
  };

  const handleShareReport = async () => {
    const { label, rows } = buildReportRows();
    const summaryText = [
      `${label} report`,
      `Semester: ${semester}`,
      `Department: ${department === 'all' ? 'All Departments' : department}`,
      `Generated: ${lastGeneratedAt || 'just now'}`,
      `Rows: ${rows.length}`,
    ].join('\n');

    try {
      if (navigator.share) {
        await navigator.share({ title: label, text: summaryText });
      } else {
        await navigator.clipboard.writeText(summaryText);
      }
      setToast({ open: true, message: 'Report shared successfully.', severity: 'success' });
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: 'Unable to share the report.', severity: 'error' });
    }
  };

  return (
    <motion.div {...pageTransition}>
      <Box className="page-container">
        <PageHeader
          title="Reports & Analytics"
          subtitle="Generate comprehensive reports and insights"
        />

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Report Type</InputLabel>
                  <Select
                    value={reportType}
                    label="Report Type"
                    onChange={(e) => setReportType(e.target.value)}
                  >
                    {reportTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Semester</InputLabel>
                  <Select
                    value={semester}
                    label="Semester"
                    onChange={(e) => setSemester(e.target.value)}
                  >
                    <MenuItem value="current">Current Semester (Spring 2026)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Department</InputLabel>
                  <Select
                    value={department}
                    label="Department"
                    onChange={(e) => setDepartment(e.target.value)}
                  >
                    <MenuItem value="all">All Departments</MenuItem>
                    {departments.map((dept) => (
                      <MenuItem key={dept.dept_id || dept.code || dept.name} value={dept.name || dept.code}>
                        {dept.name || dept.code}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 2 }}>
                <Stack direction="row" spacing={1}>
                  <Button fullWidth variant="contained" startIcon={<Assessment />} onClick={handleGenerateReport} sx={{ minWidth: { xs: '100%', md: 'auto' } }}>
                    Generate
                  </Button>
                </Stack>
              </Grid>
            </Grid>
            <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
              <Chip label={`Report: ${reportTypes.find((type) => type.value === reportType)?.label || reportType}`} color="primary" variant="outlined" size="small" />
              <Chip label={`Semester: ${semester === 'current' ? 'Spring 2026' : semester}`} color="info" variant="outlined" size="small" />
              <Chip label={department === 'all' ? 'All Departments' : department} color="success" variant="outlined" size="small" />
              {lastGeneratedAt && <Chip label={`Generated ${lastGeneratedAt}`} color="default" variant="outlined" size="small" />}
            </Stack>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {summaryStats.map((stat, index) => (
            <Grid key={index} size={{ xs: 12, sm: 6, lg: 3 }}>
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

        {/* Charts */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      Revenue Trend (Millions PKR)
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Monthly revenue collection for the current year
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <IconButton size="small" onClick={handlePrintReport} aria-label="Print report">
                      <Print />
                    </IconButton>
                    <IconButton size="small" onClick={handleExportCsv} aria-label="Download report CSV">
                      <Download />
                    </IconButton>
                  </Stack>
                </Box>
                <Box sx={{ width: '100%', height: { xs: 280, sm: 320, md: 350 }, minHeight: 280, minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revenueData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={theme.palette.success.main} stopOpacity={0.3}/>
                          <stop offset="100%" stopColor={theme.palette.success.main} stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} stroke="#e0e0e0" />
                      <XAxis 
                        dataKey="month" 
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
                        label={{ value: 'PKR (M)', angle: -90, position: 'insideLeft', fontSize: 10 }}
                      />
                      <Tooltip 
                        formatter={(value) => [`${value}M`, 'Revenue']}
                        contentStyle={{ 
                          borderRadius: 8, 
                          border: 'none',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke={theme.palette.success.main}
                        strokeWidth={3}
                        fill="url(#revenueGradient)"
                        dot={{ fill: theme.palette.success.main, r: 5, strokeWidth: 2, stroke: 'white' }}
                        activeDot={{ r: 7, strokeWidth: 2, stroke: 'white' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
                  Department Enrollment
                </Typography>
                <Box sx={{ width: '100%', height: { xs: 280, sm: 320, md: 350 }, minHeight: 280, minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={enrollmentData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="enrollmentGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={theme.palette.primary.main} stopOpacity={1}/>
                          <stop offset="100%" stopColor={theme.palette.primary.main} stopOpacity={0.6}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} stroke="#e0e0e0" />
                      <XAxis 
                        dataKey="department" 
                        stroke="#666" 
                        style={{ fontSize: '0.7rem' }}
                        tickLine={false}
                        tick={{ fontSize: 11 }}
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
                        cursor={{ fill: 'rgba(25,118,210,0.1)' }}
                      />
                      <Bar 
                        dataKey="students" 
                        fill="url(#enrollmentGradient)"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={60}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* STUDENT GROWTH TREND */}
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      Student Enrollment Growth
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Monthly student enrollment trends for the current period
                    </Typography>
                  </Box>
                  <Chip label="Current Trend" size="small" color="primary" variant="outlined" />
                </Box>
                <Box sx={{ width: '100%', height: { xs: 300, sm: 350, md: 400 }, minHeight: 300, minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={studentGrowth} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={theme.palette.primary.main} stopOpacity={0.3}/>
                          <stop offset="100%" stopColor={theme.palette.primary.main} stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} stroke="#e0e0e0" />
                      <XAxis 
                        dataKey="year" 
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
                        width={50}
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
                        dataKey="students" 
                        stroke={theme.palette.primary.main}
                        strokeWidth={4}
                        fill="url(#growthGradient)"
                        dot={{ fill: theme.palette.primary.main, r: 6, strokeWidth: 3, stroke: 'white' }}
                        activeDot={{ r: 8, strokeWidth: 3, stroke: 'white' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* ATTENDANCE BY DEPARTMENT */}
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      Attendance Rate Trend
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Monthly attendance rate performance across all departments
                    </Typography>
                  </Box>
                  <Chip label="Academic Trend" size="small" color="success" variant="outlined" />
                </Box>
                <Box sx={{ width: '100%', height: { xs: 300, sm: 350, md: 400 }, minHeight: 300, minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={attendanceByDepartment} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="attendDeptGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={theme.palette.success.main} stopOpacity={1}/>
                          <stop offset="100%" stopColor={theme.palette.success.main} stopOpacity={0.6}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} stroke="#e0e0e0" />
                      <XAxis 
                        dataKey="dept" 
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
                        label={{ value: '%', angle: -90, position: 'insideLeft', fontSize: 10 }}
                      />
                      <Tooltip 
                        formatter={(value) => [`${value}%`, 'Attendance']}
                        contentStyle={{ 
                          borderRadius: 8, 
                          border: 'none',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }}
                        cursor={{ fill: 'rgba(76,175,80,0.1)' }}
                      />
                      <Bar 
                        dataKey="attendance" 
                        fill="url(#attendDeptGradient)"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={80}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* FACULTY TO STUDENT RATIO */}
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      Faculty-Student Distribution
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Faculty count vs student enrollment by department
                    </Typography>
                  </Box>
                  <Chip label="All Departments" size="small" color="info" variant="outlined" />
                </Box>
                <Box sx={{ width: '100%', height: { xs: 300, sm: 350, md: 400 }, minHeight: 300, minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={facultyDistribution} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="facultyGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={theme.palette.info.main} stopOpacity={1}/>
                          <stop offset="100%" stopColor={theme.palette.info.main} stopOpacity={0.6}/>
                        </linearGradient>
                        <linearGradient id="studentGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={theme.palette.warning.main} stopOpacity={1}/>
                          <stop offset="100%" stopColor={theme.palette.warning.main} stopOpacity={0.6}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} stroke="#e0e0e0" />
                      <XAxis 
                        dataKey="department" 
                        stroke="#666" 
                        style={{ fontSize: '0.75rem' }}
                        tickLine={false}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        yAxisId="left"
                        stroke="#666" 
                        style={{ fontSize: '0.75rem' }}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                        tick={{ fontSize: 12 }}
                        label={{ value: 'Faculty', angle: -90, position: 'insideLeft', fontSize: 10 }}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        stroke="#666" 
                        style={{ fontSize: '0.75rem' }}
                        tickLine={false}
                        axisLine={false}
                        width={50}
                        tick={{ fontSize: 12 }}
                        label={{ value: 'Students', angle: 90, position: 'insideRight', fontSize: 10 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: 8, 
                          border: 'none',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }}
                        cursor={{ fill: 'rgba(33,150,243,0.1)' }}
                      />
                      <Legend />
                      <Bar 
                        yAxisId="left"
                        dataKey="faculty" 
                        fill="url(#facultyGrad)"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={60}
                        name="Faculty Members"
                      />
                      <Bar 
                        yAxisId="right"
                        dataKey="students" 
                        fill="url(#studentGrad)"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={60}
                        name="Students Enrolled"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Export Options */}
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
              Export Options
            </Typography>
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 2 }}>
              <Button variant="contained" color="error" startIcon={<PictureAsPdf />} onClick={handleExportPdf}>
                Download PDF Report
              </Button>
              <Button variant="outlined" startIcon={<Download />} onClick={handleExportExcel}>
                Export as Excel
              </Button>
              <Button variant="outlined" startIcon={<Download />} onClick={handleExportCsv}>
                Export as CSV
              </Button>
              <Button variant="outlined" startIcon={<Print />} onClick={handlePrintReport}>
                Print Page
              </Button>
              <Button variant="outlined" startIcon={<Share />} onClick={handleShareReport}>
                Share Summary
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {toast.open && (
          <Alert
            severity={toast.severity}
            onClose={() => setToast({ ...toast, open: false })}
            sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}
          >
            {toast.message}
          </Alert>
        )}
      </Box>
    </motion.div>
  );
};

export default AdminReports;

