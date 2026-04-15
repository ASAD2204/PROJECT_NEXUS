import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Stack,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Avatar,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Search as SearchIcon,
  AssignmentReturn as ReturnIcon,
  AssignmentTurnedIn as IssuedIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Email as EmailIcon,
  MenuBook as BookIcon,
} from '@mui/icons-material';
import PageHeader from '../../components/Common/PageHeader';
import StatCard from '../../components/Common/StatCard';
import { motion } from 'framer-motion';
import { pageTransition } from '../../utils/animations';
import { libraryAPI } from '../../api/library';

const IssuedBooks = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [returnDialog, setReturnDialog] = useState({ open: false, issue: null });

  const [issuedBooks, setIssuedBooks] = useState([]);

  useEffect(() => {
    const fetchIssuedBooks = async () => {
      try {
        const res = await libraryAPI.getIssues();
        setIssuedBooks(res.data?.issues || res.data || []);
      } catch (e) { console.error(e); }
    };
    fetchIssuedBooks();
  }, []);

  const stats = [
    {
      title: 'Currently Issued',
      value: issuedBooks.filter(b => b.status === 'issued').length.toString(),
      subtitle: 'Active borrows',
      color: 'primary',
      icon: IssuedIcon,
      tooltip: 'Books currently issued to students with active due dates. Students can keep books for 14 days maximum',
    },
    {
      title: 'Overdue Books',
      value: issuedBooks.filter(b => b.status === 'overdue').length.toString(),
      subtitle: 'Need attention',
      color: 'error',
      icon: WarningIcon,
      tooltip: 'Books past their due date that need immediate return. Automated reminders are sent to students daily',
    },
    {
      title: 'Total Issued',
      value: issuedBooks.length.toString(),
      subtitle: 'This month',
      color: 'success',
      icon: BookIcon,
      tooltip: 'Total number of books issued this month. Includes both active and overdue books for circulation tracking',
    },
  ];

  const handleReturn = (issue) => {
    setReturnDialog({ open: true, issue });
  };

  const confirmReturn = async () => {
    try {
      await libraryAPI.returnBook(returnDialog.issue.id);
      const res = await libraryAPI.getIssues();
      setIssuedBooks(res.data?.issues || res.data || []);
      setSnackbar({ open: true, message: 'Book returned successfully!', severity: 'success' });
    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: 'Failed to process return', severity: 'error' });
    }
    setReturnDialog({ open: false, issue: null });
  };

  const handleSendReminder = (issue) => {
    setSnackbar({ open: true, message: `Reminder sent to ${issue.studentName}`, severity: 'info' });
  };

  const filteredBooks = issuedBooks.filter(issue => {
    const matchesSearch =
      issue.bookTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.studentRollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.bookIsbn.includes(searchQuery);
    const matchesStatus = filterStatus === 'all' || issue.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusChip = (status, daysOverdue) => {
    if (status === 'overdue') {
      return (
        <Chip
          label={`Overdue (${daysOverdue} days)`}
          size="small"
          color="error"
          icon={<WarningIcon />}
        />
      );
    }
    return <Chip label="Issued" size="small" color="success" icon={<CheckCircleIcon />} />;
  };

  return (
    <motion.div {...pageTransition}>
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <PageHeader
          title="Issued Books"
          subtitle="Manage and track all issued books and returns"
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
                  placeholder="Search by book title, student name, or roll number..."
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
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    label="Status"
                  >
                    <MenuItem value="all">All Status</MenuItem>
                    <MenuItem value="issued">Issued</MenuItem>
                    <MenuItem value="overdue">Overdue</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Issued Books Table */}
        <Card>
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 1000 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Student</TableCell>
                  <TableCell>Book</TableCell>
                  <TableCell>ISBN</TableCell>
                  <TableCell>Issue Date</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredBooks.map((issue) => (
                  <TableRow key={issue.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar src={issue.studentPhoto} />
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {issue.studentName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {issue.studentRollNo}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {issue.bookTitle}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" fontFamily="monospace">
                        {issue.bookIsbn}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{issue.issueDate}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        color={issue.status === 'overdue' ? 'error' : 'text.primary'}
                        fontWeight={issue.status === 'overdue' ? 'bold' : 'normal'}
                      >
                        {issue.dueDate}
                      </Typography>
                    </TableCell>
                    <TableCell>{getStatusChip(issue.status, issue.daysOverdue)}</TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <IconButton
                          size="small"
                          color="success"
                          title="Return Book"
                          onClick={() => handleReturn(issue)}
                        >
                          <ReturnIcon fontSize="small" />
                        </IconButton>
                        {issue.status === 'overdue' && (
                          <IconButton
                            size="small"
                            color="primary"
                            title="Send Reminder"
                            onClick={() => handleSendReminder(issue)}
                          >
                            <EmailIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>

        {/* Return Confirmation Dialog */}
        <Dialog open={returnDialog.open} onClose={() => setReturnDialog({ open: false, issue: null })}>
          <DialogTitle>Confirm Book Return</DialogTitle>
          <DialogContent>
            {returnDialog.issue && (
              <Box sx={{ pt: 2 }}>
                <Typography variant="body2" gutterBottom>
                  <strong>Book:</strong> {returnDialog.issue.bookTitle}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>ISBN:</strong> {returnDialog.issue.bookIsbn}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Student:</strong> {returnDialog.issue.studentName} ({returnDialog.issue.studentRollNo})
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Issue Date:</strong> {returnDialog.issue.issueDate}
                </Typography>
                {returnDialog.issue.status === 'overdue' && (
                  <Typography variant="body2" color="error" fontWeight="bold" gutterBottom>
                    <strong>Overdue:</strong> {returnDialog.issue.daysOverdue} days
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Are you sure you want to mark this book as returned?
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setReturnDialog({ open: false, issue: null })}>Cancel</Button>
            <Button onClick={confirmReturn} variant="contained" color="success">
              Confirm Return
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

export default IssuedBooks;
