import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Collapse,
  Tab,
  Tabs,
  Stepper,
  Step,
  StepLabel,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Stack,
  LinearProgress,
  Badge,
  Snackbar,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/lab';
import {
  Payment,
  Download,
  CreditCard,
  CheckCircle,
  Warning,
  Search,
  FilterList,
  ExpandMore,
  ExpandLess,
  AttachMoney,
  Phone,
  AccountBalance,
  Security,
  Receipt,
  DateRange,
  Sort,
  FileDownload,
  Print,
  Email,
  Close,
  TrendingUp,
  AccessTime,
  AttachFile,
} from '@mui/icons-material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { feeInvoices, payInvoice, currentUser } from '../../data/dummyData';
import StatCard from '../../components/Common/StatCard';
import { GridSkeleton } from '../../components/Common/LoadingSkeleton';
import { pageTransition, staggerContainer, fadeInUp } from '../../utils/animations';

const FeeVouchers = () => {
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState(0); // 0: Invoices, 1: Payment History, 2: Analytics
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(0); // 0: Card, 1: JazzCash, 2: EasyPaisa, 3: Bank
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });
  
  // Form fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [saveCard, setSaveCard] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pin, setPin] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  // Loading effect
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [expandedRow, setExpandedRow] = useState(null);

  // Calculate summary stats
  const totalFees = feeInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const paidFees = feeInvoices.filter(inv => inv.status === 'Paid').reduce((sum, inv) => sum + inv.amount, 0);
  const unpaidFees = feeInvoices.filter(inv => inv.status === 'Unpaid' || inv.status === 'Overdue').reduce((sum, inv) => sum + inv.amount, 0);
  
  const today = new Date();
  const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const upcomingFees = feeInvoices.filter(inv => {
    const dueDate = new Date(inv.dueDate);
    return dueDate > today && dueDate <= thirtyDaysLater && inv.status !== 'Paid';
  }).reduce((sum, inv) => sum + inv.amount, 0);

  // Calculate late fine
  const calculateLateFine = (invoice) => {
    if (invoice.status !== 'Overdue') return 0;
    const dueDate = new Date(invoice.dueDate);
    const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysOverdue * 50); // PKR 50 per day
  };

  // Get countdown for unpaid invoices
  const getCountdown = (dueDate) => {
    const due = new Date(dueDate);
    const diff = due - today;
    
    if (diff <= 0) return { text: 'Overdue', color: 'error' };
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days < 3) return { text: `${days} days left`, color: 'error' };
    if (days <= 7) return { text: `${days} days left`, color: 'warning' };
    return { text: `${days} days left`, color: 'success' };
  };

  // Filter and sort invoices
  const filteredInvoices = feeInvoices
    .filter(inv => {
      if (statusFilter !== 'all' && inv.status.toLowerCase() !== statusFilter) return false;
      if (searchQuery && !inv.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !inv.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'date') return new Date(b.dueDate) - new Date(a.dueDate);
      if (sortBy === 'amount') return b.amount - a.amount;
      if (sortBy === 'status') return a.status.localeCompare(b.status);
      return 0;
    });

  // Payment processing steps
  const processingSteps = ['Verifying payment details', 'Contacting payment gateway', 'Processing transaction', 'Updating records'];

  // Format card number with spaces
  const formatCardNumber = (value) => {
    const cleaned = value.replace(/\s/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted;
  };

  // Handle payment submission
  const handlePaymentSubmit = () => {
    if (!termsAccepted) {
      setSnackbar({ open: true, message: 'Please accept terms and conditions' });
      return;
    }

    setProcessing(true);
    setProcessingStep(0);

    // Simulate processing steps
    const interval = setInterval(() => {
      setProcessingStep(prev => {
        if (prev >= 3) {
          clearInterval(interval);
          setTimeout(() => {
            setProcessing(false);
            setPaymentSuccess(true);
            payInvoice(selectedInvoice.id, paymentMethod === 0 ? 'Card' : paymentMethod === 1 ? 'JazzCash' : paymentMethod === 2 ? 'EasyPaisa' : 'Bank');
            setSnackbar({ open: true, message: '✅ Payment successful! Email notification sent.' });
          }, 500);
          return prev;
        }
        return prev + 1;
      });
    }, 1500);
  };

  // Fee breakdown for invoice
  const getFeeBreakdown = (invoice) => [
    { item: 'Tuition Fee', amount: invoice.amount * 0.7 },
    { item: 'Lab Fee', amount: invoice.amount * 0.15 },
    { item: 'Library Fee', amount: invoice.amount * 0.05 },
    { item: 'Sports Fee', amount: invoice.amount * 0.05 },
    { item: 'IT Services', amount: invoice.amount * 0.05 },
  ];

  // Mock payment history
  const paymentHistory = feeInvoices.filter(inv => inv.status === 'Paid').map(inv => ({
    id: inv.id,
    date: inv.paidOn || '2025-12-15',
    invoice: inv.invoiceNo,
    amount: inv.amount,
    method: 'Credit Card',
  }));

  // Charts data
  const feeDistributionData = [
    { name: 'Tuition', value: 70, color: '#1976d2' },
    { name: 'Lab', value: 15, color: '#388e3c' },
    { name: 'Library', value: 5, color: '#f57c00' },
    { name: 'Sports', value: 5, color: '#d32f2f' },
    { name: 'IT', value: 5, color: '#7b1fa2' },
  ];

  const paymentHistoryChartData = [
    { semester: 'Fall 2024', amount: 65000 },
    { semester: 'Spring 2025', amount: 70000 },
    { semester: 'Fall 2025', amount: 75000 },
  ];

  // Show loading skeleton
  if (loading) {
    return (
      <Box sx={{ pb: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Fee Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Loading your fee vouchers...
          </Typography>
        </Box>
        <GridSkeleton items={6} columns={{ xs: 12, md: 6, lg: 4 }} />
      </Box>
    );
  }

  return (
    <motion.div {...pageTransition}>
    <Box className="page-container">
      {/* Header */}
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Fee Management
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        View and manage your tuition fees and payments
      </Typography>

      {/* Summary Cards Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total Fees"
            value={`PKR ${totalFees.toLocaleString()}`}
            icon={AttachMoney}
            color="primary"
            tooltip="Total fee amount for the current academic year including tuition, lab fees, and other charges."
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Paid"
            value={`PKR ${paidFees.toLocaleString()}`}
            icon={CheckCircle}
            color="success"
            subtitle={`${feeInvoices.filter(i => i.status === 'Paid').length} invoices`}
            tooltip="Total amount you have successfully paid. Keep all payment receipts for your records."
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Outstanding"
            value={`PKR ${unpaidFees.toLocaleString()}`}
            icon={Warning}
            color="error"
            subtitle={`${feeInvoices.filter(i => i.status !== 'Paid').length} unpaid`}
            tooltip="Pending fee amount that must be paid by the due date. Late payment may result in penalties."
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Upcoming (30 days)"
            value={`PKR ${upcomingFees.toLocaleString()}`}
            icon={AccessTime}
            color="warning"
            tooltip="Fee invoices that will be due within the next 30 days. Plan your payments in advance."
          />
        </Grid>
      </Grid>

      {/* Main Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs value={mainTab} onChange={(e, v) => setMainTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Invoices" />
          <Tab label="Payment History" />
          <Tab label="Analytics" />
        </Tabs>
      </Card>

      {/* TAB 0: INVOICES */}
      {mainTab === 0 && (
        <Box>
          {/* Filter & Search Bar */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search by invoice number..."
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
                <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} label="Status">
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="paid">Paid</MenuItem>
                      <MenuItem value="unpaid">Unpaid</MenuItem>
                      <MenuItem value="overdue">Overdue</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Sort By</InputLabel>
                    <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} label="Sort By">
                      <MenuItem value="date">Date</MenuItem>
                      <MenuItem value="amount">Amount</MenuItem>
                      <MenuItem value="status">Status</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                  <Button fullWidth variant="outlined" startIcon={<DateRange />}>
                    Date Range
                  </Button>
                </Grid>
                <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                  <Button fullWidth variant="outlined" startIcon={<FileDownload />}>
                    Export CSV
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Invoice Table */}
          <Card>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell width={50}></TableCell>
                    <TableCell><strong>Invoice Number</strong></TableCell>
                    <TableCell><strong>Description</strong></TableCell>
                    <TableCell><strong>Issue Date</strong></TableCell>
                    <TableCell><strong>Due Date</strong></TableCell>
                    <TableCell align="right"><strong>Amount</strong></TableCell>
                    <TableCell align="center"><strong>Status</strong></TableCell>
                    <TableCell align="center"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredInvoices.map((invoice) => {
                    const lateFine = calculateLateFine(invoice);
                    const countdown = invoice.status !== 'Paid' ? getCountdown(invoice.dueDate) : null;
                    const expanded = expandedRow === invoice.id;

                    return (
                      <React.Fragment key={invoice.id}>
                        <TableRow hover>
                          <TableCell>
                            <IconButton size="small" onClick={() => setExpandedRow(expanded ? null : invoice.id)}>
                              {expanded ? <ExpandLess /> : <ExpandMore />}
                            </IconButton>
                          </TableCell>
                          <TableCell>{invoice.invoiceNo}</TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">
                              {invoice.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {invoice.description}
                            </Typography>
                          </TableCell>
                          <TableCell>{invoice.issueDate || 'Dec 1, 2025'}</TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {new Date(invoice.dueDate).toLocaleDateString()}
                            </Typography>
                            {countdown && (
                              <Chip 
                                label={countdown.text} 
                                size="small" 
                                color={countdown.color}
                                sx={{ mt: 0.5 }}
                              />
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body1" fontWeight="bold">
                              PKR {invoice.amount.toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={invoice.status}
                              color={
                                invoice.status === 'Paid' ? 'success' :
                                invoice.status === 'Overdue' ? 'error' : 'warning'
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            {invoice.status === 'Paid' ? (
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<Download />}
                                onClick={() => {
                                  setSelectedInvoice(invoice);
                                  setShowReceipt(true);
                                }}
                              >
                                Receipt
                              </Button>
                            ) : (
                              <Button
                                size="small"
                                variant="contained"
                                startIcon={<Payment />}
                                onClick={() => {
                                  setSelectedInvoice(invoice);
                                  setPaymentModalOpen(true);
                                }}
                              >
                                Pay Now
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>

                        {/* Expandable Row Details */}
                        <TableRow>
                          <TableCell colSpan={8} sx={{ py: 0 }}>
                            <Collapse in={expanded} timeout="auto" unmountOnExit>
                              <Box sx={{ p: 3, backgroundColor: 'action.hover' }}>
                                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                  Fee Breakdown
                                </Typography>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell><strong>Item</strong></TableCell>
                                      <TableCell align="right"><strong>Amount</strong></TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {getFeeBreakdown(invoice).map((item, idx) => (
                                      <TableRow key={idx}>
                                        <TableCell>{item.item}</TableCell>
                                        <TableCell align="right">PKR {item.amount.toLocaleString()}</TableCell>
                                      </TableRow>
                                    ))}
                                    {lateFine > 0 && (
                                      <TableRow>
                                        <TableCell sx={{ color: 'error.main', fontWeight: 'bold' }}>Late Fine</TableCell>
                                        <TableCell align="right" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                                          PKR {lateFine.toLocaleString()}
                                        </TableCell>
                                      </TableRow>
                                    )}
                                    {invoice.discount && (
                                      <TableRow>
                                        <TableCell sx={{ color: 'success.main', fontWeight: 'bold' }}>Discount</TableCell>
                                        <TableCell align="right" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                                          - PKR {invoice.discount.toLocaleString()}
                                        </TableCell>
                                      </TableRow>
                                    )}
                                    <TableRow>
                                      <TableCell sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Total</TableCell>
                                      <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                                        PKR {(invoice.amount + lateFine - (invoice.discount || 0)).toLocaleString()}
                                      </TableCell>
                                    </TableRow>
                                  </TableBody>
                                </Table>
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Box>
      )}

      {/* TAB 1: PAYMENT HISTORY */}
      {mainTab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Payment History Timeline
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <Timeline>
              {paymentHistory.map((payment, index) => (
                <TimelineItem key={payment.id}>
                  <TimelineOppositeContent color="text.secondary">
                    {payment.date}
                  </TimelineOppositeContent>
                  <TimelineSeparator>
                    <TimelineDot color="success">
                      <CheckCircle />
                    </TimelineDot>
                    {index < paymentHistory.length - 1 && <TimelineConnector />}
                  </TimelineSeparator>
                  <TimelineContent>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {payment.invoice}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Amount: PKR {payment.amount.toLocaleString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Method: {payment.method}
                        </Typography>
                        <Button size="small" startIcon={<Download />} sx={{ mt: 1 }}>
                          Download Receipt
                        </Button>
                      </CardContent>
                    </Card>
                  </TimelineContent>
                </TimelineItem>
              ))}
            </Timeline>
          </CardContent>
        </Card>
      )}

      {/* TAB 2: ANALYTICS */}
      {mainTab === 2 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Fee Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={feeDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {feeDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Payment History by Semester
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={paymentHistoryChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="semester" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="amount" fill="#1976d2" name="Amount (PKR)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* PAYMENT MODAL */}
      <Dialog
        open={paymentModalOpen}
        onClose={() => !processing && setPaymentModalOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={processing || paymentSuccess}
      >
        {!processing && !paymentSuccess ? (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5" fontWeight="bold">
                  Payment Gateway
                </Typography>
                <IconButton onClick={() => setPaymentModalOpen(false)}>
                  <Close />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={3}>
                {/* LEFT: Invoice Summary */}
                <Grid size={{ xs: 12, md: 5 }}>
                  <Card sx={{ backgroundColor: 'primary.main', color: 'white', height: '100%' }}>
                    <CardContent>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        Invoice Summary
                      </Typography>
                      <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.3)' }} />
                      {selectedInvoice && (
                        <>
                          <Typography variant="body2" gutterBottom>
                            Invoice: {selectedInvoice.invoiceNo}
                          </Typography>
                          <Typography variant="body2" gutterBottom>
                            {selectedInvoice.title}
                          </Typography>
                          <Typography variant="caption" display="block" gutterBottom sx={{ opacity: 0.8 }}>
                            {selectedInvoice.description}
                          </Typography>
                          
                          <Box sx={{ mt: 3 }}>
                            <Typography variant="caption" display="block" gutterBottom>
                              Amount Breakdown:
                            </Typography>
                            {getFeeBreakdown(selectedInvoice).map((item, idx) => (
                              <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="caption">{item.item}</Typography>
                                <Typography variant="caption">PKR {item.amount.toLocaleString()}</Typography>
                              </Box>
                            ))}
                            {calculateLateFine(selectedInvoice) > 0 && (
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, color: 'error.light' }}>
                                <Typography variant="caption">Late Fine</Typography>
                                <Typography variant="caption">PKR {calculateLateFine(selectedInvoice).toLocaleString()}</Typography>
                              </Box>
                            )}
                          </Box>

                          <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.3)' }} />
                          
                          <Typography variant="h3" fontWeight="bold" sx={{ mt: 2 }}>
                            PKR {(selectedInvoice.amount + calculateLateFine(selectedInvoice)).toLocaleString()}
                          </Typography>
                          <Typography variant="caption" sx={{ opacity: 0.8 }}>
                            Total Amount
                          </Typography>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                {/* RIGHT: Payment Form */}
                <Grid size={{ xs: 12, md: 7 }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Select Payment Method
                  </Typography>
                  
                  <Tabs value={paymentMethod} onChange={(e, v) => setPaymentMethod(v)} sx={{ mb: 3 }}>
                    <Tab icon={<CreditCard />} label="Card" />
                    <Tab icon={<Phone />} label="JazzCash" />
                    <Tab icon={<Phone />} label="EasyPaisa" />
                    <Tab icon={<AccountBalance />} label="Bank" />
                  </Tabs>

                  {/* Card Payment */}
                  {paymentMethod === 0 && (
                    <Box>
                      <TextField
                        fullWidth
                        label="Card Number"
                        placeholder="1234 5678 9012 3456"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                        sx={{ mb: 2 }}
                        inputProps={{ maxLength: 19 }}
                      />
                      <TextField
                        fullWidth
                        label="Cardholder Name"
                        placeholder="JOHN DOE"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value.toUpperCase())}
                        sx={{ mb: 2 }}
                      />
                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid size={6}>
                          <TextField
                            fullWidth
                            label="Expiry (MM/YY)"
                            placeholder="12/26"
                            value={expiryDate}
                            onChange={(e) => {
                              let val = e.target.value.replace(/\D/g, '');
                              if (val.length >= 2) val = val.slice(0, 2) + '/' + val.slice(2, 4);
                              setExpiryDate(val);
                            }}
                            inputProps={{ maxLength: 5 }}
                          />
                        </Grid>
                        <Grid size={6}>
                          <TextField
                            fullWidth
                            label="CVV"
                            placeholder="123"
                            value={cvv}
                            onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                            inputProps={{ maxLength: 3 }}
                            type="password"
                          />
                        </Grid>
                      </Grid>
                      <FormControlLabel
                        control={<Checkbox checked={saveCard} onChange={(e) => setSaveCard(e.target.checked)} />}
                        label="Save card for future payments"
                      />
                    </Box>
                  )}

                  {/* JazzCash */}
                  {paymentMethod === 1 && (
                    <Box>
                      <TextField
                        fullWidth
                        label="JazzCash Number"
                        placeholder="03xxxxxxxxx"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                        sx={{ mb: 2 }}
                        inputProps={{ maxLength: 11 }}
                      />
                      <TextField
                        fullWidth
                        label="PIN"
                        placeholder="Enter your PIN"
                        type="password"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        sx={{ mb: 2 }}
                        inputProps={{ maxLength: 5 }}
                      />
                      <Alert severity="info">
                        You will receive an OTP for verification
                      </Alert>
                    </Box>
                  )}

                  {/* EasyPaisa */}
                  {paymentMethod === 2 && (
                    <Box>
                      <TextField
                        fullWidth
                        label="EasyPaisa Number"
                        placeholder="03xxxxxxxxx"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                        sx={{ mb: 2 }}
                        inputProps={{ maxLength: 11 }}
                      />
                      <TextField
                        fullWidth
                        label="PIN"
                        placeholder="Enter your PIN"
                        type="password"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        sx={{ mb: 2 }}
                        inputProps={{ maxLength: 5 }}
                      />
                      <Alert severity="info">
                        You will receive an OTP for verification
                      </Alert>
                    </Box>
                  )}

                  {/* Bank Transfer */}
                  {paymentMethod === 3 && (
                    <Box>
                      <Alert severity="info" sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                          Bank Account Details
                        </Typography>
                        <Typography variant="body2">
                          Bank: Allied Bank Limited<br />
                          Account Title: University Fee Collection<br />
                          Account Number: 0010-1234567890<br />
                          IBAN: PK36ABPA0010001234567890
                        </Typography>
                      </Alert>
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<AttachFile />}
                        sx={{ mb: 2 }}
                      >
                        Upload Payment Receipt
                      </Button>
                      <Typography variant="caption" color="text.secondary">
                        Please upload your bank transfer receipt for verification
                      </Typography>
                    </Box>
                  )}

                  <Divider sx={{ my: 3 }} />

                  {/* Terms and Security */}
                  <FormControlLabel
                    control={<Checkbox checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} />}
                    label={<Typography variant="body2">I agree to the terms and conditions</Typography>}
                  />

                  <Box sx={{ display: 'flex', gap: 2, mt: 2, justifyContent: 'center' }}>
                    <Security color="action" />
                    <Typography variant="caption" color="text.secondary">
                      Secured by SSL & PCI-DSS Certified
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
              <Button onClick={() => setPaymentModalOpen(false)} size="large">
                Cancel
              </Button>
              <Button
                variant="contained"
                size="large"
                startIcon={<Payment />}
                onClick={handlePaymentSubmit}
                disabled={
                  !termsAccepted ||
                  (paymentMethod === 0 && (!cardNumber || !cardName || !expiryDate || !cvv)) ||
                  ((paymentMethod === 1 || paymentMethod === 2) && (!phoneNumber || !pin))
                }
                sx={{ px: 4 }}
              >
                Process Payment
              </Button>
            </DialogActions>
          </>
        ) : processing ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, p: 4 }}>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Processing Payment...
            </Typography>
            <Stepper activeStep={processingStep} sx={{ width: '100%', maxWidth: 600, mt: 4 }}>
              {processingSteps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
            <LinearProgress sx={{ width: '100%', maxWidth: 600, mt: 4 }} />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 500, p: 4 }}>
            <Box
              sx={{
                width: 120,
                height: 120,
                borderRadius: '50%',
                backgroundColor: 'success.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'scaleIn 0.5s ease',
                '@keyframes scaleIn': {
                  from: { transform: 'scale(0)', opacity: 0 },
                  to: { transform: 'scale(1)', opacity: 1 },
                },
                mb: 3,
              }}
            >
              <CheckCircle sx={{ fontSize: 80, color: 'white' }} />
            </Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Payment Successful!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              Your payment has been processed successfully
            </Typography>
            
            {/* Receipt Preview */}
            <Card sx={{ maxWidth: 500, width: '100%', mb: 3 }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom align="center">
                  Payment Receipt
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Receipt No:</Typography>
                  <Typography variant="body2" fontWeight="bold">RCP-{Date.now().toString().slice(-8)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Date:</Typography>
                  <Typography variant="body2" fontWeight="bold">{new Date().toLocaleString()}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Student:</Typography>
                  <Typography variant="body2" fontWeight="bold">{currentUser.name}</Typography>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6" fontWeight="bold">Amount Paid:</Typography>
                  <Typography variant="h6" fontWeight="bold" color="success.main">
                    PKR {selectedInvoice && (selectedInvoice.amount + calculateLateFine(selectedInvoice)).toLocaleString()}
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            <Stack direction="row" spacing={2}>
              <Button variant="contained" startIcon={<Download />} size="large">
                Download Receipt
              </Button>
              <Button variant="outlined" onClick={() => {
                setPaymentModalOpen(false);
                setPaymentSuccess(false);
                setSelectedInvoice(null);
                setCardNumber('');
                setCardName('');
                setExpiryDate('');
                setCvv('');
                setPhoneNumber('');
                setPin('');
                setTermsAccepted(false);
              }} size="large">
                Done
              </Button>
            </Stack>
          </Box>
        )}
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onClose={() => setShowReceipt(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold">Payment Receipt</Typography>
        </DialogTitle>
        <DialogContent>
          {selectedInvoice && (
            <Box sx={{ p: 2, border: '2px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Typography variant="h6" fontWeight="bold" align="center" gutterBottom>
                University Fee Receipt
              </Typography>
              <Typography variant="caption" display="block" align="center" color="text.secondary" gutterBottom>
                Official Receipt
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={1}>
                <Grid size={6}><Typography variant="body2" color="text.secondary">Receipt No:</Typography></Grid>
                <Grid size={6}><Typography variant="body2" fontWeight="bold" align="right">RCP-{selectedInvoice.id}</Typography></Grid>
                <Grid size={6}><Typography variant="body2" color="text.secondary">Student Name:</Typography></Grid>
                <Grid size={6}><Typography variant="body2" fontWeight="bold" align="right">{currentUser.name}</Typography></Grid>
                <Grid size={6}><Typography variant="body2" color="text.secondary">Roll Number:</Typography></Grid>
                <Grid size={6}><Typography variant="body2" fontWeight="bold" align="right">{currentUser.rollNo}</Typography></Grid>
                <Grid size={6}><Typography variant="body2" color="text.secondary">Invoice:</Typography></Grid>
                <Grid size={6}><Typography variant="body2" fontWeight="bold" align="right">{selectedInvoice.invoiceNo}</Typography></Grid>
                <Grid size={6}><Typography variant="body2" color="text.secondary">Payment Date:</Typography></Grid>
                <Grid size={6}><Typography variant="body2" fontWeight="bold" align="right">{selectedInvoice.paidOn || new Date().toLocaleDateString()}</Typography></Grid>
              </Grid>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, backgroundColor: 'success.light', borderRadius: 1 }}>
                <Typography variant="h6" fontWeight="bold">Amount Paid:</Typography>
                <Typography variant="h6" fontWeight="bold">PKR {selectedInvoice.amount.toLocaleString()}</Typography>
              </Box>
              <Typography variant="caption" display="block" align="center" color="text.secondary" sx={{ mt: 2 }}>
                This is a computer-generated receipt and requires no signature.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowReceipt(false)}>Close</Button>
          <Button variant="contained" startIcon={<Download />}>Download PDF</Button>
          <Button variant="outlined" startIcon={<Print />}>Print</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for Notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
    </motion.div>
  );
};

export default FeeVouchers;
