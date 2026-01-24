import { useState } from 'react';
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
  useTheme,
  alpha,
} from '@mui/material';
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
import PageTransition from '../../components/Common/PageTransition';
import { fadeInUp, staggerContainer } from '../../utils/animations';

const gradeDistribution = [
  { grade: 'A', count: 12, percentage: 26.7 },
  { grade: 'B', count: 18, percentage: 40.0 },
  { grade: 'C', count: 9, percentage: 20.0 },
  { grade: 'D', count: 4, percentage: 8.9 },
  { grade: 'F', count: 2, percentage: 4.4 },
];

const attendanceTrend = [
  { week: 'Week 1', attendance: 92 },
  { week: 'Week 2', attendance: 88 },
  { week: 'Week 3', attendance: 90 },
  { week: 'Week 4', attendance: 85 },
  { week: 'Week 5', attendance: 87 },
  { week: 'Week 6', attendance: 89 },
];

const assignmentStats = [
  { name: 'On Time', value: 72, color: '#4caf50' },
  { name: 'Late', value: 18, color: '#ff9800' },
  { name: 'Missing', value: 10, color: '#f44336' },
];

const Reports = () => {
  const theme = useTheme();
  const [course, setCourse] = useState('CS-301');
  const [range, setRange] = useState('last-30');

  const stats = [
    {
      title: 'Total Students',
      value: '85',
      change: '+5 this month',
      trend: 'up',
      icon: People,
      color: theme.palette.primary.main,
    },
    {
      title: 'Avg Attendance',
      value: '88.5%',
      change: '+2.3%',
      trend: 'up',
      icon: CheckCircle,
      color: theme.palette.success.main,
    },
    {
      title: 'Assignment Completion',
      value: '72%',
      change: '-5.2%',
      trend: 'down',
      icon: Assignment,
      color: theme.palette.warning.main,
    },
    {
      title: 'Class Average',
      value: 'B+',
      change: '+0.2 GPA',
      trend: 'up',
      icon: School,
      color: theme.palette.info.main,
    },
  ];

  return (
    <PageTransition>
      <Box className="page-container">
        <PageHeader
          icon={TrendingUp}
          title="Course Analytics & Reports"
          subtitle="Generate performance insights and track student progress"
          gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
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
              <Card sx={{ height: '100%', borderRadius: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Box display="flex" alignItems="flex-start" justifyContent="space-between">
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h4" component="div" fontWeight="bold" sx={{ mb: 0.5 }}>
                        {stat.value}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {stat.title}
                      </Typography>
                      <Chip
                        icon={stat.trend === 'up' ? <TrendingUp /> : <TrendingDown />}
                        label={stat.change}
                        size="small"
                        color={stat.trend === 'up' ? 'success' : 'error'}
                        sx={{ mt: 1 }}
                      />
                    </Box>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        backgroundColor: stat.color,
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <stat.icon sx={{ fontSize: 24 }} />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
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
                      <MenuItem value="CS-301">CS-301 - Data Structures</MenuItem>
                      <MenuItem value="CS-201">CS-201 - OOP</MenuItem>
                      <MenuItem value="CS-101">CS-101 - Intro to Computing</MenuItem>
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
                  <Stack direction="row" spacing={1}>
                    <Button variant="outlined" startIcon={<Download />} size="small">
                      Export
                    </Button>
                    <Button variant="outlined" startIcon={<Print />} size="small">
                      Print
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* GRADE DISTRIBUTION */}
          <Grid size={{ xs: 12, md: 8 }} component={motion.div} variants={fadeInUp}>
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
                  <Chip label="Active Semester" size="small" color="primary" variant="outlined" />
                </Stack>
                <Box sx={{ height: { xs: 280, sm: 320 }, minHeight: 280, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={gradeDistribution} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
                        style={{ fontSize: '0.85rem' }}
                        tickLine={false}
                      />
                      <YAxis 
                        stroke="#666" 
                        style={{ fontSize: '0.85rem' }}
                        tickLine={false}
                        axisLine={false}
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
          <Grid size={{ xs: 12, md: 4 }} component={motion.div} variants={fadeInUp}>
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
                  <Chip label="Current" size="small" color="success" variant="outlined" />
                </Stack>
                <Box sx={{ height: { xs: 220, sm: 250 }, minHeight: 220, width: '100%', display: 'flex', justifyContent: 'center' }}>
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
                        innerRadius={window.innerWidth < 600 ? 45 : 60}
                        outerRadius={window.innerWidth < 600 ? 75 : 90}
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
                      Weekly attendance rate over time
                    </Typography>
                  </Box>
                  <Chip label="Last 8 Weeks" size="small" color="success" variant="outlined" />
                </Stack>
                <Box sx={{ height: { xs: 280, sm: 320 }, minHeight: 280, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={attendanceTrend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
                        style={{ fontSize: '0.85rem' }}
                        tickLine={false}
                      />
                      <YAxis 
                        domain={[0, 100]} 
                        stroke="#666" 
                        style={{ fontSize: '0.85rem' }}
                        tickLine={false}
                        axisLine={false}
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
        </Grid>
      </Box>
    </PageTransition>
  );
};

export default Reports;
