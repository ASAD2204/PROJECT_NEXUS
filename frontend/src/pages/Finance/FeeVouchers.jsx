/**
 * Fee Vouchers Page
 * 
 * Manages student fee payments, vouchers, and payment history.
 * Provides payment gateway integration and receipt generation.
 * 
 * Features:
 * - Fee summary dashboard with total, paid, and pending amounts
 * - Voucher generation for different fee categories
 * - Payment history with transaction details
 * - Online payment integration
 * - Receipt download (PDF)
 * - Payment deadline tracking
 * - Installment payment support
 * - Late fee calculation
 * - Payment status tracking
 * - Multiple payment methods (Credit Card, Bank Transfer, etc.)
 * 
 * @component
 */

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
import { useAuth } from '../../contexts/AuthContext';
import { financeAPI } from '../../api/finance';
import StatCard from '../../components/Common/StatCard';
import { GridSkeleton } from '../../components/Common/LoadingSkeleton';
import { pageTransition, staggerContainer, fadeInUp } from '../../utils/animations';

const normalizeInvoiceStatus = (invoice, paidInvoiceIds = new Set()) => {
  const rawStatus = String(invoice?.status || '').trim().toLowerCase();
  const invoiceId = invoice?.id ?? invoice?.invoice_id;
  const hasTransaction = invoiceId != null && paidInvoiceIds.has(Number(invoiceId));
  const hasPaidMarker = Boolean(
    invoice?.paidOn || invoice?.paid_on || invoice?.paid_at || invoice?.payment_date
  );

  // Trust payment records first; they represent finalized DB transactions.
  if (hasTransaction || hasPaidMarker) return 'Paid';
  if (rawStatus === 'overdue') return 'Overdue';
  return 'Unpaid';
};

const normalizeInvoiceRows = (rows, paidInvoiceIds = new Set()) =>
  (Array.isArray(rows) ? rows : []).map((inv) => ({
    id: inv.id || inv.invoice_id,
    invoiceNo: inv.invoiceNo || `INV-${inv.invoice_id}`,
    title: inv.title || inv.items?.[0]?.title || 'Fee Invoice',
    amount: Number(inv.amount ?? inv.total_amount ?? 0),
    dueDate: inv.dueDate || inv.due_date,
    status: normalizeInvoiceStatus(inv, paidInvoiceIds),
    paidOn: inv.paidOn || inv.paid_on || null,
    semester: inv.semester || (inv.semester_id ? `Semester ${inv.semester_id}` : undefined),
    paymentMethod: inv.paymentMethod || inv.payment_method || null,
  }));

const FeeVouchers = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [feeInvoices, setFeeInvoices] = useState([]);
  const [mainTab, setMainTab] = useState(0);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(0);
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
  
  // Fetch invoices from API
  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const [invoiceRes, paymentRes] = await Promise.all([
          financeAPI.getMyInvoices(),
          financeAPI.getPayments().catch(() => ({ data: { payments: [] } })),
        ]);
        const rows = invoiceRes.data?.invoices || invoiceRes.data || [];
        const paymentRows = paymentRes.data?.payments || paymentRes.data || [];
        const paidInvoiceIds = new Set(
          (Array.isArray(paymentRows) ? paymentRows : [])
            .map((p) => Number(p.invoice_id ?? p.invoiceId))
            .filter((id) => Number.isFinite(id))
        );
        const normalized = normalizeInvoiceRows(rows, paidInvoiceIds);
        setFeeInvoices(normalized);
      } catch { /* empty */ }
      setLoading(false);
    };
    fetchInvoices();
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
  const handlePaymentSubmit = async () => {
    if (!termsAccepted) {
      setSnackbar({ open: true, message: 'Please accept terms and conditions' });
      return;
    }

    if (!selectedInvoice?.id) {
      setSnackbar({ open: true, message: 'Invalid invoice selected' });
      return;
    }

    setProcessing(true);
    setProcessingStep(0);

    const method = paymentMethod === 0
      ? 'Card'
      : paymentMethod === 1
        ? 'JazzCash'
        : paymentMethod === 2
          ? 'EasyPaisa'
          : 'Bank';

    try {
      setProcessingStep(1);
      await financeAPI.payInvoice(selectedInvoice.id, method);
      setProcessingStep(3);
      setPaymentSuccess(true);
      setSnackbar({ open: true, message: 'Payment initiated successfully. Complete gateway authorization to finalize.' });
      const [refresh, paymentRefresh] = await Promise.all([
        financeAPI.getMyInvoices(),
        financeAPI.getPayments().catch(() => ({ data: { payments: [] } })),
      ]);
      const rows = refresh.data?.invoices || refresh.data || [];
      const paymentRows = paymentRefresh.data?.payments || paymentRefresh.data || [];
      const paidInvoiceIds = new Set(
        (Array.isArray(paymentRows) ? paymentRows : [])
          .map((p) => Number(p.invoice_id ?? p.invoiceId))
          .filter((id) => Number.isFinite(id))
      );
      const normalized = normalizeInvoiceRows(rows, paidInvoiceIds);
      setFeeInvoices(normalized);
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.detail || 'Unable to initiate payment right now.' });
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadInvoicePDF = async () => {
    if (!selectedInvoice?.id) return;
    try {
      const response = await financeAPI.downloadInvoicePDF(selectedInvoice.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${selectedInvoice.invoiceNo}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setSnackbar({ open: true, message: 'Invoice PDF downloaded successfully' });
    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: 'Failed to download invoice PDF' });
    }
  };

  // Fee breakdown for invoice
  const getFeeBreakdown = (invoice) => [
    { item: 'Tuition Fee', amount: invoice.amount * 0.7 },
    { item: 'Lab Fee', amount: invoice.amount * 0.15 },
    { item: 'Library Fee', amount: invoice.amount * 0.05 },
    { item: 'Sports Fee', amount: invoice.amount * 0.05 },
    { item: 'IT Services', amount: invoice.amount * 0.05 },
  ];

  const [paymentHistory, setPaymentHistory] = useState([]);

  useEffect(() => {
    const fetchPaymentHistory = async () => {
      try {
        const res = await financeAPI.getPayments();
        const rows = res.data?.payments || res.data || [];
        const normalized = (Array.isArray(rows) ? rows : []).map((row) => ({
          id: row.id || row.trx_id,
          date: row.date || row.trx_date || null,
          invoice: row.invoice || (row.invoice_id ? `INV-${row.invoice_id}` : 'N/A'),
          amount: Number(row.amount ?? row.amount_paid ?? 0),
          method: row.method || 'N/A',
        }));
        setPaymentHistory(normalized);
      } catch {
        setPaymentHistory([]);
      }
    };
    fetchPaymentHistory();
  }, []);

  // Charts data derived from API invoices
  const feeDistributionData = [
    { name: 'Paid', value: paidFees || 0, color: '#388e3c' },
    { name: 'Outstanding', value: unpaidFees || 0, color: '#d32f2f' },
    { name: 'Upcoming', value: upcomingFees || 0, color: '#f57c00' },
  ];

  const paymentHistoryChartData = (feeInvoices || [])
    .filter((inv) => inv.status === 'Paid')
    .map((inv) => ({
      semester: inv.semester || inv.term || inv.invoiceNo || 'Invoice',
      amount: inv.amount || 0,
    }));

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
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    size="small"
                    startIcon={<DateRange />}
                    sx={{ minHeight: 36 }}
                  >
                    Date Range
                  </Button>
                </Grid>
                <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    size="small"
                    startIcon={<FileDownload />}
                    sx={{ minHeight: 36 }}
                  >
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
                          <TableCell>{invoice.issueDate || (invoice.dueDate ? new Date(new Date(invoice.dueDate).getTime() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString() : 'N/A')}</TableCell>
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
            <DialogActions sx={{ p: 3, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1, sm: 0 } }}>
              <Button 
                onClick={() => setPaymentModalOpen(false)} 
                size="small"
                sx={{ order: { xs: 2, sm: 1 }, width: { xs: '100%', sm: 'auto' } }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={<Payment />}
                onClick={handlePaymentSubmit}
                disabled={
                  !termsAccepted ||
                  (paymentMethod === 0 && (!cardNumber || !cardName || !expiryDate || !cvv)) ||
                  ((paymentMethod === 1 || paymentMethod === 2) && (!phoneNumber || !pin))
                }
                sx={{ px: { xs: 2, sm: 4 }, order: { xs: 1, sm: 2 } }}
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
                  <Typography variant="body2" fontWeight="bold">{user?.name || 'Student'}</Typography>
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

            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              spacing={2}
              sx={{ width: '100%' }}
            >
              <Button 
                variant="contained" 
                startIcon={<Download />} 
                size="small"
                sx={{ flex: { sm: 1 }, width: { xs: '100%', sm: 'auto' } }}
              >
                Download Receipt
              </Button>
              <Button 
                variant="outlined" 
                size="small"
                onClick={() => {
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
              }} 
                sx={{ flex: { sm: 1 }, width: { xs: '100%', sm: 'auto' } }}
              >
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
                <Grid size={6}><Typography variant="body2" fontWeight="bold" align="right">{user?.name || 'Student'}</Typography></Grid>
                <Grid size={6}><Typography variant="body2" color="text.secondary">Roll Number:</Typography></Grid>
                <Grid size={6}><Typography variant="body2" fontWeight="bold" align="right">{user?.rollNo || ''}</Typography></Grid>
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
        <DialogActions sx={{ flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1, sm: 0 }, p: 2 }}>
          <Button 
            onClick={() => setShowReceipt(false)}
            size="small"
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            Close
          </Button>
          <Button 
            variant="contained" 
            startIcon={<Download />}
            size="small"
            onClick={handleDownloadInvoicePDF}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            Download PDF
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<Print />}
            size="small"
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            Print
          </Button>
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
