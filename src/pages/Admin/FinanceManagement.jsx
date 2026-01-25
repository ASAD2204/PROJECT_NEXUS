import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stack,
  Tabs,
  Tab,
  Paper,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  alpha,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { 
  Search, 
  FilterList, 
  Download, 
  Assessment, 
  TrendingUp, 
  AttachMoney, 
  Warning, 
  Receipt,
  Save,
  Edit,
  Email,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import PageHeader from '../../components/Common/PageHeader';
import PageTransition from '../../components/Common/PageTransition';
import StatCard from '../../components/Common/StatCard';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { fadeInUp, staggerContainer } from '../../utils/animations';

const mockLedger = [
  { id: 'TXN-1001', student: 'Muhammad Asad', rollNo: 'CS-2023-001', amount: 45000, status: 'Paid', date: '2026-01-10', method: 'Card', semester: 'Fall 2025' },
  { id: 'TXN-1002', student: 'Ayesha Khan', rollNo: 'BBA-2022-045', amount: 2000, status: 'Paid', date: '2026-01-12', method: 'Bank', semester: 'Fall 2025' },
  { id: 'TXN-1003', student: 'Ali Ahmed', rollNo: 'ENG-2023-112', amount: 45000, status: 'Overdue', date: '2025-12-10', method: 'Voucher', semester: 'Fall 2025' },
  { id: 'TXN-1004', student: 'Hassan Raza', rollNo: 'CS-2024-089', amount: 45000, status: 'Unpaid', date: '2025-11-25', method: 'Voucher', semester: 'Fall 2025' },
  { id: 'TXN-1005', student: 'Sara Khan', rollNo: 'BBA-2023-067', amount: 45000, status: 'Paid', date: '2026-01-19', method: 'Card', semester: 'Fall 2025' },
  { id: 'TXN-1006', student: 'Bilal Ahmad', rollNo: 'CS-2023-045', amount: 45000, status: 'Overdue', date: '2025-12-05', method: 'Bank', semester: 'Fall 2025' },
  { id: 'TXN-1007', student: 'Fatima Noor', rollNo: 'ENG-2024-023', amount: 45000, status: 'Unpaid', date: '2025-12-01', method: 'Voucher', semester: 'Fall 2025' },
];

const FinanceManagement = () => {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [openFeeDialog, setOpenFeeDialog] = useState(false);
  const [feeStructure, setFeeStructure] = useState({
    tuitionFee: 45000,
    labFee: 5000,
    libraryFee: 2000,
    sportsFee: 1500,
    examFee: 3000,
  });

  // Calculate statistics
  const stats = useMemo(() => {
    const totalRevenue = mockLedger
      .filter(t => t.status === 'Paid')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const pendingDues = mockLedger
      .filter(t => t.status === 'Unpaid' || t.status === 'Overdue')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const overdueCount = mockLedger.filter(t => t.status === 'Overdue').length;
    const unpaidCount = mockLedger.filter(t => t.status === 'Unpaid').length;
    
    return { totalRevenue, pendingDues, overdueCount, unpaidCount };
  }, []);

  // Get defaulters (unpaid for > 30 days)
  const defaulters = useMemo(() => {
    const today = new Date();
    return mockLedger.filter(t => {
      if (t.status === 'Overdue' || t.status === 'Unpaid') {
        const transactionDate = new Date(t.date);
        const daysDiff = Math.floor((today - transactionDate) / (1000 * 60 * 60 * 24));
        return daysDiff > 30;
      }
      return false;
    });
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery) return mockLedger;
    return mockLedger.filter(
      (item) =>
        item.student.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.rollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.status.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const handleGenerateReport = () => {
    showSnackbar('Monthly report generated successfully', 'success');
  };

  const handleSaveFeeStructure = () => {
    showSnackbar('Fee structure updated successfully', 'success');
    setOpenFeeDialog(false);
  };

  const handleSendReminder = (student) => {
    showSnackbar(`Reminder sent to ${student}`, 'success');
  };

  return (
    <PageTransition>
      <Box className="page-container">
        <PageHeader
          title="Finance Management"
          subtitle="Track transactions, dues, and manage fee structure"
        />

        {/* Summary Statistics */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Total Revenue"
              value={`₨ ${(stats.totalRevenue / 1000000).toFixed(1)}M`}
              icon={TrendingUp}
              color="success"
              trend={{ direction: 'up', value: '+15.3%' }}
              subtitle="This Month"
              tooltip="Total revenue collected from student fee payments this month"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Pending Dues"
              value={`₨ ${(stats.pendingDues / 1000).toFixed(0)}K`}
              icon={AttachMoney}
              color="warning"
              subtitle={`${stats.unpaidCount + stats.overdueCount} Students`}
              tooltip="Total outstanding fees from unpaid and overdue students"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Overdue Payments"
              value={stats.overdueCount}
              icon={Warning}
              color="error"
              subtitle="Requires Action"
              tooltip="Number of students with overdue payment status requiring immediate attention"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Transactions"
              value={mockLedger.length}
              icon={Receipt}
              color="info"
              subtitle="This Semester"
              tooltip="Total number of financial transactions recorded this semester"
            />
          </Grid>
        </Grid>

        {/* Tabs */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)}>
              <Tab label="Transaction Log" />
              <Tab label={`Defaulters (${defaulters.length})`} />
              <Tab label="Fee Structure" />
            </Tabs>
          </CardContent>
        </Card>

        <Grid
          container
          spacing={3}
          component={motion.div}
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {/* Tab 1: Transaction Log */}
          {activeTab === 0 && (
            <Grid size={12} component={motion.div} variants={fadeInUp}>
              <Card>
                <CardContent>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
                    <TextField
                      fullWidth
                      placeholder="Search by student, roll number, transaction ID, or status..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search />
                          </InputAdornment>
                        ),
                      }}
                    />
                    <Button variant="outlined" startIcon={<FilterList />}>
                      Filter
                    </Button>
                    <Button variant="contained" startIcon={<Assessment />} onClick={handleGenerateReport}>
                      Generate Report
                    </Button>
                  </Stack>

                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Transaction ID</TableCell>
                          <TableCell>Student</TableCell>
                          <TableCell>Roll Number</TableCell>
                          <TableCell align="right">Amount (PKR)</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell>Method</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filtered.map((row) => (
                          <TableRow key={row.id} hover>
                            <TableCell>{row.id}</TableCell>
                            <TableCell>{row.student}</TableCell>
                            <TableCell>{row.rollNo}</TableCell>
                            <TableCell align="right">{row.amount.toLocaleString()}</TableCell>
                            <TableCell>
                              <Chip
                                label={row.status}
                                size="small"
                                color={row.status === 'Paid' ? 'success' : row.status === 'Overdue' ? 'error' : 'warning'}
                              />
                            </TableCell>
                            <TableCell>{row.date}</TableCell>
                            <TableCell>{row.method}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Tab 2: Defaulters List */}
          {activeTab === 1 && (
            <Grid size={12} component={motion.div} variants={fadeInUp}>
              <Card>
                <CardContent>
                  <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        Students with Unpaid Dues (&gt; 30 Days)
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {defaulters.length} students require immediate attention
                      </Typography>
                    </Box>
                    <Button variant="contained" color="error" startIcon={<Email />}>
                      Send Bulk Reminder
                    </Button>
                  </Box>

                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Student Name</TableCell>
                          <TableCell>Roll Number</TableCell>
                          <TableCell align="right">Amount Due (PKR)</TableCell>
                          <TableCell>Due Date</TableCell>
                          <TableCell>Days Overdue</TableCell>
                          <TableCell>Semester</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {defaulters.map((row) => {
                          const daysOverdue = Math.floor((new Date() - new Date(row.date)) / (1000 * 60 * 60 * 24));
                          return (
                            <TableRow key={row.id} hover>
                              <TableCell>{row.student}</TableCell>
                              <TableCell>{row.rollNo}</TableCell>
                              <TableCell align="right">
                                <Typography fontWeight="bold" color="error">
                                  {row.amount.toLocaleString()}
                                </Typography>
                              </TableCell>
                              <TableCell>{row.date}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={`${daysOverdue} days`} 
                                  size="small" 
                                  color="error"
                                />
                              </TableCell>
                              <TableCell>{row.semester}</TableCell>
                              <TableCell>
                                <IconButton 
                                  size="small" 
                                  color="primary"
                                  onClick={() => handleSendReminder(row.student)}
                                >
                                  <Email />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Tab 3: Fee Structure */}
          {activeTab === 2 && (
            <Grid size={12} component={motion.div} variants={fadeInUp}>
              <Card>
                <CardContent>
                  <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        Semester Fee Structure
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Configure tuition and other fees per semester
                      </Typography>
                    </Box>
                    <Button 
                      variant="contained" 
                      startIcon={<Edit />}
                      onClick={() => setOpenFeeDialog(true)}
                    >
                      Edit Structure
                    </Button>
                  </Box>

                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Paper 
                        elevation={0} 
                        sx={{ 
                          p: 3, 
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 2 
                        }}
                      >
                        <Stack spacing={2}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body1">Tuition Fee</Typography>
                            <Typography variant="h6" fontWeight="bold">
                              ₨ {feeStructure.tuitionFee.toLocaleString()}
                            </Typography>
                          </Box>
                          <Divider />
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body1">Lab Fee</Typography>
                            <Typography variant="h6" fontWeight="bold">
                              ₨ {feeStructure.labFee.toLocaleString()}
                            </Typography>
                          </Box>
                          <Divider />
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body1">Library Fee</Typography>
                            <Typography variant="h6" fontWeight="bold">
                              ₨ {feeStructure.libraryFee.toLocaleString()}
                            </Typography>
                          </Box>
                          <Divider />
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body1">Sports Fee</Typography>
                            <Typography variant="h6" fontWeight="bold">
                              ₨ {feeStructure.sportsFee.toLocaleString()}
                            </Typography>
                          </Box>
                          <Divider />
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body1">Exam Fee</Typography>
                            <Typography variant="h6" fontWeight="bold">
                              ₨ {feeStructure.examFee.toLocaleString()}
                            </Typography>
                          </Box>
                          <Divider />
                          <Box 
                            sx={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              pt: 2,
                              backgroundColor: alpha(theme.palette.primary.main, 0.1),
                              p: 2,
                              borderRadius: 1
                            }}
                          >
                            <Typography variant="h6" fontWeight="bold">Total Per Semester</Typography>
                            <Typography variant="h5" fontWeight="bold" color="primary">
                              ₨ {Object.values(feeStructure).reduce((a, b) => a + b, 0).toLocaleString()}
                            </Typography>
                          </Box>
                        </Stack>
                      </Paper>
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                      <Paper 
                        elevation={0} 
                        sx={{ 
                          p: 3, 
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 2,
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center'
                        }}
                      >
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                          Fee Structure Guidelines
                        </Typography>
                        <Stack spacing={2}>
                          <Typography variant="body2" color="text.secondary">
                            • Tuition fees cover all academic courses and instruction
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            • Lab fees apply only to students enrolled in lab-based courses
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            • Library fee provides access to physical and digital resources
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            • Sports fee covers athletic facilities and intramural programs
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            • Exam fee includes mid-term and final examinations
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontStyle: 'italic' }}>
                            Note: Fee structure can be updated at the start of each semester
                          </Typography>
                        </Stack>
                      </Paper>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>

        {/* Edit Fee Structure Dialog */}
        <Dialog open={openFeeDialog} onClose={() => setOpenFeeDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Edit Fee Structure</DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 2 }}>
              <TextField
                label="Tuition Fee (PKR)"
                type="number"
                fullWidth
                value={feeStructure.tuitionFee}
                onChange={(e) => setFeeStructure({ ...feeStructure, tuitionFee: parseInt(e.target.value) })}
              />
              <TextField
                label="Lab Fee (PKR)"
                type="number"
                fullWidth
                value={feeStructure.labFee}
                onChange={(e) => setFeeStructure({ ...feeStructure, labFee: parseInt(e.target.value) })}
              />
              <TextField
                label="Library Fee (PKR)"
                type="number"
                fullWidth
                value={feeStructure.libraryFee}
                onChange={(e) => setFeeStructure({ ...feeStructure, libraryFee: parseInt(e.target.value) })}
              />
              <TextField
                label="Sports Fee (PKR)"
                type="number"
                fullWidth
                value={feeStructure.sportsFee}
                onChange={(e) => setFeeStructure({ ...feeStructure, sportsFee: parseInt(e.target.value) })}
              />
              <TextField
                label="Exam Fee (PKR)"
                type="number"
                fullWidth
                value={feeStructure.examFee}
                onChange={(e) => setFeeStructure({ ...feeStructure, examFee: parseInt(e.target.value) })}
              />
              <Paper 
                sx={{ 
                  p: 2, 
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  display: 'flex',
                  justifyContent: 'space-between'
                }}
              >
                <Typography variant="h6">Total:</Typography>
                <Typography variant="h6" fontWeight="bold" color="primary">
                  ₨ {Object.values(feeStructure).reduce((a, b) => a + b, 0).toLocaleString()}
                </Typography>
              </Paper>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenFeeDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveFeeStructure} variant="contained" startIcon={<Save />}>
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageTransition>
  );
};

export default FinanceManagement;
