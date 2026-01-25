import React, { useState } from 'react';
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
} from '@mui/material';
import {
  Search as SearchIcon,
  CheckCircle as ApproveIcon,
  Cancel as CancelIcon,
  EventAvailable as EventIcon,
  PendingActions as PendingIcon,
  Book as BookIcon,
} from '@mui/icons-material';
import PageHeader from '../../components/Common/PageHeader';
import StatCard from '../../components/Common/StatCard';
import { motion } from 'framer-motion';
import { pageTransition } from '../../utils/animations';

const Reservations = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Mock reservations data
  const [reservations, setReservations] = useState([
    {
      id: 1,
      bookTitle: 'Artificial Intelligence: A Modern Approach',
      bookIsbn: '978-0136042594',
      studentName: 'Zain Ali',
      studentRollNo: 'F22-BS-015',
      studentEmail: 'zain.ali@university.edu.pk',
      studentPhoto: 'https://i.pravatar.cc/150?img=41',
      reservationDate: '2026-01-22',
      expectedAvailability: '2026-01-28',
      status: 'pending',
      priority: 'high',
    },
    {
      id: 2,
      bookTitle: 'Machine Learning Yearning',
      bookIsbn: '978-0999579923',
      studentName: 'Hira Khan',
      studentRollNo: 'F22-BS-016',
      studentEmail: 'hira.khan@university.edu.pk',
      studentPhoto: 'https://i.pravatar.cc/150?img=42',
      reservationDate: '2026-01-23',
      expectedAvailability: '2026-01-30',
      status: 'pending',
      priority: 'medium',
    },
    {
      id: 3,
      bookTitle: 'Design Patterns',
      bookIsbn: '978-0201633610',
      studentName: 'Usman Ahmed',
      studentRollNo: 'F22-BS-017',
      studentEmail: 'usman.ahmed@university.edu.pk',
      studentPhoto: 'https://i.pravatar.cc/150?img=43',
      reservationDate: '2026-01-20',
      expectedAvailability: '2026-01-26',
      status: 'approved',
      priority: 'high',
    },
    {
      id: 4,
      bookTitle: 'The Pragmatic Programmer',
      bookIsbn: '978-0135957059',
      studentName: 'Aisha Malik',
      studentRollNo: 'F22-BS-018',
      studentEmail: 'aisha.malik@university.edu.pk',
      studentPhoto: 'https://i.pravatar.cc/150?img=44',
      reservationDate: '2026-01-24',
      expectedAvailability: '2026-02-01',
      status: 'pending',
      priority: 'low',
    },
    {
      id: 5,
      bookTitle: 'Code Complete',
      bookIsbn: '978-0735619678',
      studentName: 'Hassan Raza',
      studentRollNo: 'F22-BS-019',
      studentEmail: 'hassan.raza@university.edu.pk',
      studentPhoto: 'https://i.pravatar.cc/150?img=45',
      reservationDate: '2026-01-21',
      expectedAvailability: '2026-01-27',
      status: 'cancelled',
      priority: 'medium',
    },
  ]);

  const stats = [
    {
      title: 'Pending Reservations',
      value: reservations.filter((r) => r.status === 'pending').length.toString(),
      subtitle: 'Need approval',
      color: 'warning',
      icon: PendingIcon,
      tooltip: 'Book reservations awaiting librarian approval. Students will be notified once approved',
    },
    {
      title: 'Approved',
      value: reservations.filter((r) => r.status === 'approved').length.toString(),
      subtitle: 'Ready to issue',
      color: 'success',
      icon: EventIcon,
      tooltip: 'Approved reservations ready to be issued when books become available',
    },
    {
      title: 'Total Reservations',
      value: reservations.length.toString(),
      subtitle: 'This month',
      color: 'primary',
      icon: BookIcon,
      tooltip: 'Total book reservations this month including pending, approved, and cancelled',
    },
  ];

  const handleApprove = (id) => {
    setReservations(
      reservations.map((r) => (r.id === id ? { ...r, status: 'approved' } : r))
    );
    setSnackbar({ open: true, message: 'Reservation approved!', severity: 'success' });
  };

  const handleCancel = (id) => {
    setReservations(
      reservations.map((r) => (r.id === id ? { ...r, status: 'cancelled' } : r))
    );
    setSnackbar({ open: true, message: 'Reservation cancelled!', severity: 'warning' });
  };

  const filteredReservations = reservations.filter((reservation) => {
    const matchesSearch =
      reservation.bookTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reservation.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reservation.studentRollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reservation.bookIsbn.includes(searchQuery);
    const matchesStatus = filterStatus === 'all' || reservation.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusChip = (status) => {
    const statusConfig = {
      pending: { color: 'warning', label: 'Pending' },
      approved: { color: 'success', label: 'Approved' },
      cancelled: { color: 'error', label: 'Cancelled' },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return <Chip label={config.label} size="small" color={config.color} />;
  };

  const getPriorityChip = (priority) => {
    const priorityConfig = {
      high: { color: 'error', label: 'High' },
      medium: { color: 'warning', label: 'Medium' },
      low: { color: 'info', label: 'Low' },
    };
    const config = priorityConfig[priority] || priorityConfig.medium;
    return <Chip label={config.label} size="small" color={config.color} variant="outlined" />;
  };

  return (
    <motion.div {...pageTransition}>
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <PageHeader
          title="Book Reservations"
          subtitle="Manage and approve student book reservations"
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
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="approved">Approved</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Reservations Table */}
        <Card>
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Student</TableCell>
                  <TableCell>Book</TableCell>
                  <TableCell>ISBN</TableCell>
                  <TableCell>Reservation Date</TableCell>
                  <TableCell>Expected Availability</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredReservations.map((reservation) => (
                  <TableRow key={reservation.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar src={reservation.studentPhoto} />
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {reservation.studentName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {reservation.studentRollNo}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {reservation.bookTitle}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" fontFamily="monospace">
                        {reservation.bookIsbn}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{reservation.reservationDate}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{reservation.expectedAvailability}</Typography>
                    </TableCell>
                    <TableCell>{getPriorityChip(reservation.priority)}</TableCell>
                    <TableCell>{getStatusChip(reservation.status)}</TableCell>
                    <TableCell align="center">
                      {reservation.status === 'pending' ? (
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <IconButton
                            size="small"
                            color="success"
                            title="Approve Reservation"
                            onClick={() => handleApprove(reservation.id)}
                          >
                            <ApproveIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            title="Cancel Reservation"
                            onClick={() => handleCancel(reservation.id)}
                          >
                            <CancelIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          No actions
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>

        {filteredReservations.length === 0 && (
          <Card sx={{ mt: 3 }}>
            <CardContent sx={{ textAlign: 'center', py: 8 }}>
              <EventIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No reservations found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Try adjusting your filters or search terms
              </Typography>
            </CardContent>
          </Card>
        )}

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert
            severity={snackbar.severity}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </motion.div>
  );
};

export default Reservations;
