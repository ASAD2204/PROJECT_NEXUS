import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { financeAPI } from '../../api/finance';
import { sisAPI } from '../../api/sis';
import { MenuItem, FormControl, InputLabel, Select } from '@mui/material';

const feeStructureDefaults = {
  tuitionFee: 45000,
  labFee: 5000,
  libraryFee: 2000,
  sportsFee: 1500,
  examFee: 3000,
};

const feeHeadTitleByKey = {
  tuitionFee: 'Tuition Fee',
  labFee: 'Lab Fee',
  libraryFee: 'Library Fee',
  sportsFee: 'Sports Fee',
  examFee: 'Exam Fee',
};


const normalizeFeeStructure = (feeHeads) => {
  const structure = { ...feeStructureDefaults };
  (Array.isArray(feeHeads) ? feeHeads : []).forEach((head) => {
    const title = String(head?.title || '').trim().toLowerCase();
    const key = Object.entries(feeHeadTitleByKey).find(([, label]) => label.toLowerCase() === title)?.[0];
    const amount = Number(head?.default_amount);
    if (key && Number.isFinite(amount)) {
      structure[key] = amount;
    }
  });
  return structure;
};

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

const FinanceManagement = () => {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [openFeeDialog, setOpenFeeDialog] = useState(false);
  const [ledger, setLedger] = useState([]);
  const [feeHeads, setFeeHeads] = useState([]);
  const [granularFees, setGranularFees] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [programsList, setProgramsList] = useState([]);
  const [openGranularDialog, setOpenGranularDialog] = useState(false);
  const [granularFormData, setGranularFormData] = useState({
    dept_id: '',
    program_id: '',
    semester_id: '',
    head_id: '',
    amount: '',
  });
  const [studentScholarships, setStudentScholarships] = useState([]);
  const [openScholarshipDialog, setOpenScholarshipDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [scholarshipValue, setScholarshipValue] = useState(0);
  const [scholarshipFilters, setScholarshipFilters] = useState({
    dept_id: '',
    program_id: '',
    semester_id: '',
    current_only: true,
  });

  const handleUpdateScholarship = async () => {
    if (!selectedStudent?.student_id) {
      showSnackbar('Select a student before saving a scholarship.', 'error');
      return;
    }

    try {
      await sisAPI.updateStudent(selectedStudent.student_id, {
        scholarship_percentage: Number(scholarshipValue),
      });
      showSnackbar('Scholarship updated successfully', 'success');
      setOpenScholarshipDialog(false);
      await loadFinanceData();
    } catch (error) {
      showSnackbar('Failed to update scholarship', 'error');
    }
  };

  const loadFinanceData = useCallback(async () => {
    try {
      const [headsRes, granularRes, ledgerRes, deptsRes, progsRes, studentsRes] = await Promise.allSettled([
        financeAPI.getFeeHeads(),
        financeAPI.getFeeStructure(),
        financeAPI.getLedger(),
        sisAPI.getDepartments(),
        sisAPI.getPrograms(),
        sisAPI.getStudents(),
      ]);

      const feeHeadRows = headsRes.status === 'fulfilled'
        ? unwrapCollection(headsRes.value.data, ['fee_heads', 'feeHeads'])
        : [];
      const granularRows = granularRes.status === 'fulfilled'
        ? unwrapCollection(granularRes.value.data, ['fee_structure', 'feeStructures', 'structures'])
        : [];
      const ledgerRows = ledgerRes.status === 'fulfilled'
        ? unwrapCollection(ledgerRes.value.data, ['transactions', 'ledger'])
        : [];
      const departmentRows = deptsRes.status === 'fulfilled'
        ? unwrapCollection(deptsRes.value.data, ['departments'])
        : [];
      const programRows = progsRes.status === 'fulfilled'
        ? unwrapCollection(progsRes.value.data, ['programs'])
        : [];
      const studentRows = studentsRes.status === 'fulfilled'
        ? unwrapCollection(studentsRes.value.data, ['students'])
        : [];

      setFeeHeads(feeHeadRows);
      setGranularFees(granularRows);
      setLedger(ledgerRows);
      setDepartmentsList(departmentRows);
      setProgramsList(programRows);
      setStudentScholarships(studentRows);

      if (feeHeadRows.length > 0) {
        setFeeStructure(normalizeFeeStructure(feeHeadRows));
      }

      const failureCount = [headsRes, granularRes, ledgerRes, deptsRes, progsRes, studentsRes]
        .filter((result) => result.status === 'rejected').length;
      if (failureCount > 0) {
        showSnackbar(
          failureCount === 6 ? 'Failed to load financial data' : 'Loaded financial data with partial failures',
          failureCount === 6 ? 'error' : 'warning'
        );
      }
    } catch (e) {
      console.error(e);
      showSnackbar('Failed to load financial data', 'error');
    }
  }, [showSnackbar]);

  useEffect(() => {
    loadFinanceData();
  }, [loadFinanceData]);


  const [feeStructure, setFeeStructure] = useState({ ...feeStructureDefaults });

  // Calculate statistics
  const stats = useMemo(() => {
    const totalRevenue = ledger
      .filter(t => t.status === 'Paid')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const pendingDues = ledger
      .filter(t => t.status === 'Unpaid' || t.status === 'Overdue')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const overdueCount = ledger.filter(t => t.status === 'Overdue').length;
    const unpaidCount = ledger.filter(t => t.status === 'Unpaid').length;
    
    return { totalRevenue, pendingDues, overdueCount, unpaidCount };
  }, [ledger]);

  // Get defaulters (unpaid for > 30 days)
  const defaulters = useMemo(() => {
    const today = new Date();
    return ledger.filter(t => {
      if (t.status === 'Overdue' || t.status === 'Unpaid') {
        const transactionDate = new Date(t.date);
        const daysDiff = Math.floor((today - transactionDate) / (1000 * 60 * 60 * 24));
        return daysDiff > 30;
      }
      return false;
    });
  }, [ledger]);

  const filtered = useMemo(() => {
    if (!searchQuery) return ledger;
    return ledger.filter(
      (item) =>
        item.student?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.rollNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.id?.toLowerCase?.()?.includes(searchQuery.toLowerCase()) ||
        item.status?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, ledger]);

  const filteredScholarshipStudents = useMemo(() => {
    return studentScholarships.filter((student) => {
      const matchesCurrent = !scholarshipFilters.current_only || Number(student.current_semester || 0) > 0;
      const matchesProgram = !scholarshipFilters.program_id || String(student.program_id) === String(scholarshipFilters.program_id);
      const matchesSemester = !scholarshipFilters.semester_id || String(student.current_semester) === String(scholarshipFilters.semester_id);
      const program = programsList.find((p) => String(p.program_id) === String(student.program_id));
      const matchesDept = !scholarshipFilters.dept_id || String(program?.dept_id) === String(scholarshipFilters.dept_id);
      return matchesCurrent && matchesProgram && matchesSemester && matchesDept;
    });
  }, [studentScholarships, scholarshipFilters, programsList]);

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

  const buildFinanceReportRows = () => {
    const transactionRows = filtered.map((row) => [
      'Transaction Log',
      row.id,
      row.student,
      row.rollNo,
      row.amount,
      row.status,
      row.date,
      row.method || '-',
    ]);

    const defaulterRows = defaulters.map((row) => {
      const daysOverdue = Math.floor((new Date() - new Date(row.date)) / (1000 * 60 * 60 * 24));
      return [
        'Defaulters',
        row.id,
        row.student,
        row.rollNo,
        row.amount,
        row.status,
        row.date,
        `${daysOverdue} days`,
      ];
    });

    const feeRows = Object.entries(feeStructure).map(([key, amount]) => [
      'Fee Structure',
      feeHeadTitleByKey[key] || key,
      amount,
      'Current semester',
    ]);

    const summaryRows = [
      ['Summary', 'Total Revenue', stats.totalRevenue, 'Paid transactions only'],
      ['Summary', 'Pending Dues', stats.pendingDues, 'Unpaid + overdue'],
      ['Summary', 'Overdue Payments', stats.overdueCount, 'Requires action'],
      ['Summary', 'Transactions', ledger.length, 'Total ledger rows'],
    ];

    return [...summaryRows, ...transactionRows, ...defaulterRows, ...feeRows];
  };

  const handleGenerateReport = async () => {
    try {
      const response = await financeAPI.exportLedger();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `financial_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showSnackbar('Finance ledger exported successfully', 'success');
    } catch (error) {
      showSnackbar(error.response?.data?.detail || 'Failed to export ledger', 'error');
    }
  };

  const handleSaveFeeStructure = async () => {
    try {
      const mutations = Object.entries(feeHeadTitleByKey).map(([key, title]) => {
        const payload = {
          title,
          default_amount: Number(feeStructure[key]) || 0,
        };
        const existing = feeHeads.find(
          (head) => String(head?.title || '').trim().toLowerCase() === title.toLowerCase()
        );

        if (existing?.head_id) {
          return financeAPI.updateFeeHead(existing.head_id, payload);
        }

        return financeAPI.createFeeHead(payload);
      });

      await Promise.all(mutations);
      await loadFinanceData();
      showSnackbar('Fee structure updated successfully', 'success');
      setOpenFeeDialog(false);
    } catch (error) {
      showSnackbar(
        error.response?.data?.detail || 'Failed to update fee structure', 
        'error'
      );
    }
  };

  const handleSendReminder = async (student) => {
    try {
      await financeAPI.sendPaymentReminder(student.rollNo || student.id, student.amount);
      showSnackbar(`Reminder sent to ${student.student || student.name}`, 'success');
    } catch (error) {
      showSnackbar(
        error.response?.data?.detail || `Failed to send reminder to ${student.student || student.name}`,
        'error'
      );
    }
  };

  const handleSaveGranularFee = async () => {
    try {
      if (!granularFormData.head_id || !granularFormData.amount) {
        showSnackbar('Fee head and amount are required', 'error');
        return;
      }

      const payload = {
        dept_id: granularFormData.dept_id ? Number(granularFormData.dept_id) : null,
        program_id: granularFormData.program_id ? Number(granularFormData.program_id) : null,
        semester_id: granularFormData.semester_id ? Number(granularFormData.semester_id) : null,
        head_id: Number(granularFormData.head_id),
        amount: Number(granularFormData.amount),
      };

      await financeAPI.createFeeStructure(payload);
      await loadFinanceData();
      showSnackbar('Granular fee added successfully', 'success');
      setOpenGranularDialog(false);
      setGranularFormData({ dept_id: '', program_id: '', semester_id: '', head_id: '', amount: '' });
    } catch (error) {
      showSnackbar(error.response?.data?.detail || 'Failed to save granular fee', 'error');
    }
  };

  const handleDeleteGranularFee = async (id) => {
    if (!window.confirm('Are you sure you want to delete this granular fee setting?')) return;
    try {
      await financeAPI.deleteFeeStructure(id);
      await loadFinanceData();
      showSnackbar('Fee setting removed', 'success');
    } catch (error) {
      showSnackbar('Failed to delete', 'error');
    }
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
              value={ledger.length}
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
              <Tab label="Scholarships" />
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
                  <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        Granular Fee Structure
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Configure fees by department, program, and semester
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <Button 
                        variant="outlined" 
                        startIcon={<Edit />}
                        onClick={() => setOpenFeeDialog(true)}
                      >
                        Global Heads
                      </Button>
                      <Button 
                        variant="contained" 
                        startIcon={<AttachMoney />}
                        onClick={() => setOpenGranularDialog(true)}
                      >
                        Add Granular Fee
                      </Button>
                    </Stack>
                  </Box>

                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                    <Table>
                      <TableHead sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
                        <TableRow>
                          <TableCell>Department</TableCell>
                          <TableCell>Program</TableCell>
                          <TableCell>Semester</TableCell>
                          <TableCell>Fee Head</TableCell>
                          <TableCell align="right">Amount (PKR)</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {granularFees.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                              <Typography color="text.secondary">No granular fees configured. Using global defaults.</Typography>
                            </TableCell>
                          </TableRow>
                        ) : granularFees.map((row) => (
                          <TableRow key={row.struct_id} hover>
                            <TableCell>{departmentsList.find(d => d.dept_id === row.dept_id)?.name || 'All Departments'}</TableCell>
                            <TableCell>{programsList.find(p => p.program_id === row.program_id)?.title || 'All Programs'}</TableCell>
                            <TableCell>{row.semester_id ? `Semester ${row.semester_id}` : 'All Semesters'}</TableCell>
                            <TableCell>{row.fee_head?.title || row.head_id}</TableCell>
                            <TableCell align="right">{row.amount.toLocaleString()}</TableCell>
                            <TableCell align="right">
                              <IconButton size="small" color="error" onClick={() => handleDeleteGranularFee(row.struct_id)}>
                                <Edit fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Box sx={{ mt: 4 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Program Tuition Fee Structure (From SIS)
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      These values come directly from program setup in SIS.
                    </Typography>
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                      <Table>
                        <TableHead sx={{ backgroundColor: alpha(theme.palette.info.main, 0.06) }}>
                          <TableRow>
                            <TableCell>Department</TableCell>
                            <TableCell>Program</TableCell>
                            <TableCell>Degree Level</TableCell>
                            <TableCell align="right">Tuition Fee (PKR)</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {programsList.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                                <Typography color="text.secondary">No programs found.</Typography>
                              </TableCell>
                            </TableRow>
                          ) : programsList.map((program) => (
                            <TableRow key={program.program_id} hover>
                              <TableCell>{departmentsList.find((d) => d.dept_id === program.dept_id)?.name || `Department ${program.dept_id}`}</TableCell>
                              <TableCell>{program.title}</TableCell>
                              <TableCell>{program.degree_level || '-'}</TableCell>
                              <TableCell align="right">{Number(program.tuition_fee || 0).toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}
          
          {/* Tab 4: Scholarships */}
          {activeTab === 3 && (
            <Grid size={12} component={motion.div} variants={fadeInUp}>
              <Card>
                <CardContent>
                  <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="h6" fontWeight="bold">Manage Student Scholarships</Typography>
                      <Typography variant="body2" color="text.secondary">Apply percentage-based discounts to current students across all departments and programs</Typography>
                    </Box>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<Receipt />}
                      disabled={filteredScholarshipStudents.length === 0}
                      onClick={async () => {
                        if (!window.confirm(`Generate invoices for ${filteredScholarshipStudents.length} students?`)) return;
                        try {
                          await financeAPI.generateInvoices({
                            student_ids: filteredScholarshipStudents.map(s => s.student_id),
                            semester_id: Number(scholarshipFilters.semester_id) || 1,
                            due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                          });
                          showSnackbar('Invoices generated successfully', 'success');
                          await loadFinanceData();
                        } catch (error) {
                          showSnackbar(error.response?.data?.detail || 'Failed to generate invoices', 'error');
                        }
                      }}
                    >
                      Bulk Generate Invoices
                    </Button>
                  </Box>
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid size={{ xs: 12, sm: 3 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Department</InputLabel>
                        <Select
                          value={scholarshipFilters.dept_id}
                          label="Department"
                          onChange={(e) => setScholarshipFilters((prev) => ({ ...prev, dept_id: e.target.value, program_id: '' }))}
                        >
                          <MenuItem value="">All Departments</MenuItem>
                          {departmentsList.map((d) => (
                            <MenuItem key={d.dept_id} value={String(d.dept_id)}>{d.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 3 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Program</InputLabel>
                        <Select
                          value={scholarshipFilters.program_id}
                          label="Program"
                          onChange={(e) => setScholarshipFilters((prev) => ({ ...prev, program_id: e.target.value }))}
                        >
                          <MenuItem value="">All Programs</MenuItem>
                          {programsList
                            .filter((p) => !scholarshipFilters.dept_id || String(p.dept_id) === String(scholarshipFilters.dept_id))
                            .map((p) => (
                              <MenuItem key={p.program_id} value={String(p.program_id)}>{p.title}</MenuItem>
                            ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 3 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Semester</InputLabel>
                        <Select
                          value={scholarshipFilters.semester_id}
                          label="Semester"
                          onChange={(e) => setScholarshipFilters((prev) => ({ ...prev, semester_id: e.target.value }))}
                        >
                          <MenuItem value="">All Semesters</MenuItem>
                          {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                            <MenuItem key={s} value={String(s)}>Semester {s}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 3 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Student Scope</InputLabel>
                        <Select
                          value={scholarshipFilters.current_only ? 'current' : 'all'}
                          label="Student Scope"
                          onChange={(e) => setScholarshipFilters((prev) => ({ ...prev, current_only: e.target.value === 'current' }))}
                        >
                          <MenuItem value="current">Current Students</MenuItem>
                          <MenuItem value="all">All Students</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Roll No</TableCell>
                          <TableCell>Student Name</TableCell>
                          <TableCell>Program</TableCell>
                          <TableCell align="center">Scholarship (%)</TableCell>
                          <TableCell align="right">Action</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredScholarshipStudents.map((s) => (
                          <TableRow key={s.student_id} hover>
                            <TableCell>{s.roll_no}</TableCell>
                            <TableCell>{s.name || `Student ${s.student_id}`}</TableCell>
                            <TableCell>{programsList.find(p => p.program_id === s.program_id)?.title || 'N/A'}</TableCell>
                            <TableCell align="center">
                              <Chip 
                                label={`${s.scholarship_percentage || 0}%`} 
                                color={s.scholarship_percentage > 0 ? "success" : "default"}
                                variant={s.scholarship_percentage > 0 ? "filled" : "outlined"}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <IconButton onClick={() => {
                                setSelectedStudent(s);
                                setScholarshipValue(s.scholarship_percentage || 0);
                                setOpenScholarshipDialog(true);
                              }}>
                                <Edit />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>

        {/* Global Fee Heads Dialog */}
        <Dialog open={openFeeDialog} onClose={() => setOpenFeeDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Edit Global Fee Heads</DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 2 }}>
              {Object.keys(feeHeadTitleByKey).map((key) => (
                <TextField
                  key={key}
                  label={`${feeHeadTitleByKey[key]} (PKR)`}
                  type="number"
                  fullWidth
                  value={feeStructure[key]}
                  onChange={(e) => setFeeStructure({ ...feeStructure, [key]: parseInt(e.target.value) || 0 })}
                />
              ))}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenFeeDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveFeeStructure} variant="contained" startIcon={<Save />}>
              Save Heads
            </Button>
          </DialogActions>
        </Dialog>

        {/* Granular Fee Dialog */}
        <Dialog open={openGranularDialog} onClose={() => setOpenGranularDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Add Granular Fee Setting</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Department (Optional)</InputLabel>
                <Select
                  value={granularFormData.dept_id}
                  onChange={(e) => setGranularFormData({ ...granularFormData, dept_id: e.target.value, program_id: '' })}
                  label="Department (Optional)"
                >
                  <MenuItem value="">All Departments</MenuItem>
                  {departmentsList.map(d => <MenuItem key={d.dept_id} value={String(d.dept_id)}>{d.name}</MenuItem>)}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Program (Optional)</InputLabel>
                <Select
                  value={granularFormData.program_id}
                  onChange={(e) => setGranularFormData({ ...granularFormData, program_id: e.target.value })}
                  label="Program (Optional)"
                >
                  <MenuItem value="">All Programs</MenuItem>
                  {programsList.filter(p => !granularFormData.dept_id || String(p.dept_id) === String(granularFormData.dept_id)).map(p => (
                    <MenuItem key={p.program_id} value={String(p.program_id)}>{p.title}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Semester (Optional)</InputLabel>
                <Select
                  value={granularFormData.semester_id}
                  onChange={(e) => setGranularFormData({ ...granularFormData, semester_id: e.target.value })}
                  label="Semester (Optional)"
                >
                  <MenuItem value="">All Semesters</MenuItem>
                  {[1,2,3,4,5,6,7,8].map(s => <MenuItem key={s} value={String(s)}>Semester {s}</MenuItem>)}
                </Select>
              </FormControl>

              <FormControl fullWidth required>
                <InputLabel>Fee Head *</InputLabel>
                <Select
                  value={granularFormData.head_id}
                  onChange={(e) => setGranularFormData({ ...granularFormData, head_id: e.target.value })}
                  label="Fee Head *"
                >
                  {feeHeads.map(h => <MenuItem key={h.head_id} value={String(h.head_id)}>{h.title}</MenuItem>)}
                </Select>
              </FormControl>

              <TextField
                label="Amount (PKR) *"
                type="number"
                fullWidth
                required
                value={granularFormData.amount}
                onChange={(e) => setGranularFormData({ ...granularFormData, amount: e.target.value })}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenGranularDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveGranularFee} variant="contained" startIcon={<Save />}>
              Add Setting
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Scholarship Dialog */}
        <Dialog open={openScholarshipDialog} onClose={() => setOpenScholarshipDialog(false)}>
          <DialogTitle>Edit Scholarship - {selectedStudent?.name}</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <TextField
                fullWidth
                label="Scholarship Percentage (%)"
                type="number"
                value={scholarshipValue}
                onChange={(e) => setScholarshipValue(e.target.value)}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                This discount will be applied to all future invoices generated for this student.
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenScholarshipDialog(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleUpdateScholarship}>Save Changes</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageTransition>
  );
};

export default FinanceManagement;
