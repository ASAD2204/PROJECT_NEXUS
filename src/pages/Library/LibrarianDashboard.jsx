import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Alert,
  Chip,
  InputAdornment,
  Stack,
  Divider,
  Tooltip,
  alpha,
  useTheme,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  LibraryBooks,
  Search,
  Edit,
  Delete,
  AssignmentReturn,
  CheckCircle,
  Warning,
  AttachMoney,
  QrCode,
  Receipt,
  Person,
  MenuBook,
  TrendingUp,
  AutoStories,
} from '@mui/icons-material';
import PageTransition from '../../components/Common/PageTransition';
import { TableSkeleton } from '../../components/Common/LoadingSkeleton';
import { useSnackbar } from '../../contexts/SnackbarContext';
import {
  libraryBooks,
  libraryTransactions,
  issueBookTransaction,
  returnBookTransaction,
  students,
} from '../../data/dummyData';
import { fadeInUp, staggerContainer } from '../../utils/animations';

const LibrarianDashboard = () => {
  const { showSnackbar } = useSnackbar();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [books, setBooks] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [bookIsbn, setBookIsbn] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [bookAvailable, setBookAvailable] = useState(null);

  const [returnSearch, setReturnSearch] = useState('');
  const [activeLoan, setActiveLoan] = useState(null);
  const [bookCondition, setBookCondition] = useState('Good');

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setBooks(libraryBooks);
    setTransactions(libraryTransactions);
    const timer = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(timer);
  }, []);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const issuedToday = transactions.filter((t) => t.issuedOn === today).length;
    const overdue = transactions.filter((t) => t.status === 'Issued' && new Date(t.dueDate) < new Date()).length;
    const fines = transactions.reduce((sum, t) => sum + (t.fine || 0), 0);
    return { issuedToday, overdue, fines };
  }, [transactions]);

  const calculatedFine = bookCondition === 'Damaged' ? 500 : bookCondition === 'Lost' ? 2000 : 0;

  const handleStudentBlur = () => {
    const student = students.find((s) => s.id === studentId);
    setStudentName(student?.name || '');
  };

  const handleIsbnBlur = () => {
    const book = books.find((b) => b.isbn === bookIsbn);
    setBookTitle(book?.title || '');
    setBookAvailable(book ? book.availableCopies > 0 : null);
  };

  const handleIssue = () => {
    if (!studentId || !bookIsbn) {
      showSnackbar('Please fill all fields', 'error');
      return;
    }
    const student = students.find((s) => s.id === studentId);
    const result = issueBookTransaction(studentId, student?.name || 'Student', bookIsbn);
    if (!result.success) {
      showSnackbar(result.message, 'error');
      return;
    }
    setTransactions([...libraryTransactions]);
    setBooks([...libraryBooks]);
    showSnackbar('Book issued successfully', 'success');
    setStudentId('');
    setStudentName('');
    setBookIsbn('');
    setBookTitle('');
    setBookAvailable(null);
  };

  const handleReturnSearch = () => {
    const loan = transactions.find(
      (t) => t.status === 'Issued' && (t.isbn === returnSearch || t.studentId === returnSearch)
    );
    setActiveLoan(loan || null);
  };

  const handleReturn = () => {
    if (!activeLoan) {
      showSnackbar('No active loan selected', 'error');
      return;
    }
    const result = returnBookTransaction(activeLoan.id, bookCondition);
    if (!result.success) {
      showSnackbar(result.message, 'error');
      return;
    }
    setTransactions([...libraryTransactions]);
    setBooks([...libraryBooks]);
    showSnackbar(`Book returned. Fine: PKR ${result.transaction.fine}`, result.transaction.fine > 0 ? 'warning' : 'success');
    setReturnSearch('');
    setActiveLoan(null);
    setBookCondition('Good');
  };

  const filteredBooks = books.filter(
    (book) =>
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.isbn.includes(searchQuery)
  );

  if (loading) {
    return (
      <Box className="page-container">
        <Typography variant="h4" sx={{ mb: 3 }}>Loading...</Typography>
        <TableSkeleton rows={8} columns={6} />
      </Box>
    );
  }

  return (
    <PageTransition>
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        {/* HEADER */}
        <Box 
          sx={{ 
            mb: 4,
            p: { xs: 3, sm: 4 },
            borderRadius: { xs: 2, sm: 3 },
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(102,126,234,0.12) 0%, rgba(118,75,162,0.12) 100%)'
              : 'linear-gradient(135deg, rgba(102,126,234,0.08) 0%, rgba(118,75,162,0.08) 100%)',
            border: '1px solid',
            borderColor: theme.palette.mode === 'dark' ? 'rgba(102,126,234,0.2)' : 'rgba(102,126,234,0.15)',
            boxShadow: theme.palette.mode === 'dark'
              ? '0 4px 20px rgba(0,0,0,0.3)'
              : '0 4px 20px rgba(102,126,234,0.1)',
          }}
        >
          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            alignItems={{ xs: 'flex-start', sm: 'center' }} 
            spacing={2}
          >
            <Box
              sx={{
                width: { xs: 56, sm: 64 },
                height: { xs: 56, sm: 64 },
                borderRadius: 2,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 16px rgba(102,126,234,0.4)',
              }}
            >
              <AutoStories sx={{ fontSize: { xs: 32, sm: 36 }, color: 'white' }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                Library Management System
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                Manage book issues, returns, inventory, and transactions
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* STAT CARDS - 4 LARGE CARDS */}
        <Grid 
          container 
          spacing={3} 
          sx={{ mb: 4 }}
          component={motion.div}
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <Grid size={{ xs: 12, sm: 6, md: 3 }} component={motion.div} variants={fadeInUp}>
            <Card
              sx={{
                minHeight: { xs: 160, sm: 200 },
                p: { xs: 1.5, sm: 2 },
                borderRadius: { xs: 2, sm: 3 },
                background: 'linear-gradient(135deg, rgba(102,126,234,0.1) 0%, rgba(118,75,162,0.15) 100%)',
                border: '1px solid',
                borderColor: theme.palette.mode === 'dark' ? 'rgba(102,126,234,0.3)' : 'rgba(102,126,234,0.2)',
                boxShadow: theme.palette.mode === 'dark'
                  ? '0 8px 24px rgba(0,0,0,0.3)'
                  : '0 8px 24px rgba(102,126,234,0.15)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: theme.palette.mode === 'dark'
                    ? '0 12px 32px rgba(0,0,0,0.4)'
                    : '0 12px 32px rgba(102,126,234,0.2)',
                },
              }}
            >
              <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
                <Stack spacing={2} alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
                  <Box
                    sx={{
                      width: { xs: 56, sm: 64 },
                      height: { xs: 56, sm: 64 },
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(102,126,234,0.3)',
                    }}
                  >
                    <LibraryBooks sx={{ fontSize: { xs: 28, sm: 32 }, color: 'white' }} />
                  </Box>
                  <Box textAlign="center">
                    <Typography variant="h3" fontWeight="bold" color="primary" sx={{ fontSize: { xs: '2rem', sm: '3rem' } }}>
                      {books.length}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" fontWeight={600} sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                      Total Books
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }} component={motion.div} variants={fadeInUp}>
            <Card
              sx={{
                minHeight: { xs: 160, sm: 200 },
                p: { xs: 1.5, sm: 2 },
                borderRadius: { xs: 2, sm: 3 },
                background: 'linear-gradient(135deg, rgba(79,172,254,0.1) 0%, rgba(0,242,254,0.15) 100%)',
                border: '1px solid',
                borderColor: theme.palette.mode === 'dark' ? 'rgba(79,172,254,0.3)' : 'rgba(79,172,254,0.2)',
                boxShadow: theme.palette.mode === 'dark'
                  ? '0 8px 24px rgba(0,0,0,0.3)'
                  : '0 8px 24px rgba(79,172,254,0.15)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: theme.palette.mode === 'dark'
                    ? '0 12px 32px rgba(0,0,0,0.4)'
                    : '0 12px 32px rgba(79,172,254,0.2)',
                },
              }}
            >
              <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
                <Stack spacing={2} alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
                  <Box
                    sx={{
                      width: { xs: 56, sm: 64 },
                      height: { xs: 56, sm: 64 },
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(79,172,254,0.3)',
                    }}
                  >
                    <TrendingUp sx={{ fontSize: { xs: 28, sm: 32 }, color: 'white' }} />
                  </Box>
                  <Box textAlign="center">
                    <Typography variant="h3" fontWeight="bold" sx={{ color: '#4facfe', fontSize: { xs: '2rem', sm: '3rem' } }}>
                      {stats.issuedToday}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" fontWeight={600} sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                      Issued Today
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }} component={motion.div} variants={fadeInUp}>
            <Card
              sx={{
                minHeight: { xs: 160, sm: 200 },
                p: { xs: 1.5, sm: 2 },
                borderRadius: { xs: 2, sm: 3 },
                background: 'linear-gradient(135deg, rgba(240,147,251,0.1) 0%, rgba(245,87,108,0.15) 100%)',
                border: '1px solid',
                borderColor: theme.palette.mode === 'dark' ? 'rgba(240,147,251,0.3)' : 'rgba(240,147,251,0.2)',
                boxShadow: theme.palette.mode === 'dark'
                  ? '0 8px 24px rgba(0,0,0,0.3)'
                  : '0 8px 24px rgba(240,147,251,0.15)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: theme.palette.mode === 'dark'
                    ? '0 12px 32px rgba(0,0,0,0.4)'
                    : '0 12px 32px rgba(240,147,251,0.2)',
                },
              }}
            >
              <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
                <Stack spacing={2} alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
                  <Box
                    sx={{
                      width: { xs: 56, sm: 64 },
                      height: { xs: 56, sm: 64 },
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(240,147,251,0.3)',
                    }}
                  >
                    <Warning sx={{ fontSize: { xs: 28, sm: 32 }, color: 'white' }} />
                  </Box>
                  <Box textAlign="center">
                    <Typography variant="h3" fontWeight="bold" sx={{ color: '#f093fb', fontSize: { xs: '2rem', sm: '3rem' } }}>
                      {stats.overdue}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" fontWeight={600} sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                      Overdue
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }} component={motion.div} variants={fadeInUp}>
            <Card
              sx={{
                minHeight: { xs: 160, sm: 200 },
                p: { xs: 1.5, sm: 2 },
                borderRadius: { xs: 2, sm: 3 },
                background: 'linear-gradient(135deg, rgba(250,112,154,0.1) 0%, rgba(254,225,64,0.15) 100%)',
                border: '1px solid',
                borderColor: theme.palette.mode === 'dark' ? 'rgba(250,112,154,0.3)' : 'rgba(250,112,154,0.2)',
                boxShadow: theme.palette.mode === 'dark'
                  ? '0 8px 24px rgba(0,0,0,0.3)'
                  : '0 8px 24px rgba(250,112,154,0.15)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: theme.palette.mode === 'dark'
                    ? '0 12px 32px rgba(0,0,0,0.4)'
                    : '0 12px 32px rgba(250,112,154,0.2)',
                },
              }}
            >
              <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
                <Stack spacing={2} alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
                  <Box
                    sx={{
                      width: { xs: 56, sm: 64 },
                      height: { xs: 56, sm: 64 },
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(250,112,154,0.3)',
                    }}
                  >
                    <AttachMoney sx={{ fontSize: { xs: 28, sm: 32 }, color: 'white' }} />
                  </Box>
                  <Box textAlign="center">
                    <Typography variant="h3" fontWeight="bold" sx={{ color: '#fa709a', fontSize: { xs: '2rem', sm: '3rem' } }}>
                      ₨{stats.fines}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" fontWeight={600} sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                      Total Fines
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* TABBED INTERFACE */}
        <Card
          sx={{
            borderRadius: { xs: 2, sm: 3 },
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: theme.palette.mode === 'dark'
              ? '0 8px 24px rgba(0,0,0,0.4)'
              : '0 8px 24px rgba(0,0,0,0.08)',
          }}
        >
          <Tabs 
            value={activeTab} 
            onChange={(e, v) => setActiveTab(v)} 
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': {
                fontWeight: 600,
                textTransform: 'none',
                fontSize: { xs: '0.875rem', sm: '1rem' },
                py: { xs: 1.5, sm: 2 },
                minHeight: { xs: 56, sm: 64 },
              },
            }}
          >
            <Tab 
              label={<Box sx={{ display: { xs: 'none', sm: 'block' } }}>Issue Book</Box>} 
              icon={<LibraryBooks />} 
              iconPosition="start" 
              sx={{ '& .MuiTab-iconWrapper': { mb: { xs: 0.5, sm: 0 }, mr: { xs: 0, sm: 1 } } }}
            />
            <Tab 
              label={<Box sx={{ display: { xs: 'none', sm: 'block' } }}>Return Book</Box>} 
              icon={<AssignmentReturn />} 
              iconPosition="start"
              sx={{ '& .MuiTab-iconWrapper': { mb: { xs: 0.5, sm: 0 }, mr: { xs: 0, sm: 1 } } }}
            />
            <Tab 
              label={<Box sx={{ display: { xs: 'none', sm: 'block' } }}>Inventory</Box>} 
              icon={<MenuBook />} 
              iconPosition="start"
              sx={{ '& .MuiTab-iconWrapper': { mb: { xs: 0.5, sm: 0 }, mr: { xs: 0, sm: 1 } } }}
            />
            <Tab 
              label={<Box sx={{ display: { xs: 'none', sm: 'block' } }}>Transactions</Box>} 
              icon={<Receipt />} 
              iconPosition="start"
              sx={{ '& .MuiTab-iconWrapper': { mb: { xs: 0.5, sm: 0 }, mr: { xs: 0, sm: 1 } } }}
            />
          </Tabs>

          {/* TAB 1: ISSUE BOOK */}
          {activeTab === 0 && (
            <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
              <Box sx={{ maxWidth: 600, mx: 'auto' }}>
                <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                  Issue Book to Student
                </Typography>
                <Stack spacing={3}>
                  <TextField
                    label="Student ID"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    onBlur={handleStudentBlur}
                    fullWidth
                    InputProps={{ 
                      startAdornment: (
                        <InputAdornment position="start">
                          <Person sx={{ color: 'primary.main' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      },
                    }}
                  />
                  {studentName && (
                    <Alert 
                      severity="info" 
                      sx={{ 
                        borderRadius: 2,
                        background: alpha(theme.palette.info.main, 0.1),
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight="bold">
                        Student: {studentName}
                      </Typography>
                    </Alert>
                  )}
                  <TextField
                    label="Book ISBN"
                    value={bookIsbn}
                    onChange={(e) => setBookIsbn(e.target.value)}
                    onBlur={handleIsbnBlur}
                    fullWidth
                    InputProps={{ 
                      startAdornment: (
                        <InputAdornment position="start">
                          <QrCode sx={{ color: 'primary.main' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      },
                    }}
                  />
                  {bookTitle && (
                    <Alert 
                      severity={bookAvailable ? 'success' : 'error'}
                      sx={{ 
                        borderRadius: 2,
                        background: bookAvailable 
                          ? alpha(theme.palette.success.main, 0.1)
                          : alpha(theme.palette.error.main, 0.1),
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight="bold">
                        {bookTitle}
                      </Typography>
                      <Typography variant="body2">
                        {bookAvailable ? '✓ Available for issue' : '✗ Not available - All copies issued'}
                      </Typography>
                    </Alert>
                  )}
                  <Box
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      background: alpha(theme.palette.primary.main, 0.08),
                      border: '1px solid',
                      borderColor: 'primary.main',
                    }}
                  >
                    <Typography variant="h6" color="primary" fontWeight="bold">
                      📅 Due Date
                    </Typography>
                    <Typography variant="h5" fontWeight="bold" sx={{ mt: 1 }}>
                      {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      (Today + 30 days)
                    </Typography>
                  </Box>
                  <Button 
                    variant="contained" 
                    size="large"
                    startIcon={<CheckCircle />} 
                    onClick={handleIssue}
                    sx={{
                      borderRadius: 2,
                      py: 2,
                      fontWeight: 600,
                      textTransform: 'none',
                      fontSize: '1.1rem',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      boxShadow: '0 4px 12px rgba(102,126,234,0.4)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                        boxShadow: '0 6px 16px rgba(102,126,234,0.5)',
                      },
                    }}
                  >
                    Issue Book
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          )}

          {/* TAB 2: RETURN BOOK */}
          {activeTab === 1 && (
            <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
              <Box sx={{ maxWidth: 600, mx: 'auto' }}>
                <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                  Return Book
                </Typography>
                <Stack spacing={3}>
                  <TextField
                    label="Search by ISBN or Student ID"
                    value={returnSearch}
                    onChange={(e) => setReturnSearch(e.target.value)}
                    onBlur={handleReturnSearch}
                    fullWidth
                    InputProps={{ 
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search sx={{ color: 'primary.main' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      },
                    }}
                  />
                  {activeLoan ? (
                    <Alert 
                      severity="info"
                      sx={{ 
                        borderRadius: 2,
                        background: alpha(theme.palette.info.main, 0.1),
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight="bold">
                        📚 {activeLoan.bookTitle}
                      </Typography>
                      <Typography variant="body2">
                        Student: {activeLoan.studentName} • Due: {activeLoan.dueDate}
                      </Typography>
                    </Alert>
                  ) : returnSearch && (
                    <Alert 
                      severity="warning"
                      sx={{ 
                        borderRadius: 2,
                        background: alpha(theme.palette.warning.main, 0.1),
                      }}
                    >
                      No active loan found for this search.
                    </Alert>
                  )}

                  <FormControl component="fieldset">
                    <FormLabel component="legend" sx={{ fontWeight: 600, mb: 2, fontSize: '1rem' }}>
                      Book Condition
                    </FormLabel>
                    <RadioGroup 
                      value={bookCondition} 
                      onChange={(e) => setBookCondition(e.target.value)}
                    >
                      <FormControlLabel 
                        value="Good" 
                        control={<Radio />} 
                        label={
                          <Box sx={{ ml: 1 }}>
                            <Typography variant="body1" fontWeight={600}>Good</Typography>
                            <Typography variant="caption" color="text.secondary">No damage - ₨0 fine</Typography>
                          </Box>
                        }
                        sx={{ mb: 1 }}
                      />
                      <FormControlLabel 
                        value="Damaged" 
                        control={<Radio />} 
                        label={
                          <Box sx={{ ml: 1 }}>
                            <Typography variant="body1" fontWeight={600}>Damaged</Typography>
                            <Typography variant="caption" color="text.secondary">Minor damage - ₨500 fine</Typography>
                          </Box>
                        }
                        sx={{ mb: 1 }}
                      />
                      <FormControlLabel 
                        value="Lost" 
                        control={<Radio />} 
                        label={
                          <Box sx={{ ml: 1 }}>
                            <Typography variant="body1" fontWeight={600}>Lost</Typography>
                            <Typography variant="caption" color="text.secondary">Book replacement - ₨2000 fine</Typography>
                          </Box>
                        }
                      />
                    </RadioGroup>
                  </FormControl>

                  <Box
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      background: calculatedFine > 0 
                        ? alpha(theme.palette.warning.main, 0.1)
                        : alpha(theme.palette.success.main, 0.1),
                      border: '2px solid',
                      borderColor: calculatedFine > 0 ? 'warning.main' : 'success.main',
                    }}
                  >
                    <Typography variant="subtitle2" color={calculatedFine > 0 ? 'warning.main' : 'success.main'} fontWeight="bold">
                      TOTAL FINE
                    </Typography>
                    <Typography variant="h3" color={calculatedFine > 0 ? 'warning.main' : 'success.main'} fontWeight="bold" sx={{ mt: 1 }}>
                      ₨ {calculatedFine}
                    </Typography>
                  </Box>

                  <Button 
                    variant="contained" 
                    size="large"
                    startIcon={<CheckCircle />}
                    onClick={handleReturn}
                    sx={{
                      borderRadius: 2,
                      py: 2,
                      fontWeight: 600,
                      textTransform: 'none',
                      fontSize: '1.1rem',
                      background: calculatedFine > 0 
                        ? 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
                        : 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                      boxShadow: `0 4px 12px ${calculatedFine > 0 ? 'rgba(250,112,154,0.4)' : 'rgba(17,153,142,0.4)'}`,
                      '&:hover': {
                        background: calculatedFine > 0
                          ? 'linear-gradient(135deg, #e96089 0%, #edd02f 100%)'
                          : 'linear-gradient(135deg, #0e7d72 0%, #2ed665 100%)',
                        boxShadow: `0 6px 16px ${calculatedFine > 0 ? 'rgba(250,112,154,0.5)' : 'rgba(17,153,142,0.5)'}`,
                      },
                    }}
                  >
                    Confirm Return
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          )}

          {/* TAB 3: INVENTORY */}
          {activeTab === 2 && (
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                <TextField
                  placeholder="Search books by title, author, ISBN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  fullWidth
                  InputProps={{ 
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ color: 'primary.main' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    },
                  }}
                />
              </Stack>
              <TableContainer sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflowX: 'auto' }}>
                <Table sx={{ minWidth: { xs: 600, md: 800 } }}>
                  <TableHead>
                    <TableRow sx={{ background: alpha(theme.palette.primary.main, 0.08) }}>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Cover</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.95rem' }}>ISBN</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Title</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Author</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Category</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Shelf Location</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredBooks.map((book) => (
                      <TableRow 
                        key={book.id}
                        sx={{
                          '&:hover': {
                            background: alpha(theme.palette.primary.main, 0.03),
                          },
                        }}
                      >
                        <TableCell>
                          <img 
                            src={book.coverImage} 
                            alt={book.title} 
                            style={{ 
                              width: 50, 
                              height: 70, 
                              objectFit: 'cover', 
                              borderRadius: 8,
                              border: '1px solid rgba(0,0,0,0.1)',
                            }} 
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {book.isbn}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {book.title}
                          </Typography>
                        </TableCell>
                        <TableCell>{book.author}</TableCell>
                        <TableCell>
                          <Chip 
                            label={book.category} 
                            size="small" 
                            sx={{
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              color: 'white',
                              fontWeight: 600,
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {book.shelfLocation}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={book.availableCopies > 0 ? 'Available' : 'Out of Stock'}
                            size="small"
                            sx={{
                              fontWeight: 600,
                              ...(book.availableCopies > 0 && {
                                background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                                color: 'white',
                              }),
                              ...(book.availableCopies === 0 && {
                                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                color: 'white',
                              }),
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Edit">
                            <IconButton 
                              size="small"
                              sx={{
                                color: 'primary.main',
                                '&:hover': { background: alpha(theme.palette.primary.main, 0.1) },
                              }}
                            >
                              <Edit />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton 
                              size="small" 
                              sx={{
                                color: 'error.main',
                                '&:hover': { background: alpha(theme.palette.error.main, 0.1) },
                              }}
                            >
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          )}

          {/* TAB 4: TRANSACTIONS */}
          {activeTab === 3 && (
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <TableContainer sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflowX: 'auto' }}>
                <Table sx={{ minWidth: { xs: 700, md: 900 } }}>
                  <TableHead>
                    <TableRow sx={{ background: alpha(theme.palette.primary.main, 0.08) }}>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Transaction ID</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Student</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Book</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Issued On</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Due Date</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Fine</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transactions.map((t) => (
                      <TableRow 
                        key={t.id}
                        sx={{
                          '&:hover': {
                            background: alpha(theme.palette.primary.main, 0.03),
                          },
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {t.id}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {t.studentName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {t.bookTitle}
                          </Typography>
                        </TableCell>
                        <TableCell>{t.issuedOn}</TableCell>
                        <TableCell>{t.dueDate}</TableCell>
                        <TableCell>
                          <Chip 
                            label={t.status} 
                            size="small" 
                            sx={{
                              fontWeight: 600,
                              ...(t.status === 'Issued' && {
                                background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                                color: 'white',
                              }),
                              ...(t.status === 'Returned' && {
                                background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                                color: 'white',
                              }),
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600} color={t.fine > 0 ? 'error.main' : 'text.secondary'}>
                            ₨ {t.fine || 0}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          )}
        </Card>
      </Box>
    </PageTransition>
  );
};

export default LibrarianDashboard;
