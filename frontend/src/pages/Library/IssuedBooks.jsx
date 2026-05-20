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
  const [bookCondition, setBookCondition] = useState('Good');
  const [submitting, setSubmitting] = useState(false);

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
    const allowedConditions = new Set(['Good', 'Worn', 'Damaged', 'Lost']);
    if (!returnDialog.issue || !allowedConditions.has(bookCondition)) {
      setSnackbar({ open: true, message: 'Please select a valid return condition.', severity: 'error' });
      return;
    }

    try {
      setSubmitting(true);
      const returnRes = await libraryAPI.returnBook(returnDialog.issue.id || returnDialog.issue.issue_id, { condition: bookCondition });
      const fineApplied = returnRes.data?.fine_amount ?? 0;
      const successMsg = returnRes.data?.message || (fineApplied > 0
        ? `Book returned. Fine of PKR ${fineApplied} has been applied!`
        : 'Book returned successfully!');
      
      const res = await libraryAPI.getIssues();
      setIssuedBooks(res.data?.issues || res.data || []);
      setSnackbar({ 
        open: true, 
        message: successMsg, 
        severity: fineApplied > 0 ? 'warning' : 'success' 
      });
      setReturnDialog({ open: false, issue: null });
      setBookCondition('Good');
    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: 'Failed to process return', severity: 'error' });
    } finally {
      setSubmitting(false);
    }
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

  const getStatusChip = (status, daysOverdue, returnCondition) => {
    const s = String(status || '').toLowerCase();
    if (s === 'overdue') {
      return (
        <Chip
          label={`Overdue (${daysOverdue} days)`}
          size="small"
          color="error"
          icon={<WarningIcon />}
        />
      );
    }
    if (s === 'returned') {
      const label = returnCondition && returnCondition !== 'Good' ? `Returned (${returnCondition})` : 'Returned';
      return (
        <Chip
          label={label}
          size="small"
          color="success"
          icon={<CheckCircleIcon />}
        />
      );
    }
    if (s === 'lost') {
      return (
        <Chip
          label="Lost"
          size="small"
          sx={{ bgcolor: '#374151', color: '#F3F4F6', fontWeight: 'bold' }}
          icon={<WarningIcon style={{ color: '#F3F4F6' }} />}
        />
      );
    }
    return <Chip label="Issued" size="small" color="primary" variant="outlined" icon={<CheckCircleIcon />} />;
  };

  return (
    <motion.div {...pageTransition}>
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <PageHeader
          title="Issued Books"
          subtitle="Manage and track all issued books and returns"
        />

        <Grid container spacing={3} sx={{ mb: 4 }}>
          {stats.map((stat, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <StatCard {...stat} />
            </Grid>
          ))}
        </Grid>

        {/* Filters Card */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={8}>
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
              <Grid item xs={12} md={4}>
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
                    <TableCell>{getStatusChip(issue.status, issue.daysOverdue, issue.returnCondition)}</TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        {(issue.status === 'issued' || issue.status === 'overdue') && (
                          <IconButton
                            size="small"
                            color="success"
                            title="Return Book"
                            onClick={() => handleReturn(issue)}
                          >
                            <ReturnIcon fontSize="small" />
                          </IconButton>
                        )}
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
        <Dialog open={returnDialog.open} onClose={() => !submitting && setReturnDialog({ open: false, issue: null })} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>Confirm Book Return</DialogTitle>
          <DialogContent dividers>
            {returnDialog.issue && (
              <Box sx={{ pt: 1 }}>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Book Details</Typography>
                    <Typography variant="body1" fontWeight="bold">{returnDialog.issue.bookTitle}</Typography>
                    <Typography variant="caption" display="block">ISBN: {returnDialog.issue.bookIsbn}</Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="caption" color="text.secondary">Borrower</Typography>
                    <Typography variant="body1" fontWeight="bold">{returnDialog.issue.studentName}</Typography>
                    <Typography variant="caption" display="block">Roll No: {returnDialog.issue.studentRollNo}</Typography>
                  </Box>

                  <FormControl fullWidth required sx={{ mt: 2 }}>
                    <InputLabel>Return Condition</InputLabel>
                    <Select
                      value={bookCondition}
                      label="Return Condition"
                      onChange={(e) => setBookCondition(e.target.value)}
                    >
                      <MenuItem value="Good">Good (No damage)</MenuItem>
                      <MenuItem value="Worn">Worn (Normal use)</MenuItem>
                      <MenuItem value="Damaged">Damaged (Requires repair)</MenuItem>
                      <MenuItem value="Lost">Lost (Replacement fee applies)</MenuItem>
                    </Select>
                  </FormControl>

                  {returnDialog.issue.status === 'overdue' && (
                    <Alert severity="error" sx={{ borderRadius: 2 }}>
                      This book is <strong>{returnDialog.issue.daysOverdue} days overdue</strong>. A fine will be automatically calculated.
                    </Alert>
                  )}
                </Stack>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setReturnDialog({ open: false, issue: null })} disabled={submitting}>Cancel</Button>
            <Button 
                onClick={confirmReturn} 
                variant="contained" 
                color="success" 
              disabled={submitting || !returnDialog.issue || !bookCondition}
                startIcon={submitting && <CircularProgress size={20} color="inherit" />}
                sx={{ fontWeight: 800 }}
            >
              Process Return
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
