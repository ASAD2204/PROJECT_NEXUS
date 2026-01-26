import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  TextField,
  Button,
  Chip,
  Badge,
  IconButton,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Divider,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Fab,
  Rating,
  Stack,
  Tooltip,
  TableContainer,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  LinearProgress,
  Avatar,
  Snackbar,
  alpha,
  useTheme,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Search,
  FilterList,
  MenuBook,
  QrCodeScanner,
  Star,
  Visibility,
  BookmarkAdd,
  Share,
  CheckCircle,
  Warning,
  AccessTime,
  LocationOn,
  CalendarMonth,
  AutoStories,
  Download,
  Close,
  Replay,
  Cancel as CancelIcon,
  Payment,
  TrendingUp,
  LibraryBooks,
  LocalLibrary,
  AccountBalance,
} from '@mui/icons-material';
import {
  libraryBooks,
  myIssuedBooks,
  myReservedBooks,
  readingHistory,
  reserveBook,
  returnBook,
  renewBook,
} from '../../data/dummyData';
import StatCard from '../../components/Common/StatCard';
import { GridSkeleton } from '../../components/Common/LoadingSkeleton';
import { pageTransition, staggerContainer, fadeInUp } from '../../utils/animations';

const LibraryCatalog = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [availabilityFilter, setAvailabilityFilter] = useState('All');
  const [languageFilter, setLanguageFilter] = useState('All');
  const [sortBy, setSortBy] = useState('title');
  const [selectedBook, setSelectedBook] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Calculate stats
  const totalBooks = libraryBooks.reduce((sum, book) => sum + book.totalCopies, 0);
  const availableBooks = libraryBooks.reduce((sum, book) => sum + book.availableCopies, 0);
  const issuedBooksCount = myIssuedBooks.length;
  const overdueBooks = myIssuedBooks.filter(book => {
    const dueDate = new Date(book.dueDate);
    return dueDate < new Date() && book.status === 'issued';
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const calculateFine = (dueDate) => {
    const due = new Date(dueDate);
    const today = new Date();
    if (today > due) {
      const daysOverdue = Math.floor((today - due) / (1000 * 60 * 60 * 24));
      return daysOverdue * 50;
    }
    return 0;
  };

  const totalFines = myIssuedBooks.reduce((sum, book) => sum + calculateFine(book.dueDate), 0);

  const filteredBooks = libraryBooks
    .filter(book => {
      const matchesSearch = 
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.isbn.includes(searchQuery);
      
      const matchesCategory = categoryFilter === 'All' || book.category === categoryFilter;
      const matchesAvailability = 
        availabilityFilter === 'All' ||
        (availabilityFilter === 'Available' && book.availableCopies > 0) ||
        (availabilityFilter === 'Issued' && book.availableCopies === 0);
      
      const matchesLanguage = languageFilter === 'All' || book.language === languageFilter;
      
      return matchesSearch && matchesCategory && matchesAvailability && matchesLanguage;
    })
    .sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'author') return a.author.localeCompare(b.author);
      if (sortBy === 'newest') return b.year - a.year;
      if (sortBy === 'popular') return b.ratings - a.ratings;
      return 0;
    });

  const handleReserve = (bookId) => {
    const result = reserveBook(bookId);
    setSnackbar({
      open: true,
      message: result.message,
      severity: result.success ? 'success' : 'error',
    });
    if (result.success) {
      setDetailsModalOpen(false);
    }
  };

  const handleReturn = (issuedBookId) => {
    const result = returnBook(issuedBookId);
    setSnackbar({
      open: true,
      message: result.message,
      severity: result.success ? 'success' : 'error',
    });
  };

  const handleRenew = (issuedBookId) => {
    const result = renewBook(issuedBookId);
    setSnackbar({
      open: true,
      message: result.message,
      severity: result.success ? 'success' : 'info',
    });
  };

  const handleCancelReservation = (reservationId) => {
    const index = myReservedBooks.findIndex(r => r.id === reservationId);
    if (index !== -1) {
      const reservation = myReservedBooks[index];
      const book = libraryBooks.find(b => b.id === reservation.bookId);
      if (book) {
        book.availableCopies++;
      }
      myReservedBooks.splice(index, 1);
      setSnackbar({ open: true, message: 'Reservation cancelled', severity: 'info' });
    }
  };

  const handleViewDetails = (book) => {
    setSelectedBook(book);
    setDetailsModalOpen(true);
  };

  const categories = ['All', 'Computer Science', 'Information Technology', 'Business', 'Science', 'Mathematics'];
  const availabilityOptions = ['All', 'Available', 'Issued'];
  const languages = ['All', 'English', 'Urdu'];

  if (loading) {
    return (
      <Box sx={{ pb: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Digital Library Catalog
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Loading your books...
          </Typography>
        </Box>
        <GridSkeleton items={12} columns={{ xs: 12, sm: 6, md: 4, lg: 3 }} />
      </Box>
    );
  }

  return (
    <Box className="page-container" component={motion.div} {...pageTransition}>
      {/* Enhanced Header */}
      <Box 
        sx={{ 
          mb: 4,
          p: 4,
          borderRadius: 3,
          background: theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, rgba(103,58,183,0.15) 0%, rgba(63,81,181,0.15) 50%, rgba(25,118,210,0.15) 100%)'
            : 'linear-gradient(135deg, rgba(103,58,183,0.08) 0%, rgba(63,81,181,0.08) 50%, rgba(25,118,210,0.08) 100%)',
          border: '1px solid',
          borderColor: theme.palette.mode === 'dark' ? 'rgba(144,202,249,0.2)' : 'rgba(25,118,210,0.2)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 16px rgba(102,126,234,0.4)',
              }}
            >
              <LocalLibrary sx={{ fontSize: 32, color: 'white' }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                Digital Library Catalog
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Browse {libraryBooks.length * 100}+ books and digital resources
              </Typography>
            </Box>
          </Stack>
        </Box>
        
        {/* Decorative Corner Markers */}
        <Box sx={{ 
          position: 'absolute', 
          top: 0, 
          right: 0, 
          width: 120, 
          height: 120,
          borderRadius: '0 24px 0 0',
          background: 'linear-gradient(135deg, rgba(102,126,234,0.1) 0%, transparent 100%)',
        }} />
      </Box>

      {/* Overdue Warning */}
      <AnimatePresence>
        {overdueBooks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Alert
              severity="error"
              sx={{ 
                mb: 3,
                borderRadius: 2,
                border: '2px solid',
                borderColor: 'error.main',
                boxShadow: '0 4px 12px rgba(211,47,47,0.2)',
              }}
              action={
                <Button 
                  color="inherit" 
                  size="small" 
                  startIcon={<Payment />}
                  sx={{ fontWeight: 600 }}
                >
                  Pay Fine
                </Button>
              }
            >
              <Typography variant="subtitle2" fontWeight="bold">
                ⚠️ Overdue Books Alert!
              </Typography>
              <Typography variant="body2">
                You have {overdueBooks.length} overdue book(s). Total Fine: PKR {totalFines}
              </Typography>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }} component={motion.div} variants={staggerContainer} initial="initial" animate="animate">
        <Grid size={{ xs: 12, sm: 6, md: 3 }} component={motion.div} variants={fadeInUp}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: 3,
              border: '2px solid rgba(255,255,255,0.1)',
              boxShadow: '0 8px 24px rgba(102,126,234,0.35)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 2,
                    background: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <MenuBook sx={{ fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 600 }}>
                    Books Issued
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {issuedBooksCount}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }} component={motion.div} variants={fadeInUp}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
              color: 'white',
              borderRadius: 3,
              border: '2px solid rgba(255,255,255,0.1)',
              boxShadow: '0 8px 24px rgba(17,153,142,0.35)',
            }}
          >
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 2,
                    background: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <CheckCircle sx={{ fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 600 }}>
                    Available Books
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {availableBooks}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }} component={motion.div} variants={fadeInUp}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              borderRadius: 3,
              border: '2px solid rgba(255,255,255,0.1)',
              boxShadow: '0 8px 24px rgba(240,147,251,0.35)',
            }}
          >
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 2,
                    background: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <Warning sx={{ fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 600 }}>
                    Overdue Books
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {overdueBooks.length}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }} component={motion.div} variants={fadeInUp}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
              color: 'white',
              borderRadius: 3,
              border: '2px solid rgba(255,255,255,0.1)',
              boxShadow: '0 8px 24px rgba(250,112,154,0.35)',
            }}
          >
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 2,
                    background: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <Payment sx={{ fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 600 }}>
                    Total Fines
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    ₨{totalFines}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Enhanced Tabs */}
      <Card 
        sx={{ 
          mb: 3, 
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: theme.palette.mode === 'dark'
            ? '0 4px 12px rgba(0,0,0,0.4)'
            : '0 4px 12px rgba(0,0,0,0.08)',
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{ 
            borderBottom: 1, 
            borderColor: 'divider',
            '& .MuiTab-root': {
              fontWeight: 600,
              textTransform: 'none',
              fontSize: '1rem',
            },
          }}
        >
          <Tab icon={<LibraryBooks />} label="Browse Books" iconPosition="start" />
          <Tab icon={<MenuBook />} label="My Books" iconPosition="start" />
        </Tabs>
      </Card>

      {/* TAB 1: Browse Books */}
      {activeTab === 0 && (
        <Box>
          {/* Enhanced Search & Filter Card */}
          <Card 
            sx={{ 
              mb: 3,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              background: theme.palette.mode === 'dark'
                ? 'rgba(255,255,255,0.02)'
                : 'rgba(255,255,255,0.9)',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={3}>
                <TextField
                  fullWidth
                  placeholder="Search by title, author, ISBN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                      background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#ffffff',
                    },
                  }}
                />
                
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <FilterList color="primary" />
                    <Typography variant="subtitle2" fontWeight="bold">
                      Filters
                    </Typography>
                  </Box>
                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 80 }}>
                        Category:
                      </Typography>
                      {categories.map((cat) => (
                        <Chip
                          key={cat}
                          label={cat}
                          onClick={() => setCategoryFilter(cat)}
                          sx={{
                            fontWeight: 600,
                            ...(categoryFilter === cat && {
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              color: 'white',
                            }),
                          }}
                          color={categoryFilter === cat ? undefined : 'default'}
                          variant={categoryFilter === cat ? undefined : 'outlined'}
                          size="small"
                        />
                      ))}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 80 }}>
                        Availability:
                      </Typography>
                      {availabilityOptions.map((opt) => (
                        <Chip
                          key={opt}
                          label={opt}
                          onClick={() => setAvailabilityFilter(opt)}
                          sx={{
                            fontWeight: 600,
                            ...(availabilityFilter === opt && {
                              background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                              color: 'white',
                            }),
                          }}
                          color={availabilityFilter === opt ? undefined : 'default'}
                          variant={availabilityFilter === opt ? undefined : 'outlined'}
                          size="small"
                        />
                      ))}
                    </Box>
                  </Stack>
                </Box>

                <FormControl fullWidth size="small">
                  <InputLabel>Sort By</InputLabel>
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    label="Sort By"
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="title">Title (A-Z)</MenuItem>
                    <MenuItem value="author">Author (A-Z)</MenuItem>
                    <MenuItem value="newest">Newest First</MenuItem>
                    <MenuItem value="popular">Most Popular</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </CardContent>
          </Card>

          {/* Book Grid */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">
              {filteredBooks.length} books found
            </Typography>
          </Box>
          <Grid 
            container 
            spacing={3} 
            component={motion.div} 
            variants={staggerContainer} 
            initial="initial" 
            animate="animate"
          >
            {filteredBooks.map((book) => (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={book.id} component={motion.div} variants={fadeInUp}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: theme.palette.mode === 'dark'
                        ? '0 12px 32px rgba(0,0,0,0.5)'
                        : '0 12px 32px rgba(25,118,210,0.2)',
                      borderColor: 'primary.main',
                    },
                  }}
                >
                  <Box sx={{ position: 'relative' }}>
                    <CardMedia
                      component="img"
                      height="280"
                      image={book.coverImage}
                      alt={book.title}
                      sx={{ objectFit: 'cover' }}
                    />
                    <Chip
                      label={book.availableCopies > 0 ? 'Available' : 'Issued'}
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        fontWeight: 'bold',
                        background: book.availableCopies > 0 
                          ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
                          : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                        color: 'white',
                        border: '2px solid rgba(255,255,255,0.3)',
                      }}
                    />
                  </Box>
                  <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 2.5 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom noWrap>
                      {book.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      by {book.author}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" gutterBottom>
                      ISBN: {book.isbn}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 0.5, my: 1.5, flexWrap: 'wrap' }}>
                      <Chip 
                        label={book.category} 
                        size="small" 
                        sx={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          fontWeight: 600,
                        }}
                      />
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                      <Rating value={book.ratings} readOnly size="small" precision={0.1} />
                      <Typography variant="caption" color="text.secondary">
                        ({book.reviews})
                      </Typography>
                    </Box>

                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {book.availableCopies}/{book.totalCopies} copies available
                    </Typography>

                    <Box sx={{ mt: 'auto', display: 'flex', gap: 1, flexDirection: 'column' }}>
                      <Button
                        fullWidth
                        variant="contained"
                        size="small"
                        onClick={() => handleViewDetails(book)}
                        startIcon={<Visibility />}
                        sx={{
                          borderRadius: 2,
                          fontWeight: 600,
                          textTransform: 'none',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                          },
                        }}
                      >
                        View Details
                      </Button>
                      {book.availableCopies > 0 ? (
                        <Button
                          fullWidth
                          variant="outlined"
                          size="small"
                          onClick={() => handleReserve(book.id)}
                          startIcon={<BookmarkAdd />}
                          sx={{
                            borderRadius: 2,
                            fontWeight: 600,
                            textTransform: 'none',
                          }}
                        >
                          Reserve
                        </Button>
                      ) : (
                        <Button fullWidth variant="outlined" size="small" disabled sx={{ borderRadius: 2 }}>
                          Not Available
                        </Button>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* TAB 2: My Books */}
      {activeTab === 1 && (
        <Box>
          {/* Currently Issued Books */}
          <Card sx={{ mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Currently Issued Books ({myIssuedBooks.length})
              </Typography>
              <Divider sx={{ mb: 3 }} />
              {myIssuedBooks.length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Book Title</strong></TableCell>
                        <TableCell><strong>Issue Date</strong></TableCell>
                        <TableCell><strong>Due Date</strong></TableCell>
                        <TableCell align="right"><strong>Fine</strong></TableCell>
                        <TableCell align="right"><strong>Actions</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {myIssuedBooks.map((book) => {
                        const fine = calculateFine(book.dueDate);
                        const daysLeft = Math.ceil((new Date(book.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
                        return (
                          <TableRow key={book.id}>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {book.bookTitle}
                              </Typography>
                            </TableCell>
                            <TableCell>{book.issueDate}</TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {book.dueDate}
                                {daysLeft < 0 && (
                                  <Chip 
                                    label="Overdue" 
                                    size="small" 
                                    sx={{
                                      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                      color: 'white',
                                      fontWeight: 600,
                                    }}
                                  />
                                )}
                                {daysLeft >= 0 && daysLeft <= 3 && (
                                  <Chip 
                                    label={`${daysLeft} days left`} 
                                    size="small" 
                                    sx={{
                                      background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                                      color: 'white',
                                      fontWeight: 600,
                                    }}
                                  />
                                )}
                              </Box>
                            </TableCell>
                            <TableCell align="right">
                              {fine > 0 ? (
                                <Chip 
                                  label={`PKR ${fine}`} 
                                  size="small" 
                                  sx={{
                                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                    color: 'white',
                                    fontWeight: 600,
                                  }}
                                />
                              ) : (
                                <Chip 
                                  label="PKR 0" 
                                  size="small" 
                                  sx={{
                                    background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                                    color: 'white',
                                    fontWeight: 600,
                                  }}
                                />
                              )}
                            </TableCell>
                            <TableCell align="right">
                              <Tooltip title="Return Book">
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleReturn(book.id)} 
                                  sx={{
                                    color: 'success.main',
                                    '&:hover': { background: alpha(theme.palette.success.main, 0.1) },
                                  }}
                                >
                                  <CheckCircle />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Renew">
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleRenew(book.id)} 
                                  sx={{
                                    color: 'info.main',
                                    '&:hover': { background: alpha(theme.palette.info.main, 0.1) },
                                  }}
                                >
                                  <Replay />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  No books currently issued
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Reserved Books */}
          <Card sx={{ mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Reserved Books ({myReservedBooks.length})
              </Typography>
              <Divider sx={{ mb: 3 }} />
              {myReservedBooks.length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Book Title</strong></TableCell>
                        <TableCell><strong>Reserved Date</strong></TableCell>
                        <TableCell><strong>Expires On</strong></TableCell>
                        <TableCell align="right"><strong>Actions</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {myReservedBooks.map((reservation) => (
                        <TableRow key={reservation.id}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {reservation.bookTitle}
                            </Typography>
                          </TableCell>
                          <TableCell>{reservation.reservedDate}</TableCell>
                          <TableCell>{reservation.expiresOn}</TableCell>
                          <TableCell align="right">
                            <Tooltip title="Cancel Reservation">
                              <IconButton
                                size="small"
                                onClick={() => handleCancelReservation(reservation.id)}
                                sx={{
                                  color: 'error.main',
                                  '&:hover': { background: alpha(theme.palette.error.main, 0.1) },
                                }}
                              >
                                <CancelIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  No reserved books
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Reading History */}
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Reading History ({readingHistory.length})
              </Typography>
              <Divider sx={{ mb: 3 }} />
              <Timeline position="right">
                {readingHistory.map((record, index) => (
                  <TimelineItem key={record.id}>
                    <TimelineSeparator>
                      <TimelineDot 
                        sx={{
                          background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                        }}
                      >
                        <CheckCircle sx={{ color: 'white' }} />
                      </TimelineDot>
                      {index < readingHistory.length - 1 && <TimelineConnector />}
                    </TimelineSeparator>
                    <TimelineContent>
                      <Paper 
                        elevation={2} 
                        sx={{ 
                          p: 2.5, 
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Typography variant="subtitle2" fontWeight="bold">
                          {record.bookTitle}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Issued: {record.issueDate} • Returned: {record.returnDate}
                        </Typography>
                      </Paper>
                    </TimelineContent>
                  </TimelineItem>
                ))}
              </Timeline>
              <Button 
                fullWidth 
                variant="outlined" 
                startIcon={<Download />} 
                sx={{ 
                  mt: 3, 
                  borderRadius: 2,
                  fontWeight: 600,
                  textTransform: 'none',
                }}
              >
                Export Reading History
              </Button>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Book Details Modal - Enhanced */}
      <Dialog
        open={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
          },
        }}
      >
        {selectedBook && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5" fontWeight="bold">
                  Book Details
                </Typography>
                <IconButton onClick={() => setDetailsModalOpen(false)}>
                  <Close />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <img
                    src={selectedBook.coverImage}
                    alt={selectedBook.title}
                    style={{ 
                      width: '100%', 
                      borderRadius: '12px', 
                      boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                      border: '1px solid rgba(0,0,0,0.1)',
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 8 }}>
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                    {selectedBook.title}
                  </Typography>
                  <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                    by {selectedBook.author}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Rating value={selectedBook.ratings} readOnly precision={0.1} />
                    <Typography variant="body2" color="text.secondary">
                      {selectedBook.ratings} ({selectedBook.reviews} reviews)
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Grid container spacing={2}>
                    <Grid size={6}>
                      <Typography variant="caption" color="text.secondary">Publisher</Typography>
                      <Typography variant="body2" fontWeight="bold">{selectedBook.publisher}</Typography>
                    </Grid>
                    <Grid size={6}>
                      <Typography variant="caption" color="text.secondary">Year</Typography>
                      <Typography variant="body2" fontWeight="bold">{selectedBook.year}</Typography>
                    </Grid>
                    <Grid size={6}>
                      <Typography variant="caption" color="text.secondary">ISBN</Typography>
                      <Typography variant="body2" fontWeight="bold">{selectedBook.isbn}</Typography>
                    </Grid>
                    <Grid size={6}>
                      <Typography variant="caption" color="text.secondary">Pages</Typography>
                      <Typography variant="body2" fontWeight="bold">{selectedBook.pages}</Typography>
                    </Grid>
                    <Grid size={6}>
                      <Typography variant="caption" color="text.secondary">Category</Typography>
                      <Chip 
                        label={selectedBook.category} 
                        size="small" 
                        sx={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          fontWeight: 600,
                        }}
                      />
                    </Grid>
                    <Grid size={6}>
                      <Typography variant="caption" color="text.secondary">Language</Typography>
                      <Typography variant="body2" fontWeight="bold">{selectedBook.language}</Typography>
                    </Grid>
                    <Grid size={12}>
                      <Typography variant="caption" color="text.secondary">
                        <LocationOn fontSize="small" sx={{ verticalAlign: 'middle' }} /> Shelf Location
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">{selectedBook.shelfLocation}</Typography>
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Description
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {selectedBook.description}
                  </Typography>

                  <Paper 
                    sx={{ 
                      p: 2.5, 
                      borderRadius: 2,
                      background: theme.palette.mode === 'dark'
                        ? 'rgba(255,255,255,0.05)'
                        : 'rgba(0,0,0,0.02)',
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      Availability
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={6}>
                        <Typography variant="caption" color="text.secondary">Total Copies</Typography>
                        <Typography variant="h6" fontWeight="bold">{selectedBook.totalCopies}</Typography>
                      </Grid>
                      <Grid size={6}>
                        <Typography variant="caption" color="text.secondary">Available</Typography>
                        <Typography variant="h6" fontWeight="bold" color="success.main">
                          {selectedBook.availableCopies}
                        </Typography>
                      </Grid>
                    </Grid>
                    <LinearProgress
                      variant="determinate"
                      value={(selectedBook.availableCopies / selectedBook.totalCopies) * 100}
                      sx={{ 
                        mt: 2, 
                        height: 10, 
                        borderRadius: 5,
                        background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 5,
                          background: 'linear-gradient(90deg, #11998e 0%, #38ef7d 100%)',
                        },
                      }}
                    />
                  </Paper>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
              <Button onClick={() => setDetailsModalOpen(false)}>Close</Button>
              <Button variant="outlined" startIcon={<Share />} sx={{ borderRadius: 2 }}>
                Share
              </Button>
              {selectedBook.availableCopies > 0 && (
                <Button
                  variant="contained"
                  startIcon={<BookmarkAdd />}
                  onClick={() => handleReserve(selectedBook.id)}
                  sx={{
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                    },
                  }}
                >
                  Reserve Book
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* QR Scanner FAB */}
      <Fab
        sx={{ 
          position: 'fixed', 
          bottom: 24, 
          right: 24,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          boxShadow: '0 8px 16px rgba(102,126,234,0.4)',
          '&:hover': {
            background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
            boxShadow: '0 12px 24px rgba(102,126,234,0.5)',
          },
        }}
        onClick={() => setQrScannerOpen(true)}
      >
        <QrCodeScanner />
      </Fab>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          severity={snackbar.severity} 
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{ borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LibraryCatalog;
