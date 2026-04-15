import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Paper,
  Stack,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  MenuBook as BookIcon,
  People as PeopleIcon,
  Assessment as AssessmentIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Category as CategoryIcon,
  Inventory as InventoryIcon,
} from '@mui/icons-material';
import PageHeader from '../../components/Common/PageHeader';
import StatCard from '../../components/Common/StatCard';
import { motion } from 'framer-motion';
import { pageTransition } from '../../utils/animations';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { libraryAPI } from '../../api/library';

const LibrarianReports = () => {
  const [reportType, setReportType] = useState('overview');
  const [timePeriod, setTimePeriod] = useState('month');

  const [stats, setStats] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [circulationData, setCirculationData] = useState([]);
  const [topBooks, setTopBooks] = useState([]);
  const [memberData, setMemberData] = useState([]);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await libraryAPI.getReports();
        const d = res.data;
        if (d?.stats) setStats(d.stats);
        if (d?.category_data || d?.categoryData) setCategoryData(d.category_data || d.categoryData || []);
        if (d?.circulation_data || d?.circulationData) setCirculationData(d.circulation_data || d.circulationData || []);
        if (d?.top_books || d?.topBooks) setTopBooks(d.top_books || d.topBooks || []);
        if (d?.member_data || d?.memberData) setMemberData(d.member_data || d.memberData || []);
      } catch (e) { console.error(e); }
    };
    fetchReports();
  }, []);

  const COLORS = ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#607D8B'];

  return (
    <motion.div {...pageTransition}>
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <PageHeader
          title="Library Reports & Analytics"
          subtitle="Comprehensive insights into library operations and usage"
          action={
            <Stack direction="row" spacing={2}>
              <Button variant="outlined" startIcon={<DownloadIcon />}>
                Export PDF
              </Button>
              <Button variant="outlined" startIcon={<PrintIcon />}>
                Print Report
              </Button>
            </Stack>
          }
        />

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {stats.map((stat, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
              <StatCard {...stat} />
            </Grid>
          ))}
        </Grid>

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Report Type</InputLabel>
                  <Select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    label="Report Type"
                  >
                    <MenuItem value="overview">Overview</MenuItem>
                    <MenuItem value="circulation">Circulation</MenuItem>
                    <MenuItem value="collection">Collection</MenuItem>
                    <MenuItem value="members">Members</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Time Period</InputLabel>
                  <Select
                    value={timePeriod}
                    onChange={(e) => setTimePeriod(e.target.value)}
                    label="Time Period"
                  >
                    <MenuItem value="week">Last Week</MenuItem>
                    <MenuItem value="month">Last Month</MenuItem>
                    <MenuItem value="quarter">Last Quarter</MenuItem>
                    <MenuItem value="year">Last Year</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Grid container spacing={3}>
          {/* Monthly Circulation Trends */}
          <Grid size={{ xs: 12 }}>
            <Card sx={{ 
              height: '100%',
              background: 'linear-gradient(135deg, rgba(33,150,243,0.05) 0%, rgba(156,39,176,0.05) 100%)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              transition: 'all 0.3s ease',
              '&:hover': { boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }
            }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Monthly Circulation Trends
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Issued, returned, and reserved books over time
                    </Typography>
                  </Box>
                  <Chip label="Last 6 Months" size="small" color="primary" variant="outlined" />
                </Stack>
                <Box sx={{ width: '100%', height: { xs: 280, sm: 320 }, mt: 2 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={circulationData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorIssued" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2196F3" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#2196F3" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorReturned" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#4CAF50" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" opacity={0.5} />
                      <XAxis 
                        dataKey="month" 
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
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="circle"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="issued" 
                        stroke="#2196F3" 
                        strokeWidth={3} 
                        dot={{ fill: '#2196F3', strokeWidth: 2, r: 5 }}
                        activeDot={{ r: 7, strokeWidth: 0 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="returned" 
                        stroke="#4CAF50" 
                        strokeWidth={3} 
                        dot={{ fill: '#4CAF50', strokeWidth: 2, r: 5 }}
                        activeDot={{ r: 7, strokeWidth: 0 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="reserved" 
                        stroke="#FF9800" 
                        strokeWidth={3} 
                        dot={{ fill: '#FF9800', strokeWidth: 2, r: 5 }}
                        activeDot={{ r: 7, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Collection by Category */}
          <Grid size={{ xs: 12 }}>
            <Card sx={{ 
              height: '100%',
              background: 'linear-gradient(135deg, rgba(156,39,176,0.05) 0%, rgba(233,30,99,0.05) 100%)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              transition: 'all 0.3s ease',
              '&:hover': { boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }
            }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="h6" fontWeight="bold">
                    Collection by Category
                  </Typography>
                  <Chip label="Total: {categoryData.reduce((a,b) => a + b.value, 0)}" size="small" color="secondary" variant="outlined" />
                </Stack>
                <Box sx={{ width: '100%', height: { xs: 280, sm: 320 }, mt: 1 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        {categoryData.map((entry, index) => (
                          <linearGradient key={`gradient-${index}`} id={`gradient${index}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                            <stop offset="100%" stopColor={entry.color} stopOpacity={0.6} />
                          </linearGradient>
                        ))}
                      </defs>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={{ stroke: '#666', strokeWidth: 1 }}
                        label={({ name, percent }) => `${name}\n${(percent * 100).toFixed(0)}%`}
                        outerRadius={window.innerWidth < 600 ? 70 : 90}
                        innerRadius={window.innerWidth < 600 ? 40 : 50}
                        fill="#8884d8"
                        dataKey="value"
                        paddingAngle={2}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={`url(#gradient${index})`}
                            stroke="#fff"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: 8, 
                          border: 'none', 
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          fontSize: '0.875rem'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Top Borrowed Books */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Top Borrowed Books
                </Typography>
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  Most popular books this month
                </Typography>
                <Stack spacing={2} sx={{ mt: 3 }}>
                  {topBooks.map((book, index) => (
                    <Paper key={index} elevation={0} sx={{ p: 2, backgroundColor: 'action.hover', borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                            {book.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            by {book.author}
                          </Typography>
                        </Box>
                        <Chip label={`${book.borrows} borrows`} size="small" color="primary" />
                      </Box>
                      <Chip label={book.category} size="small" variant="outlined" />
                      <LinearProgress
                        variant="determinate"
                        value={(book.borrows / 50) * 100}
                        sx={{ mt: 1, height: 6, borderRadius: 3 }}
                      />
                    </Paper>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Member Statistics */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Member Statistics
                </Typography>
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  Distribution of library members by type
                </Typography>
                <Stack spacing={2} sx={{ mt: 3 }}>
                  {memberData.map((member, index) => (
                    <Paper key={index} elevation={0} sx={{ p: 2, backgroundColor: 'action.hover', borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {member.type}
                        </Typography>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Typography variant="body2" color="text.secondary">
                            {member.count} members
                          </Typography>
                          <Chip label={`${member.percentage}%`} size="small" color="primary" />
                        </Stack>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={member.percentage}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Paper>
                  ))}
                </Stack>

                {/* Summary */}
                <Paper elevation={0} sx={{ p: 2, mt: 3, backgroundColor: 'primary.main', color: 'white', borderRadius: 2 }}>
                  <Typography variant="h4" fontWeight="bold" gutterBottom>
                    {memberData.reduce((sum, m) => sum + m.count, 0)}
                  </Typography>
                  <Typography variant="body2">
                    Total Active Library Members
                  </Typography>
                </Paper>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </motion.div>
  );
};

export default LibrarianReports;
