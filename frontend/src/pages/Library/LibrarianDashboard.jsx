import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Avatar,
  Stack,
  InputAdornment,
  CircularProgress,
  Divider,
  Alert,
  Snackbar,
  alpha,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
} from '@mui/material';
import {
  Search as SearchIcon,
  MenuBook as BookIcon,
  People as PeopleIcon,
  AssignmentTurnedIn as IssueIcon,
  AssignmentReturn as ReturnIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  ArrowForward as ArrowForwardIcon,
  TrendingUp as TrendingUpIcon,
  Notifications as NotificationsIcon,
  LocalLibrary as LibraryIcon,
} from '@mui/icons-material';
import PageHeader from '../../components/Common/PageHeader';
import StatCard from '../../components/Common/StatCard';
import { motion } from 'framer-motion';
import { pageTransition, fadeInUp, staggerContainer } from '../../utils/animations';
import { libraryAPI } from '../../api/library';
import { sisAPI } from '../../api/sis';

const LibrarianDashboard = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [books, setBooks] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  
  // Issue Form State
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [bookIsbn, setBookIsbn] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [bookAvailable, setBookAvailable] = useState(null);

  // Return Form State
  const [returnSearch, setReturnSearch] = useState('');
  const [activeLoan, setActiveLoan] = useState(null);
  const [bookCondition, setBookCondition] = useState('Good');

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [booksRes, issuesRes, studentsRes] = await Promise.allSettled([
        libraryAPI.searchBooks(),
        libraryAPI.getIssues(), // Get all issues for librarian
        sisAPI.getStudents(),
      ]);
      
      setBooks(booksRes.status === 'fulfilled' ? (booksRes.value.data?.books || booksRes.value.data || []) : []);
      setTransactions(issuesRes.status === 'fulfilled' ? (issuesRes.value.data?.issues || issuesRes.value.data || []) : []);
      setStudentsList(studentsRes.status === 'fulfilled' ? (studentsRes.value.data?.students || studentsRes.value.data || []) : []);
    } catch (e) {
      console.error(e);
      showSnackbar('Failed to sync library data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const activeIssues = transactions.filter(t => t.status === 'issued' || t.status === 'overdue');
    const overdueCount = transactions.filter(t => t.status === 'overdue').length;
    const totalFines = transactions.reduce((sum, t) => sum + (t.fine_amount || t.fine || 0), 0);
    
    return {
      activeIssues: activeIssues.length,
      overdue: overdueCount,
      fines: totalFines
    };
  }, [transactions]);

  const handleStudentLookup = () => {
    const student = studentsList.find((s) => String(s.id || s.student_id) === String(studentId) || s.roll_no === studentId);
    if (student) {
      setStudentName(student.full_name || `${student.first_name} ${student.last_name}` || student.name);
      if (student.student_id) setStudentId(student.student_id);
    } else {
      setStudentName('Student not found');
    }
  };

  const handleIsbnLookup = () => {
    const book = books.find((b) => b.isbn === bookIsbn);
    if (book) {
      setBookTitle(book.title);
      setBookAvailable((book.available_copies ?? book.availableCopies) > 0);
    } else {
      setBookTitle('Book not found');
      setBookAvailable(null);
    }
  };

  const handleIssue = async () => {
    if (!studentId || !bookIsbn || bookAvailable === false) {
      showSnackbar('Please provide valid Student ID and available Book ISBN', 'warning');
      return;
    }
    
    try {
      setSubmitting(true);
      await libraryAPI.issueBook({ student_id: studentId, isbn: bookIsbn });
      showSnackbar('Book issued successfully', 'success');
      
      // Reset form
      setStudentId('');
      setStudentName('');
      setBookIsbn('');
      setBookTitle('');
      setBookAvailable(null);
      
      // Refresh
      await fetchData();
    } catch (e) {
      showSnackbar(e.response?.data?.detail || 'Failed to issue book', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturnSearch = () => {
    const searchVal = returnSearch.toLowerCase();
    const loan = transactions.find(
      (t) => (t.status === 'issued' || t.status === 'overdue') && 
      (String(t.isbn || t.bookIsbn || '').toLowerCase() === searchVal || 
       String(t.studentRollNo || t.studentId || '').toLowerCase() === searchVal)
    );
    
    if (loan) {
      setActiveLoan(loan);
    } else {
      setActiveLoan(null);
      showSnackbar('No active loan found for this ISBN or Roll No', 'info');
    }
  };

  const handleReturn = async () => {
    if (!activeLoan) return;
    
    try {
      setSubmitting(true);
      const res = await libraryAPI.returnBook(activeLoan.id || activeLoan.issue_id, { condition: bookCondition });
      const fineApplied = res.data?.fine_amount ?? 0;
      const successMsg = res.data?.message || (fineApplied > 0
        ? `Return processed. Fine of PKR ${fineApplied} has been applied!`
        : 'Return processed successfully.');
      
      showSnackbar(successMsg, fineApplied > 0 ? 'warning' : 'success');
      
      setActiveLoan(null);
      setReturnSearch('');
      await fetchData();
    } catch (e) {
      showSnackbar('Return processing failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <motion.div {...pageTransition}>
      <Box sx={{ p: 3 }}>
        <PageHeader 
          title="Librarian Dashboard" 
          subtitle="System oversight and daily circulation management"
        />

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={4}>
            <StatCard 
              title="Active Loans" 
              value={stats.activeIssues.toString()} 
              icon={IssueIcon} 
              color="primary"
              subtitle="Books currently with students"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <StatCard 
              title="Overdue" 
              value={stats.overdue.toString()} 
              icon={WarningIcon} 
              color="error"
              subtitle="Pending returns"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <StatCard 
              title="Total Fines" 
              value={`${stats.fines} PKR`} 
              icon={TrendingUpIcon} 
              color="success"
              subtitle="Collected & pending"
            />
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          {/* Quick Issue Card */}
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 4, height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={800} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IssueIcon color="primary" /> Issue Book
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Scan student card or enter ID to begin the checkout process.
                </Typography>

                <Stack spacing={2.5}>
                  <Autocomplete
                    fullWidth
                    options={studentsList}
                    getOptionLabel={(option) => `${option.full_name || option.name || ''} (${option.roll_no || option.student_id || ''})`}
                    value={studentsList.find(s => String(s.id || s.student_id) === String(studentId)) || null}
                    onChange={(e, newValue) => {
                      if (newValue) {
                        setStudentId(newValue.id || newValue.student_id);
                        setStudentName(newValue.full_name || newValue.name || `Student ${newValue.id || newValue.student_id}`);
                      } else {
                        setStudentId('');
                        setStudentName('');
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select Student"
                        placeholder="Search by name or roll number..."
                      />
                    )}
                  />

                  {studentName && (
                    <Alert icon={<PeopleIcon fontSize="small" />} severity={studentName.includes('not found') ? 'error' : 'info'} sx={{ borderRadius: 2 }}>
                      {studentName}
                    </Alert>
                  )}

                  <Autocomplete
                    fullWidth
                    options={books}
                    getOptionLabel={(option) => `${option.title} (${option.isbn})`}
                    value={books.find(b => b.isbn === bookIsbn) || null}
                    onChange={(e, newValue) => {
                      if (newValue) {
                        setBookIsbn(newValue.isbn);
                        setBookTitle(newValue.title);
                        setBookAvailable((newValue.available_copies ?? newValue.availableCopies) > 0);
                      } else {
                        setBookIsbn('');
                        setBookTitle('');
                        setBookAvailable(null);
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select Book"
                        placeholder="Search by title or ISBN..."
                      />
                    )}
                  />

                  {bookTitle && (
                    <Alert 
                      severity={bookTitle.includes('not found') ? 'error' : bookAvailable ? 'success' : 'warning'}
                      icon={<BookIcon fontSize="small" />}
                      sx={{ borderRadius: 2 }}
                    >
                      <Typography variant="body2" fontWeight={700}>{bookTitle}</Typography>
                      <Typography variant="caption">
                        {bookAvailable === true ? 'Available in stock' : bookAvailable === false ? 'All copies issued' : 'Check ISBN'}
                      </Typography>
                    </Alert>
                  )}

                  <Button 
                    variant="contained" 
                    size="large" 
                    fullWidth 
                    disabled={!studentId || !bookIsbn || bookAvailable !== true || submitting}
                    onClick={handleIssue}
                    startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <ArrowForwardIcon />}
                    sx={{ borderRadius: 3, py: 1.5, fontWeight: 800 }}
                  >
                    Complete Checkout
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Quick Return Card */}
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 4, height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={800} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ReturnIcon color="success" /> Process Return
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Search for active loans by ISBN or Student Roll Number.
                </Typography>

                <Stack spacing={2.5}>
                  <Autocomplete
                    fullWidth
                    options={transactions.filter(t => t.status === 'issued' || t.status === 'overdue')}
                    getOptionLabel={(option) => `${option.bookTitle || option.book?.title || 'Unknown'} - ${option.studentName || 'Student'} (${option.isbn || option.bookIsbn || ''})`}
                    value={activeLoan}
                    onChange={(e, newValue) => {
                      setActiveLoan(newValue);
                      if (!newValue) setReturnSearch('');
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select Active Loan"
                        placeholder="Search by book, student or ISBN..."
                      />
                    )}
                  />

                  {activeLoan ? (
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: alpha(theme.palette.success.light, 0.05) }}>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ bgcolor: 'success.main' }}><LibraryIcon /></Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={800}>{activeLoan.bookTitle || activeLoan.book?.title}</Typography>
                          <Typography variant="caption" display="block">Issued to: {activeLoan.studentName}</Typography>
                          <Typography variant="caption" color="error.main" fontWeight={700}>Due: {activeLoan.dueDate}</Typography>
                        </Box>
                      </Stack>
                      
                      <Divider sx={{ my: 2 }} />
                      
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Book Condition</InputLabel>
                            <Select
                              value={bookCondition}
                              label="Book Condition"
                              onChange={(e) => setBookCondition(e.target.value)}
                            >
                              <MenuItem value="Good">Good</MenuItem>
                              <MenuItem value="Worn">Worn</MenuItem>
                              <MenuItem value="Damaged">Damaged</MenuItem>
                              <MenuItem value="Lost">Lost</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                          <Button 
                            variant="contained" 
                            color="success" 
                            fullWidth 
                            onClick={handleReturn}
                            disabled={submitting}
                            sx={{ fontWeight: 800 }}
                          >
                            Confirm Return
                          </Button>
                        </Grid>
                      </Grid>
                    </Paper>
                  ) : (
                    <Box sx={{ 
                      py: 4, 
                      textAlign: 'center', 
                      border: '1px dashed', 
                      borderColor: 'divider', 
                      borderRadius: 3,
                      bgcolor: 'grey.50'
                    }}>
                      <ReturnIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                      <Typography variant="caption" color="text.secondary" display="block">
                        Enter details above to find a loan record
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Activity Table */}
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 4 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={800} gutterBottom>Recent Circulation</Typography>
                <TableContainer>
                  <Table>
                    <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Book</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Student</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Due Date</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Fine</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {transactions.slice(0, 5).map((t) => {
                        const status = String(t.status || 'issued').toLowerCase();
                        const isOverdue = status === 'overdue';
                        const isReturned = status === 'returned';
                        const isLost = status === 'lost';
                        
                        let chipColor = 'primary';
                        let chipVariant = 'outlined';
                        let chipLabel = 'ISSUED';
                        let chipSx = {};
                        
                        if (isReturned) {
                          chipColor = 'success';
                          chipVariant = 'filled';
                          const cond = t.returnCondition || t.return_condition;
                          chipLabel = cond && cond !== 'Good' ? `RETURNED (${cond.toUpperCase()})` : 'RETURNED';
                        } else if (isOverdue) {
                          chipColor = 'error';
                          chipVariant = 'filled';
                          chipLabel = 'OVERDUE';
                        } else if (isLost) {
                          chipLabel = 'LOST';
                          chipVariant = 'filled';
                          chipSx = { bgcolor: '#374151', color: '#F3F4F6', fontWeight: 'bold' };
                        }
                        
                        return (
                          <TableRow key={t.id || t.issue_id} hover>
                            <TableCell>
                              <Chip 
                                label={chipLabel} 
                                size="small" 
                                color={isLost ? undefined : chipColor}
                                variant={chipVariant}
                                sx={chipSx}
                              />
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                                <Typography variant="body2" fontWeight={700}>
                                  {t.bookTitle || t.book?.title || 'Unknown Book'}
                                </Typography>
                                {t.returnCondition && t.returnCondition !== 'Good' && (
                                  <Chip
                                    label={t.returnCondition}
                                    size="small"
                                    color="warning"
                                    variant="outlined"
                                    sx={{ height: 18, fontSize: '0.65rem', fontWeight: 800 }}
                                  />
                                )}
                              </Box>
                              <Typography variant="caption" color="text.secondary">{t.isbn || t.bookIsbn}</Typography>
                            </TableCell>
                            <TableCell>{t.studentName || `Roll: ${t.studentRollNo}`}</TableCell>
                            <TableCell>{t.dueDate || '—'}</TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight={700} color={(t.fine_amount || t.fine) > 0 ? 'error.main' : 'text.primary'}>
                                {t.fine_amount || t.fine || 0} PKR
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {transactions.length === 0 && (
                        <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3 }}>No recent circulation activity.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({...snackbar, open: false})}>
        <Alert severity={snackbar.severity} sx={{ borderRadius: 2 }}>{snackbar.message}</Alert>
      </Snackbar>
    </motion.div>
  );
};

export default LibrarianDashboard;
