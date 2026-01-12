import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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

  // Loading effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1400);
    return () => clearTimeout(timer);
  }, []);

  // Calculate fines
  const calculateFine = (dueDate) => {
    const due = new Date(dueDate);
    const today = new Date();
    if (today > due) {
      const daysOverdue = Math.floor((today - due) / (1000 * 60 * 60 * 24));
      return daysOverdue * 50; // PKR 50 per day
    }
    return 0;
  };

  const totalFines = myIssuedBooks.reduce((sum, book) => sum + calculateFine(book.dueDate), 0);

  // Filter and sort books
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

  // Show loading skeleton
  if (loading) {
    return (
      <Box sx={{ pb: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Digital Library
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Browse and manage your books
          </Typography>
        </Box>
        <GridSkeleton items={12} columns={{ xs: 12, sm: 6, md: 4, lg: 3 }} />
      </Box>
    );
  }

  return (
    <Box className="page-container">
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Digital Library
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Browse {libraryBooks.length * 100}+ books and resources
        </Typography>
      </Box>

      {/* Overdue Warning */}
      {overdueBooks.length > 0 && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" startIcon={<Payment />}>
              Pay Fine
            </Button>
          }
        >
          <strong>Overdue Books Alert!</strong> You have {overdueBooks.length} overdue book(s). 
          Total Fine: PKR {totalFines}
        </Alert>
      )}

      {/* Quick Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Books Issued"
            value={issuedBooksCount}
            icon={<MenuBook />}
            color="primary"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Available Books"
            value={availableBooks}
            icon={CheckCircle}
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Overdue Books"
            value={overdueBooks.length}
            icon={Warning}
            color="error"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total Fines"
            value={`PKR ${totalFines}`}
            icon={Payment}
            color="warning"
          />
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<LibraryBooks />} label="Browse Books" iconPosition="start" />
          <Tab icon={<MenuBook />} label="My Books" iconPosition="start" />
        </Tabs>
      </Card>

      {/* TAB 1: Browse Books */}
      {activeTab === 0 && (
        <Box>
          {/* Search & Filter Bar */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    placeholder="Search by title, author, ISBN..."
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
                </Grid>
                <Grid size={{ xs: 12, md: 8 }}>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                    <FilterList color="action" />
                    <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                      Category:
                    </Typography>
                    {categories.map((cat) => (
                      <Chip
                        key={cat}
                        label={cat}
                        onClick={() => setCategoryFilter(cat)}
                        color={categoryFilter === cat ? 'primary' : 'default'}
                        variant={categoryFilter === cat ? 'filled' : 'outlined'}
                        size="small"
                      />
                    ))}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mt: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                      Availability:
                    </Typography>
                    {availabilityOptions.map((opt) => (
                      <Chip
                        key={opt}
                        label={opt}
                        onClick={() => setAvailabilityFilter(opt)}
                        color={availabilityFilter === opt ? 'primary' : 'default'}
                        variant={availabilityFilter === opt ? 'filled' : 'outlined'}
                        size="small"
                      />
                    ))}
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 2, mr: 1 }}>
                      Language:
                    </Typography>
                    {languages.map((lang) => (
                      <Chip
                        key={lang}
                        label={lang}
                        onClick={() => setLanguageFilter(lang)}
                        color={languageFilter === lang ? 'primary' : 'default'}
                        variant={languageFilter === lang ? 'filled' : 'outlined'}
                        size="small"
                      />
                    ))}
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Sort By</InputLabel>
                    <Select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      label="Sort By"
                    >
                      <MenuItem value="title">Title (A-Z)</MenuItem>
                      <MenuItem value="author">Author (A-Z)</MenuItem>
                      <MenuItem value="newest">Newest First</MenuItem>
                      <MenuItem value="popular">Most Popular</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Book Grid */}
          <Typography variant="h6" gutterBottom>
            {filteredBooks.length} books found
          </Typography>
          <Grid container spacing={3} component={motion.div} variants={staggerContainer} initial="initial" animate="animate">
            {filteredBooks.map((book) => (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={book.id} component={motion.div} variants={fadeInUp}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    '&:hover': {
                      boxShadow: 6,
                      transform: 'translateY(-4px)',
                      transition: 'all 0.3s',
                    },
                  }}
                >
                  <CardMedia
                    component="img"
                    height="250"
                    image={book.coverImage}
                    alt={book.title}
                    sx={{ objectFit: 'cover' }}
                  />
                  <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom noWrap>
                      {book.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      by {book.author}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" gutterBottom>
                      ISBN: {book.isbn}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 0.5, my: 1, flexWrap: 'wrap' }}>
                      <Chip label={book.category} size="small" color="primary" variant="outlined" />
                      <Chip
                        label={book.availableCopies > 0 ? 'Available' : 'Issued'}
                        size="small"
                        color={book.availableCopies > 0 ? 'success' : 'warning'}
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
                        >
                          Reserve
                        </Button>
                      ) : (
                        <Button fullWidth variant="outlined" size="small" disabled>
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
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Currently Issued Books ({myIssuedBooks.length})
              </Typography>
              <Divider sx={{ mb: 2 }} />
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
                            <TableCell>{book.bookTitle}</TableCell>
                            <TableCell>{book.issueDate}</TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {book.dueDate}
                                {daysLeft < 0 && (
                                  <Chip label="Overdue" size="small" color="error" />
                                )}
                                {daysLeft >= 0 && daysLeft <= 3 && (
                                  <Chip label={`${daysLeft} days left`} size="small" color="warning" />
                                )}
                              </Box>
                            </TableCell>
                            <TableCell align="right">
                              {fine > 0 ? (
                                <Chip label={`PKR ${fine}`} size="small" color="error" />
                              ) : (
                                <Chip label="PKR 0" size="small" color="success" />
                              )}
                            </TableCell>
                            <TableCell align="right">
                              <Tooltip title="Return Book">
                                <IconButton size="small" onClick={() => handleReturn(book.id)} color="primary">
                                  <CheckCircle />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Renew">
                                <IconButton size="small" onClick={() => handleRenew(book.id)} color="info">
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
                <Alert severity="info">No books currently issued</Alert>
              )}
            </CardContent>
          </Card>

          {/* Reserved Books */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Reserved Books ({myReservedBooks.length})
              </Typography>
              <Divider sx={{ mb: 2 }} />
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
                          <TableCell>{reservation.bookTitle}</TableCell>
                          <TableCell>{reservation.reservedDate}</TableCell>
                          <TableCell>{reservation.expiresOn}</TableCell>
                          <TableCell align="right">
                            <Tooltip title="Cancel Reservation">
                              <IconButton
                                size="small"
                                onClick={() => handleCancelReservation(reservation.id)}
                                color="error"
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
                <Alert severity="info">No reserved books</Alert>
              )}
            </CardContent>
          </Card>

          {/* Reading History */}
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Reading History ({readingHistory.length})
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Timeline position="right">
                {readingHistory.map((record, index) => (
                  <TimelineItem key={record.id}>
                    <TimelineSeparator>
                      <TimelineDot color="success">
                        <CheckCircle />
                      </TimelineDot>
                      {index < readingHistory.length - 1 && <TimelineConnector />}
                    </TimelineSeparator>
                    <TimelineContent>
                      <Paper elevation={2} sx={{ p: 2 }}>
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
              <Button fullWidth variant="outlined" startIcon={<Download />} sx={{ mt: 2 }}>
                Export Reading History
              </Button>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Book Details Modal */}
      <Dialog
        open={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        maxWidth="md"
        fullWidth
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
            <DialogContent>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <img
                    src={selectedBook.coverImage}
                    alt={selectedBook.title}
                    style={{ width: '100%', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)' }}
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
                      <Chip label={selectedBook.category} size="small" color="primary" />
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

                  <Paper sx={{ p: 2, backgroundColor: 'action.hover' }}>
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
                      sx={{ mt: 2, height: 8, borderRadius: 4 }}
                    />
                  </Paper>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
              <Button onClick={() => setDetailsModalOpen(false)}>Close</Button>
              <Button variant="outlined" startIcon={<Share />}>
                Share
              </Button>
              <Button variant="outlined" startIcon={<BookmarkAdd />}>
                Add to Wishlist
              </Button>
              {selectedBook.availableCopies > 0 && (
                <Button
                  variant="contained"
                  startIcon={<BookmarkAdd />}
                  onClick={() => handleReserve(selectedBook.id)}
                >
                  Reserve Book
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* QR Scanner Modal */}
      <Dialog open={qrScannerOpen} onClose={() => setQrScannerOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight="bold">
              Scan Book QR Code
            </Typography>
            <IconButton onClick={() => setQrScannerOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              height: 400,
              backgroundColor: 'black',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant="h6" color="white">
              📷 Camera View
            </Typography>
          </Box>
          <Alert severity="info" sx={{ mt: 2 }}>
            Position the QR code within the camera frame. The book details will be fetched automatically.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrScannerOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* QR Scanner FAB */}
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 24, right: 24 }}
        onClick={() => setQrScannerOpen(true)}
      >
        <QrCodeScanner />
      </Fab>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LibraryCatalog;
