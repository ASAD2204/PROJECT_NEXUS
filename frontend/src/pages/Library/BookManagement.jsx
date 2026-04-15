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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  MenuBook as BookIcon,
  Category as CategoryIcon,
  TrendingUp as TrendingUpIcon,
  Inventory as InventoryIcon,
} from '@mui/icons-material';
import PageHeader from '../../components/Common/PageHeader';
import StatCard from '../../components/Common/StatCard';
import { motion } from 'framer-motion';
import { pageTransition } from '../../utils/animations';
import { libraryAPI } from '../../api/library';

const BookManagement = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [editingBook, setEditingBook] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    category: '',
    publisher: '',
    yearPublished: '',
    totalCopies: '',
    availableCopies: '',
    shelfLocation: '',
  });

  // Books data from API
  const [books, setBooks] = useState([]);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const res = await libraryAPI.searchBooks();
        setBooks(res.data?.books || res.data || []);
      } catch (e) { console.error(e); }
    };
    fetchBooks();
  }, []);

  const stats = [
    { 
      title: 'Total Books', 
      value: books.reduce((sum, b) => sum + b.totalCopies, 0).toString(), 
      subtitle: '+45 new this month', 
      color: 'primary', 
      icon: BookIcon,
      tooltip: 'Total number of physical book copies across all titles and categories in the library catalog'
    },
    { 
      title: 'Available', 
      value: books.reduce((sum, b) => sum + b.availableCopies, 0).toString(), 
      subtitle: 'Ready to issue', 
      color: 'success', 
      icon: InventoryIcon,
      tooltip: 'Books currently available on shelves and ready to be issued to students immediately'
    },
    { 
      title: 'Categories', 
      value: new Set(books.map(b => b.category)).size.toString(), 
      subtitle: 'Across library', 
      color: 'info', 
      icon: CategoryIcon,
      tooltip: 'Number of different book categories including Computer Science, Business, Engineering, and more'
    },
  ];

  const handleOpenDialog = (book = null) => {
    if (book) {
      setEditingBook(book);
      setFormData(book);
    } else {
      setEditingBook(null);
      setFormData({
        title: '',
        author: '',
        isbn: '',
        category: '',
        publisher: '',
        yearPublished: '',
        totalCopies: '',
        availableCopies: '',
        shelfLocation: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingBook(null);
  };

  const handleSave = async () => {
    try {
      if (editingBook) {
        await libraryAPI.updateBook(editingBook.id, formData);
        setSnackbar({ open: true, message: 'Book updated successfully!', severity: 'success' });
      } else {
        await libraryAPI.addBook(formData);
        setSnackbar({ open: true, message: 'Book added successfully!', severity: 'success' });
      }
      const res = await libraryAPI.searchBooks();
      setBooks(res.data?.books || res.data || []);
      handleCloseDialog();
    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: 'Failed to save book', severity: 'error' });
    }
  };

  const handleDelete = async (id) => {
    try {
      await libraryAPI.deleteBook(id);
      const res = await libraryAPI.searchBooks();
      setBooks(res.data?.books || res.data || []);
      setSnackbar({ open: true, message: 'Book deleted successfully!', severity: 'warning' });
    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: 'Failed to delete book', severity: 'error' });
    }
  };

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         book.isbn.includes(searchQuery);
    const matchesCategory = filterCategory === 'all' || book.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <motion.div {...pageTransition}>
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <PageHeader
          title="Book Management"
          subtitle="Manage library book inventory and catalog"
          action={
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
              Add New Book
            </Button>
          }
        />

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {stats.map((stat, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
              <StatCard {...stat} />
            </Grid>
          ))}
        </Grid>

        {/* Filters Card */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, md: 8 }}>
                <TextField
                  fullWidth
                  placeholder="Search by title, author, or ISBN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    label="Category"
                  >
                    <MenuItem value="all">All Categories</MenuItem>
                    <MenuItem value="Computer Science">Computer Science</MenuItem>
                    <MenuItem value="Software Engineering">Software Engineering</MenuItem>
                    <MenuItem value="Business">Business</MenuItem>
                    <MenuItem value="Mathematics">Mathematics</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Books Table */}
        <Card>
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 800 }}>
              <TableHead>
                <TableRow>
                  <TableCell>ISBN</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Author</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Publisher</TableCell>
                  <TableCell align="center">Total</TableCell>
                  <TableCell align="center">Available</TableCell>
                  <TableCell>Shelf</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredBooks.map((book) => (
                  <TableRow key={book.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {book.isbn}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {book.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {book.yearPublished}
                      </Typography>
                    </TableCell>
                    <TableCell>{book.author}</TableCell>
                    <TableCell>
                      <Chip label={book.category} size="small" color="primary" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{book.publisher}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight="bold">
                        {book.totalCopies}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={book.availableCopies}
                        size="small"
                        color={book.availableCopies > 0 ? 'success' : 'error'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" fontFamily="monospace">
                        {book.shelfLocation}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <IconButton size="small" color="primary" onClick={() => handleOpenDialog(book)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(book.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog 
          open={openDialog} 
          onClose={handleCloseDialog} 
          maxWidth="md" 
          fullWidth
          fullScreen={window.innerWidth < 600}
        >
          <DialogTitle>{editingBook ? 'Edit Book' : 'Add New Book'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Author"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="ISBN"
                  value={formData.isbn}
                  onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Publisher"
                  value={formData.publisher}
                  onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Year Published"
                  type="number"
                  value={formData.yearPublished}
                  onChange={(e) => setFormData({ ...formData, yearPublished: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Total Copies"
                  type="number"
                  value={formData.totalCopies}
                  onChange={(e) => setFormData({ ...formData, totalCopies: e.target.value })}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Available Copies"
                  type="number"
                  value={formData.availableCopies}
                  onChange={(e) => setFormData({ ...formData, availableCopies: e.target.value })}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Shelf Location"
                  value={formData.shelfLocation}
                  onChange={(e) => setFormData({ ...formData, shelfLocation: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSave} variant="contained">
              {editingBook ? 'Update' : 'Add'} Book
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </motion.div>
  );
};

export default BookManagement;
