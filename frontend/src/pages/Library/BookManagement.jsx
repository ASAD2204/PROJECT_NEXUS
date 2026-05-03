import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Stack,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Snackbar,
  Alert,
  Avatar,
  alpha,
  useTheme,
  CircularProgress,
  FormHelperText,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  MenuBook as BookIcon,
  Category as CategoryIcon,
  Inventory as InventoryIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  PhotoCamera,
} from '@mui/icons-material';
import PageHeader from '../../components/Common/PageHeader';
import StatCard from '../../components/Common/StatCard';
import { motion } from 'framer-motion';
import { pageTransition } from '../../utils/animations';
import { libraryAPI } from '../../api/library';

const BookManagement = () => {
  const theme = useTheme();
  const [openDialog, setOpenDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [editingBook, setEditingBook] = useState(null);
  const [saving, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    category: '',
    publisher: '',
    publication_year: '',
    total_copies: 1,
    available_copies: 1,
    shelf_location: '',
    cover_image: '',
    description: '',
    language: 'English',
    pages: '',
  });

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const res = await libraryAPI.searchBooks();
      setBooks(res.data?.books || res.data || []);
    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: 'Failed to load books', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setSnackbar({ open: true, message: 'Image size should be less than 2MB', severity: 'warning' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, cover_image: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim()) errors.title = 'Title is required';
    if (!formData.author.trim()) errors.author = 'Author is required';
    if (!formData.isbn.trim()) errors.isbn = 'ISBN is required';
    if (!formData.category) errors.category = 'Category is required';
    if (!formData.total_copies || formData.total_copies < 1) errors.total_copies = 'Total copies must be at least 1';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenDialog = (book = null) => {
    setFormErrors({});
    if (book) {
      setEditingBook(book);
      setFormData({
        title: book.title || '',
        author: book.author || '',
        isbn: book.isbn || '',
        category: book.category || '',
        publisher: book.publisher || '',
        publication_year: book.publication_year || book.yearPublished || '',
        total_copies: book.total_copies || book.totalCopies || 1,
        available_copies: book.available_copies || book.availableCopies || 1,
        shelf_location: book.shelf_location || book.shelfLocation || '',
        cover_image: book.cover_image || book.coverImage || '',
        description: book.description || '',
        language: book.language || 'English',
        pages: book.pages || '',
      });
    } else {
      setEditingBook(null);
      setFormData({
        title: '',
        author: '',
        isbn: '',
        category: '',
        publisher: '',
        publication_year: '',
        total_copies: 1,
        available_copies: 1,
        shelf_location: '',
        cover_image: '',
        description: '',
        language: 'English',
        pages: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    if (saving) return;
    setOpenDialog(false);
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      if (editingBook) {
        await libraryAPI.updateBook(editingBook.id || editingBook.book_id, formData);
        setSnackbar({ open: true, message: 'Book updated successfully!', severity: 'success' });
      } else {
        await libraryAPI.addBook(formData);
        setSnackbar({ open: true, message: 'Book added successfully!', severity: 'success' });
      }
      await fetchBooks();
      setOpenDialog(false);
    } catch (e) {
      console.error(e);
      const detail = e.response?.data?.detail;
      setSnackbar({ 
        open: true, 
        message: typeof detail === 'string' ? detail : 'Failed to save book. Please check ISBN uniqueness.', 
        severity: 'error' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this book?')) return;
    try {
      await libraryAPI.deleteBook(id);
      setSnackbar({ open: true, message: 'Book deleted successfully!', severity: 'success' });
      await fetchBooks();
    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: 'Failed to delete book', severity: 'error' });
    }
  };

  const handleExport = async () => {
    try {
      const response = await libraryAPI.exportBooks();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `library_catalog_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      setSnackbar({ open: true, message: 'Export failed', severity: 'error' });
    }
  };

  const stats = [
    { 
      title: 'Total Titles', 
      value: books.length.toString(), 
      subtitle: 'Distinct titles', 
      color: 'primary', 
      icon: BookIcon 
    },
    { 
      title: 'Total Copies', 
      value: books.reduce((sum, b) => sum + (b.total_copies || b.totalCopies || 0), 0).toString(), 
      subtitle: 'Physical inventory', 
      color: 'info', 
      icon: InventoryIcon 
    },
    { 
      title: 'Available', 
      value: books.reduce((sum, b) => sum + (b.available_copies || b.availableCopies || 0), 0).toString(), 
      subtitle: 'Ready to issue', 
      color: 'success', 
      icon: CategoryIcon 
    },
  ];

  const filteredBooks = books.filter(book => {
    const search = searchQuery.toLowerCase();
    const matchesSearch = book.title?.toLowerCase().includes(search) ||
                         book.author?.toLowerCase().includes(search) ||
                         book.isbn?.includes(searchQuery);
    const matchesCategory = filterCategory === 'all' || book.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <motion.div {...pageTransition}>
      <Box sx={{ p: 3 }}>
        <PageHeader
          title="Book Management"
          subtitle="Maintain the library catalog and inventory"
          action={
            <Stack direction="row" spacing={2}>
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport}>
                Export Catalog
              </Button>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
                Add Book
              </Button>
            </Stack>
          }
        />

        <Grid container spacing={3} sx={{ mb: 4 }}>
          {stats.map((stat, i) => (
            <Grid item xs={12} sm={4} key={i}>
              <StatCard {...stat} />
            </Grid>
          ))}
        </Grid>

        <Card sx={{ mb: 3, borderRadius: 4 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  placeholder="Search by title, author, or ISBN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={filterCategory}
                    label="Category"
                    onChange={(e) => setFilterCategory(e.target.value)}
                  >
                    <MenuItem value="all">All Categories</MenuItem>
                    {Array.from(new Set(books.map(b => b.category).filter(Boolean))).map(cat => (
                      <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 4, overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                <TableRow>
                  <TableCell>Book</TableCell>
                  <TableCell>ISBN</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="center">Copies</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 10 }}><CircularProgress /></TableCell></TableRow>
                ) : filteredBooks.length === 0 ? (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 10 }}><Typography color="text.secondary">No books found matching your criteria.</Typography></TableCell></TableRow>
                ) : filteredBooks.map((book) => (
                  <TableRow key={book.id || book.book_id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar 
                          src={book.cover_image || book.coverImage} 
                          variant="rounded" 
                          sx={{ width: 40, height: 56, bgcolor: 'grey.100' }}
                        >
                          <BookIcon color="disabled" />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={700}>{book.title}</Typography>
                          <Typography variant="caption" color="text.secondary">{book.author}</Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell><Typography variant="caption" fontFamily="monospace">{book.isbn}</Typography></TableCell>
                    <TableCell><Chip label={book.category} size="small" variant="outlined" /></TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight={700}>{book.available_copies ?? book.availableCopies} / {book.total_copies ?? book.totalCopies}</Typography>
                    </TableCell>
                    <TableCell><Typography variant="body2">{book.shelf_location || book.shelfLocation || '—'}</Typography></TableCell>
                    <TableCell align="right">
                      <IconButton size="small" color="primary" onClick={() => handleOpenDialog(book)}><EditIcon fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(book.id || book.book_id)}><DeleteIcon fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>

        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>{editingBook ? 'Edit Book Details' : 'Register New Book'}</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={3} sx={{ mt: 0.5 }}>
              <Grid item xs={12} md={8}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Book Title"
                      placeholder="e.g. Introduction to Algorithms"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      error={!!formErrors.title}
                      helperText={formErrors.title}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Author"
                      placeholder="e.g. Thomas H. Cormen"
                      value={formData.author}
                      onChange={(e) => setFormData({...formData, author: e.target.value})}
                      error={!!formErrors.author}
                      helperText={formErrors.author}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="ISBN"
                      placeholder="e.g. 978-0262033848"
                      value={formData.isbn}
                      onChange={(e) => setFormData({...formData, isbn: e.target.value})}
                      error={!!formErrors.isbn}
                      helperText={formErrors.isbn}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth required error={!!formErrors.category}>
                      <InputLabel>Category</InputLabel>
                      <Select
                        value={formData.category}
                        label="Category"
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                      >
                        {['Computer Science', 'Mathematics', 'Physics', 'Literature', 'History', 'Business', 'Engineering', 'Medical', 'Arts', 'General'].map(c => (
                          <MenuItem key={c} value={c}>{c}</MenuItem>
                        ))}
                      </Select>
                      {formErrors.category && <FormHelperText>{formErrors.category}</FormHelperText>}
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Publisher"
                      placeholder="e.g. MIT Press"
                      value={formData.publisher}
                      onChange={(e) => setFormData({...formData, publisher: e.target.value})}
                    />
                  </Grid>
                </Grid>
              </Grid>

              <Grid item xs={12} md={4}>
                <Box sx={{ 
                  border: '2px dashed', 
                  borderColor: 'divider', 
                  borderRadius: 4, 
                  p: 2, 
                  textAlign: 'center',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'grey.50'
                }}>
                  <Avatar 
                    src={formData.cover_image} 
                    variant="rounded" 
                    sx={{ width: 120, height: 180, mb: 2, boxShadow: theme.shadows[4] }}
                  >
                    <BookIcon sx={{ fontSize: 60 }} />
                  </Avatar>
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="cover-upload"
                    type="file"
                    onChange={handleImageUpload}
                  />
                  <label htmlFor="cover-upload">
                    <Button variant="contained" component="span" startIcon={<PhotoCamera />} size="small">
                      Upload Cover
                    </Button>
                  </label>
                </Box>
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Year"
                  type="number"
                  placeholder="2024"
                  value={formData.publication_year}
                  onChange={(e) => setFormData({...formData, publication_year: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Language"
                  placeholder="English"
                  value={formData.language}
                  onChange={(e) => setFormData({...formData, language: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Pages"
                  type="number"
                  placeholder="500"
                  value={formData.pages}
                  onChange={(e) => setFormData({...formData, pages: e.target.value})}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Total Copies"
                  type="number"
                  value={formData.total_copies}
                  onChange={(e) => setFormData({...formData, total_copies: parseInt(e.target.value) || 0})}
                  error={!!formErrors.total_copies}
                  helperText={formErrors.total_copies}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Available"
                  type="number"
                  value={formData.available_copies}
                  onChange={(e) => setFormData({...formData, available_copies: parseInt(e.target.value) || 0})}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Shelf Location"
                  placeholder="A-102"
                  value={formData.shelf_location}
                  onChange={(e) => setFormData({...formData, shelf_location: e.target.value})}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  placeholder="Brief overview of the book contents..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={handleCloseDialog} disabled={saving}>Cancel</Button>
            <Button 
              onClick={handleSave} 
              variant="contained" 
              disabled={saving}
              startIcon={saving && <CircularProgress size={20} color="inherit" />}
            >
              {editingBook ? 'Update Book' : 'Register Book'}
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({...snackbar, open: false})}>
          <Alert severity={snackbar.severity} sx={{ borderRadius: 2 }}>{snackbar.message}</Alert>
        </Snackbar>
      </Box>
    </motion.div>
  );
};

export default BookManagement;
