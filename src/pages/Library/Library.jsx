import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  Button,
  Chip,
  Stack,
  MenuItem,
  Divider,
  useTheme,
  IconButton,
  Tooltip,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Search,
  Bookmark,
  LibraryBooks,
  FilterList,
  AutoStories,
  MenuBook,
  LocalLibrary,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import PageTransition from '../../components/Common/PageTransition';
import EmptyState from '../../components/Common/EmptyState';
import { CardSkeleton } from '../../components/Common/LoadingSkeleton';
import { useSnackbar } from '../../contexts/SnackbarContext';
import {
  libraryBooks,
  myIssuedBooks,
  myReservedBooks,
  reserveBook,
} from '../../data/dummyData';
import { fadeInUp, staggerContainer } from '../../utils/animations';

const Library = () => {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [availabilityFilter, setAvailabilityFilter] = useState('All');
  const [reserveDialog, setReserveDialog] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(timer);
  }, []);

  const issuedLimitReached = myIssuedBooks.length >= 3;

  const categories = useMemo(() => {
    const unique = new Set(libraryBooks.map((b) => b.category));
    return ['All', ...Array.from(unique)];
  }, []);

  const filteredBooks = useMemo(() => {
    let data = [...libraryBooks];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          b.isbn.toLowerCase().includes(q)
      );
    }

    if (categoryFilter !== 'All') {
      data = data.filter((b) => b.category === categoryFilter);
    }

    if (availabilityFilter !== 'All') {
      data = data.filter((b) =>
        availabilityFilter === 'Available'
          ? b.availableCopies > 0
          : b.availableCopies === 0
      );
    }

    return data;
  }, [searchQuery, categoryFilter, availabilityFilter]);

  const handleReserve = (book) => {
    if (issuedLimitReached) {
      showSnackbar('You have reached the maximum issued books limit (3).', 'warning');
      return;
    }
    setSelectedBook(book);
    setReserveDialog(true);
  };

  const confirmReservation = () => {
    const result = reserveBook(selectedBook.id);
    showSnackbar(result.message, result.success ? 'success' : 'error');
    setReserveDialog(false);
    setSelectedBook(null);
  };

  if (loading) {
    return (
      <Box className="page-container">
        <Typography variant="h4" sx={{ mb: 3 }}>Loading...</Typography>
        <CardSkeleton count={3} />
      </Box>
    );
  }

  return (
    <PageTransition>
      <Box className="page-container">
        {/* HEADER */}
        <Box 
          sx={{ 
            mb: 4,
            p: 4,
            borderRadius: 3,
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(102,126,234,0.12) 0%, rgba(118,75,162,0.12) 100%)'
              : 'linear-gradient(135deg, rgba(102,126,234,0.08) 0%, rgba(118,75,162,0.08) 100%)',
            border: '1px solid',
            borderColor: theme.palette.mode === 'dark' ? 'rgba(102,126,234,0.2)' : 'rgba(102,126,234,0.15)',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 16px rgba(102,126,234,0.4)',
              }}
            >
              <LocalLibrary sx={{ fontSize: 36, color: 'white' }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="bold">
                Library Portal
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Browse and reserve books from our extensive collection
              </Typography>
            </Box>
          </Stack>
        </Box>

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
          <Grid size={{ xs: 12, sm: 6, md: 3 }} component={motion.div} variants={fadeInUp}>
            <Card sx={{ height: '100%', borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="flex-start" justifyContent="space-between">
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h4" component="div" fontWeight="bold" sx={{ mb: 0.5 }}>
                      {libraryBooks.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Total Books
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      backgroundColor: 'primary.main',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <LibraryBooks sx={{ fontSize: 24 }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }} component={motion.div} variants={fadeInUp}>
            <Card sx={{ height: '100%', borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="flex-start" justifyContent="space-between">
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h4" component="div" fontWeight="bold" sx={{ mb: 0.5 }}>
                      {libraryBooks.filter(b => b.availableCopies > 0).length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Available Now
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      backgroundColor: 'success.main',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CheckCircleIcon sx={{ fontSize: 24 }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }} component={motion.div} variants={fadeInUp}>
            <Card sx={{ height: '100%', borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="flex-start" justifyContent="space-between">
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h4" component="div" fontWeight="bold" sx={{ mb: 0.5 }}>
                      {myIssuedBooks.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Issued to You
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      backgroundColor: 'info.main',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MenuBook sx={{ fontSize: 24 }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }} component={motion.div} variants={fadeInUp}>
            <Card sx={{ height: '100%', borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="flex-start" justifyContent="space-between">
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h4" component="div" fontWeight="bold" sx={{ mb: 0.5 }}>
                      {myReservedBooks.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Reserved
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      backgroundColor: 'warning.main',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Bookmark sx={{ fontSize: 24 }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* LARGE PROMINENT SEARCH BAR */}
        <Card
          sx={{
            mb: 4,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: theme.palette.mode === 'dark'
              ? '0 8px 24px rgba(0,0,0,0.3)'
              : '0 8px 24px rgba(0,0,0,0.08)',
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Find Your Books
                </Typography>
                <TextField
                  fullWidth
                  placeholder="Search by Title, Author, or ISBN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ fontSize: 28, color: 'primary.main' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      fontSize: '1.1rem',
                      py: 0.5,
                    },
                  }}
                />
              </Box>

              {/* FILTER SECTION */}
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    select
                    fullWidth
                    label="Category"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <FilterList sx={{ color: 'primary.main' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      },
                    }}
                  >
                    {categories.map((cat) => (
                      <MenuItem key={cat} value={cat}>
                        {cat}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    select
                    fullWidth
                    label="Availability"
                    value={availabilityFilter}
                    onChange={(e) => setAvailabilityFilter(e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      },
                    }}
                  >
                    <MenuItem value="All">All</MenuItem>
                    <MenuItem value="Available">Available</MenuItem>
                    <MenuItem value="Out">Out of Stock</MenuItem>
                  </TextField>
                </Grid>
              </Grid>
            </Stack>
          </CardContent>
        </Card>

        {/* BOOK CARDS IN GRID */}
        {filteredBooks.length === 0 ? (
          <EmptyState
            icon="books"
            title="No books found"
            message="Try adjusting your filters or search query."
          />
        ) : (
          <Box
            component={motion.div}
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
              {filteredBooks.length} {filteredBooks.length === 1 ? 'Book' : 'Books'} Found
            </Typography>
            <Grid container spacing={3}>
              {filteredBooks.map((book) => {
                const isAvailable = book.availableCopies > 0;
                return (
                  <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={book.id} component={motion.div} variants={fadeInUp}>
                    <Card
                      sx={{
                        height: '100%',
                        minHeight: 460,
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: theme.palette.mode === 'dark' 
                          ? 'rgba(102,126,234,0.15)' 
                          : 'rgba(102,126,234,0.12)',
                        background: theme.palette.mode === 'dark'
                          ? 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)'
                          : 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.95) 100%)',
                        boxShadow: theme.palette.mode === 'dark'
                          ? '0 8px 24px rgba(0,0,0,0.3)'
                          : '0 8px 24px rgba(102,126,234,0.12)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        overflow: 'hidden',
                        '&:hover': {
                          transform: 'translateY(-6px)',
                          boxShadow: theme.palette.mode === 'dark'
                            ? '0 12px 32px rgba(0,0,0,0.4)'
                            : '0 12px 32px rgba(102,126,234,0.2)',
                          borderColor: 'primary.main',
                        },
                      }}
                    >
                      {/* BOOK COVER IMAGE - Fixed Height */}
                      <Box
                        sx={{
                          position: 'relative',
                          width: '100%',
                          height: 220,
                          overflow: 'hidden',
                          background: theme.palette.mode === 'dark' 
                            ? 'rgba(102,126,234,0.15)' 
                            : 'rgba(102,126,234,0.08)',
                        }}
                      >
                        <Box
                          component="img"
                          src={book.coverImage}
                          alt={book.title}
                          sx={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                        {/* AVAILABILITY BADGE */}
                        <Chip
                          label={isAvailable ? `${book.availableCopies} Available` : 'Out of Stock'}
                          size="small"
                          sx={{
                            position: 'absolute',
                            top: 12,
                            right: 12,
                            fontWeight: 'bold',
                            background: isAvailable 
                              ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
                              : 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                            color: 'white',
                            border: '2px solid rgba(255,255,255,0.3)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                          }}
                        />
                      </Box>

                      <CardContent sx={{ 
                        p: 2, 
                        flexGrow: 1, 
                        display: 'flex', 
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}>
                        <Box>
                          {/* TITLE - Fixed 2 lines */}
                          <Typography 
                            variant="h6" 
                            fontWeight="bold" 
                            sx={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              height: '3.6em',
                              lineHeight: 1.8,
                              mb: 1.5,
                            }}
                          >
                            {book.title}
                          </Typography>

                          {/* AUTHOR */}
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                            <AutoStories sx={{ fontSize: 16, color: 'primary.main' }} />
                            <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {book.author}
                            </Typography>
                          </Stack>

                          {/* CATEGORY & SHELF */}
                          <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                            <Chip
                              label={book.category}
                              size="small"
                              sx={{
                                height: 24,
                                fontSize: '0.7rem',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                fontWeight: 600,
                              }}
                            />
                          </Stack>
                          
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            📍 {book.shelfLocation}
                          </Typography>
                        </Box>

                        {/* WARNING MESSAGE */}
                        {issuedLimitReached && (
                          <Box
                            sx={{
                              mt: 1.5,
                              p: 1,
                              borderRadius: 1,
                              background: alpha(theme.palette.warning.main, 0.1),
                              border: '1px solid',
                              borderColor: 'warning.main',
                            }}
                          >
                            <Typography variant="caption" color="warning.main" fontWeight={600}>
                              ⚠️ Limit reached (3 books max)
                            </Typography>
                          </Box>
                        )}

                        {/* RESERVE BUTTON */}
                        <Button
                          variant="contained"
                          fullWidth
                          startIcon={<Bookmark />}
                          disabled={!isAvailable || issuedLimitReached}
                          onClick={() => handleReserve(book)}
                          sx={{
                            mt: 2,
                            py: 1,
                            borderRadius: 2,
                            fontWeight: 'bold',
                            background: isAvailable 
                              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                              : 'grey.300',
                            '&:hover': {
                              background: isAvailable 
                                ? 'linear-gradient(135deg, #5568d3 0%, #654391 100%)'
                                : 'grey.300',
                            },
                          }}
                        >
                          {isAvailable ? 'Reserve Book' : 'Not Available'}
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        )}

        {/* RESERVATION CONFIRMATION DIALOG */}
        <Dialog 
          open={reserveDialog} 
          onClose={() => setReserveDialog(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              p: 1,
            }
          }}
        >
          <DialogTitle>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bookmark sx={{ fontSize: 32, color: 'white' }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight="bold">
                  Confirm Book Reservation
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedBook?.title}
                </Typography>
              </Box>
            </Stack>
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <Box
              sx={{
                p: 3,
                borderRadius: 2,
                background: theme.palette.mode === 'dark'
                  ? alpha(theme.palette.primary.main, 0.1)
                  : alpha(theme.palette.primary.main, 0.05),
                border: '1px solid',
                borderColor: alpha(theme.palette.primary.main, 0.2),
              }}
            >
              <Stack spacing={2}>
                <Typography variant="body1" fontWeight={600}>
                  Reservation Details:
                </Typography>
                <Stack spacing={1}>
                  <Typography variant="body2">
                    📚 <strong>Book:</strong> {selectedBook?.title}
                  </Typography>
                  <Typography variant="body2">
                    ✍️ <strong>Author:</strong> {selectedBook?.author}
                  </Typography>
                  <Typography variant="body2">
                    📍 <strong>Location:</strong> {selectedBook?.shelfLocation}
                  </Typography>
                  <Typography variant="body2">
                    📋 <strong>ISBN:</strong> {selectedBook?.isbn}
                  </Typography>
                </Stack>
                <Divider />
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    background: alpha(theme.palette.warning.main, 0.1),
                    border: '1px solid',
                    borderColor: 'warning.main',
                  }}
                >
                  <Typography variant="body2" color="warning.main" fontWeight={600} gutterBottom>
                    ⏰ Important: 24-Hour Pickup Window
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    You must pick up this book from the library within 24 hours of reservation. 
                    The reservation will be automatically cancelled if not collected within this timeframe.
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Current issued books: {myIssuedBooks.length} / 3
                </Typography>
              </Stack>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 2 }}>
            <Button 
              onClick={() => setReserveDialog(false)}
              sx={{ borderRadius: 2 }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={confirmReservation}
              startIcon={<Bookmark />}
              sx={{
                borderRadius: 2,
                px: 3,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5568d3 0%, #654391 100%)',
                },
              }}
            >
              Confirm Reservation
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageTransition>
  );
};

export default Library;
