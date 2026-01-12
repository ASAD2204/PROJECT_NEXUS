import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Paper,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Badge,
  InputAdornment,
  Alert,
  LinearProgress,
  Rating,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Snackbar,
  Stack,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add,
  Search,
  FilterList,
  AttachFile,
  Send,
  Comment,
  ExpandMore,
  AccessTime,
  CheckCircle,
  Pending,
  HourglassEmpty,
  Close,
  Download,
  Email,
  Phone,
  SentimentSatisfied,
  SentimentNeutral,
  SentimentDissatisfied,
  Person,
  AdminPanelSettings,
  Lightbulb,
  ContactSupport,
  DescriptionOutlined,
} from '@mui/icons-material';
import {
  grievances,
  submitGrievance,
  addGrievanceComment,
  closeGrievance,
  currentUser,
} from '../../data/dummyData';
import { GridSkeleton } from '../../components/Common/LoadingSkeleton';
import { pageTransition, staggerContainer, fadeInUp } from '../../utils/animations';

const Grievances = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [grievanceList, setGrievanceList] = useState(grievances);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedGrievance, setSelectedGrievance] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Form state
  const [formData, setFormData] = useState({
    category: '',
    priority: '',
    subject: '',
    description: '',
    attachments: [],
  });

  // Comment state
  const [newComment, setNewComment] = useState('');

  // Loading effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1300);
    return () => clearTimeout(timer);
  }, []);

  // SLA countdown
  const [countdown, setCountdown] = useState({});

  useEffect(() => {
    const interval = setInterval(() => {
      const newCountdown = {};
      grievanceList.forEach(g => {
        if (g.status !== 'Closed' && g.status !== 'Resolved') {
          const deadline = new Date(g.slaDeadline);
          const now = new Date();
          const diff = deadline - now;
          
          if (diff > 0) {
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            newCountdown[g.id] = `${hours}h ${minutes}m`;
          } else {
            newCountdown[g.id] = 'Overdue';
          }
        }
      });
      setCountdown(newCountdown);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [grievanceList]);

  // Initialize countdown
  useEffect(() => {
    const newCountdown = {};
    grievanceList.forEach(g => {
      if (g.status !== 'Closed' && g.status !== 'Resolved') {
        const deadline = new Date(g.slaDeadline);
        const now = new Date();
        const diff = deadline - now;
        
        if (diff > 0) {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          newCountdown[g.id] = `${hours}h ${minutes}m`;
        } else {
          newCountdown[g.id] = 'Overdue';
        }
      }
    });
    setCountdown(newCountdown);
  }, [grievanceList]);

  // Sentiment analysis
  const getSentiment = (score) => {
    if (score > 0.3) return { icon: <SentimentSatisfied />, label: 'Positive', color: 'success' };
    if (score < -0.3) return { icon: <SentimentDissatisfied />, label: 'Negative', color: 'error' };
    return { icon: <SentimentNeutral />, label: 'Neutral', color: 'warning' };
  };

  // Auto-categorization based on keywords
  const autoCategorizе = (text) => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('course') || lowerText.includes('grade') || lowerText.includes('exam') || lowerText.includes('assignment')) {
      return 'Academic';
    }
    if (lowerText.includes('fee') || lowerText.includes('payment') || lowerText.includes('voucher')) {
      return 'Finance';
    }
    if (lowerText.includes('wifi') || lowerText.includes('internet') || lowerText.includes('login') || lowerText.includes('password')) {
      return 'Technical';
    }
    if (lowerText.includes('lab') || lowerText.includes('classroom') || lowerText.includes('ac') || lowerText.includes('facility')) {
      return 'Facilities';
    }
    return 'Other';
  };

  // Auto-priority based on keywords
  const autoPriority = (text) => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('urgent') || lowerText.includes('critical') || lowerText.includes('emergency') || lowerText.includes('immediately')) {
      return 'High';
    }
    if (lowerText.includes('important') || lowerText.includes('soon')) {
      return 'Medium';
    }
    return 'Low';
  };

  // Calculate sentiment score (simulation)
  const calculateSentiment = (text) => {
    const lowerText = text.toLowerCase();
    let score = 0;
    
    // Negative words
    const negativeWords = ['unable', 'cannot', 'not working', 'error', 'issue', 'problem', 'broken', 'slow', 'bad'];
    negativeWords.forEach(word => {
      if (lowerText.includes(word)) score -= 0.2;
    });
    
    // Positive words
    const positiveWords = ['thank', 'please', 'appreciate', 'good', 'working', 'resolved'];
    positiveWords.forEach(word => {
      if (lowerText.includes(word)) score += 0.2;
    });
    
    return Math.max(-1, Math.min(1, score));
  };

  const handleSubmit = () => {
    if (!formData.category || !formData.priority || !formData.subject || !formData.description) {
      setSnackbar({ open: true, message: 'Please fill all required fields', severity: 'error' });
      return;
    }

    const sentimentScore = calculateSentiment(formData.description);
    const result = submitGrievance({
      ...formData,
      sentimentScore,
    });

    if (result.success) {
      setSnackbar({ open: true, message: `${result.message} Ticket ID: ${result.ticketId}`, severity: 'success' });
      setSubmitModalOpen(false);
      setFormData({
        category: '',
        priority: '',
        subject: '',
        description: '',
        attachments: [],
      });
      setGrievanceList([...grievances]);
    }
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    const result = addGrievanceComment(selectedGrievance.id, newComment);
    if (result.success) {
      setSnackbar({ open: true, message: result.message, severity: 'success' });
      setNewComment('');
      setSelectedGrievance({ ...grievances.find(g => g.id === selectedGrievance.id) });
      setGrievanceList([...grievances]);
    }
  };

  const handleCloseTicket = (rating) => {
    const result = closeGrievance(selectedGrievance.id, rating);
    if (result.success) {
      setSnackbar({ open: true, message: result.message, severity: 'success' });
      setDetailsModalOpen(false);
      setGrievanceList([...grievances]);
    } else {
      setSnackbar({ open: true, message: result.message, severity: 'error' });
    }
  };

  const handleAutoFill = () => {
    const category = autoCategorizе(formData.description);
    const priority = autoPriority(formData.description);
    setFormData({ ...formData, category, priority });
    setSnackbar({ open: true, message: 'Auto-filled category and priority based on description', severity: 'info' });
  };

  // Filter grievances
  const filteredGrievances = grievanceList.filter(g => {
    const matchesSearch = 
      g.ticketId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || g.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Status stepper
  const getStatusSteps = (grievance) => {
    const steps = ['Submitted', 'Open', 'In Progress', 'Resolved', 'Closed'];
    const currentIndex = steps.indexOf(grievance.status);
    return { steps, currentIndex };
  };

  // FAQs
  const faqs = [
    {
      question: 'How to reset my password?',
      answer: 'To reset your password, go to the login page and click on "Forgot Password". Enter your email address and you will receive a password reset link. Follow the instructions in the email to set a new password. If you don\'t receive the email within 5 minutes, check your spam folder or contact IT support.'
    },
    {
      question: 'How to download my transcript?',
      answer: 'You can download your transcript from the Student Portal. Go to Dashboard > Transcript section. Click on the "Download PDF" button. The transcript will include all your completed courses, grades, and CGPA. For official transcripts with university seal, submit a request through the Academic Office.'
    },
    {
      question: 'Fee payment issues - what to do?',
      answer: 'If you\'re facing issues with fee payment: 1) Ensure your fee voucher is generated (Finance > Fee Vouchers). 2) Check if your payment method is supported (Card, JazzCash, EasyPaisa, Bank Transfer). 3) Clear browser cache and try again. 4) If the problem persists, submit a grievance with category "Finance" and attach screenshots of the error.'
    },
    {
      question: 'How to mark attendance?',
      answer: 'Attendance is marked using the Smart Attendance system with facial recognition. Go to Attendance > Mark Attendance, select your course, and follow the biometric verification process. Make sure you have good lighting and your face is clearly visible to the camera. If you face any issues, contact your course instructor.'
    },
    {
      question: 'How to submit an assignment?',
      answer: 'To submit an assignment: 1) Go to LMS > My Courses. 2) Select your course. 3) Click on the assignment you want to submit. 4) Upload your file (PDF, DOCX, or ZIP, max 10MB). 5) Add any comments if needed. 6) Click "Submit". You will receive a confirmation email once submitted successfully.'
    },
  ];

  const getPriorityColor = (priority) => {
    if (priority === 'High') return 'error';
    if (priority === 'Medium') return 'warning';
    return 'default';
  };

  const getStatusColor = (status) => {
    if (status === 'Closed' || status === 'Resolved') return 'success';
    if (status === 'In Progress') return 'info';
    if (status === 'Open') return 'warning';
    return 'default';
  };

  const getStatusIcon = (status) => {
    if (status === 'Closed' || status === 'Resolved') return <CheckCircle />;
    if (status === 'In Progress') return <HourglassEmpty />;
    if (status === 'Open') return <Pending />;
    return <AccessTime />;
  };

  // Show loading skeleton
  if (loading) {
    return (
      <Box sx={{ pb: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Grievance Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Submit and track your concerns
          </Typography>
        </Box>
        <GridSkeleton items={6} columns={{ xs: 12, md: 6 }} />
      </Box>
    );
  }

  return (
    <Box className="page-container">
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Grievance Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Submit and track your concerns, complaints, and feedback
        </Typography>
      </Box>

      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<DescriptionOutlined />} label="My Grievances" iconPosition="start" />
          <Tab icon={<Lightbulb />} label="FAQs & Help" iconPosition="start" />
        </Tabs>
      </Card>

      {/* TAB 1: My Grievances */}
      {activeTab === 0 && (
        <Box>
          {/* Submit New Grievance Card */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    Have a concern?
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Submit a grievance and we'll help resolve it
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<Add />}
                  onClick={() => setSubmitModalOpen(true)}
                >
                  Raise a Concern
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Search and Filter */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    placeholder="Search by ticket ID, subject, category..."
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
                <Grid size={{ xs: 12, md: 3 }}>
                  <FormControl fullWidth>
                    <InputLabel>Filter by Status</InputLabel>
                    <Select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      label="Filter by Status"
                    >
                      <MenuItem value="All">All</MenuItem>
                      <MenuItem value="Submitted">Submitted</MenuItem>
                      <MenuItem value="Open">Open</MenuItem>
                      <MenuItem value="In Progress">In Progress</MenuItem>
                      <MenuItem value="Resolved">Resolved</MenuItem>
                      <MenuItem value="Closed">Closed</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <Button fullWidth variant="outlined" startIcon={<Download />}>
                    Export Report
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Grievance List */}
          <Typography variant="h6" gutterBottom>
            My Grievances ({filteredGrievances.length})
          </Typography>
          <Grid container spacing={3}>
            {filteredGrievances.map((grievance) => {
              const sentiment = getSentiment(grievance.sentimentScore);
              return (
                <Grid size={12} key={grievance.id}>
                  <Card
                    sx={{
                      '&:hover': {
                        boxShadow: 4,
                        transition: 'all 0.3s',
                      },
                    }}
                  >
                    <CardContent>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 8 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Typography variant="h6" fontWeight="bold">
                              {grievance.ticketId}
                            </Typography>
                            <Chip label={grievance.category} size="small" color="primary" variant="outlined" />
                            <Chip
                              label={grievance.priority}
                              size="small"
                              color={getPriorityColor(grievance.priority)}
                            />
                            <Chip
                              icon={getStatusIcon(grievance.status)}
                              label={grievance.status}
                              size="small"
                              color={getStatusColor(grievance.status)}
                            />
                          </Box>
                          <Typography
                            variant="body1"
                            fontWeight="600"
                            gutterBottom
                            sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
                            onClick={() => {
                              setSelectedGrievance(grievance);
                              setDetailsModalOpen(true);
                            }}
                          >
                            {grievance.subject}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {grievance.description.substring(0, 100)}...
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                            <Typography variant="caption" color="text.secondary">
                              Submitted: {new Date(grievance.submittedAt).toLocaleString()}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Updated: {new Date(grievance.updatedAt).toLocaleString()}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Assigned to: {grievance.assignedTo}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, height: '100%' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Tooltip title={`Sentiment: ${sentiment.label}`}>
                                <Chip
                                  icon={sentiment.icon}
                                  label={sentiment.label}
                                  size="small"
                                  color={sentiment.color}
                                />
                              </Tooltip>
                            </Box>
                            {countdown[grievance.id] && (
                              <Alert
                                severity={countdown[grievance.id] === 'Overdue' ? 'error' : 'info'}
                                icon={<AccessTime />}
                                sx={{ py: 0 }}
                              >
                                <Typography variant="caption">
                                  {countdown[grievance.id] === 'Overdue' 
                                    ? 'SLA Overdue!' 
                                    : `Resolves in ${countdown[grievance.id]}`}
                                </Typography>
                              </Alert>
                            )}
                            <Box sx={{ mt: 'auto', display: 'flex', gap: 1 }}>
                              <Button
                                fullWidth
                                variant="outlined"
                                size="small"
                                startIcon={<Comment />}
                                onClick={() => {
                                  setSelectedGrievance(grievance);
                                  setDetailsModalOpen(true);
                                }}
                              >
                                View Details
                              </Button>
                            </Box>
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {filteredGrievances.length === 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              No grievances found. Click "Raise a Concern" to submit a new grievance.
            </Alert>
          )}
        </Box>
      )}

      {/* TAB 2: FAQs & Help */}
      {activeTab === 1 && (
        <Box>
          {/* Common Issues Accordion */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Frequently Asked Questions
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {faqs.map((faq, index) => (
                <Accordion key={index}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography fontWeight="600">{faq.question}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" color="text.secondary">
                      {faq.answer}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              ))}
            </CardContent>
          </Card>

          {/* Contact Support Card */}
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                <ContactSupport sx={{ verticalAlign: 'middle', mr: 1 }} />
                Contact Support
              </Typography>
              <Divider sx={{ mb: 3 }} />
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper sx={{ p: 3, backgroundColor: 'action.hover' }}>
                    <Email sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      Email Support
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      support@university.edu
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      Response time: 24 hours
                    </Typography>
                    <Button variant="contained" fullWidth sx={{ mt: 2 }} startIcon={<Email />}>
                      Send Email
                    </Button>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper sx={{ p: 3, backgroundColor: 'action.hover' }}>
                    <Phone sx={{ fontSize: 40, color: 'success.main', mb: 2 }} />
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      Phone Support
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      +92 21 1234 5678
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      Office Hours: Mon-Fri, 9:00 AM - 5:00 PM
                    </Typography>
                    <Button variant="contained" color="success" fullWidth sx={{ mt: 2 }} startIcon={<Phone />}>
                      Call Now
                    </Button>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Submit Grievance Modal */}
      <Dialog open={submitModalOpen} onClose={() => setSubmitModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight="bold">
              Submit New Grievance
            </Typography>
            <IconButton onClick={() => setSubmitModalOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 0 }}>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Subject"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Brief summary of your concern"
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Description"
                required
                multiline
                rows={6}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Provide detailed information about your grievance..."
                helperText={`${formData.description.length} characters`}
              />
              {formData.description.length > 50 && (
                <Button size="small" onClick={handleAutoFill} sx={{ mt: 1 }}>
                  Auto-fill Category & Priority
                </Button>
              )}
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  label="Category"
                >
                  <MenuItem value="Academic">Academic</MenuItem>
                  <MenuItem value="Finance">Finance</MenuItem>
                  <MenuItem value="Facilities">Facilities</MenuItem>
                  <MenuItem value="Technical">Technical</MenuItem>
                  <MenuItem value="HR">HR</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  label="Priority"
                >
                  <MenuItem value="Low">Low</MenuItem>
                  <MenuItem value="Medium">Medium</MenuItem>
                  <MenuItem value="High">High</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={12}>
              <Button variant="outlined" startIcon={<AttachFile />} component="label">
                Attach Files (Optional)
                <input type="file" hidden multiple />
              </Button>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                Max file size: 10MB. Supported formats: PDF, JPG, PNG, DOCX
              </Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setSubmitModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} startIcon={<Send />}>
            Submit Grievance
          </Button>
        </DialogActions>
      </Dialog>

      {/* Grievance Details Modal */}
      <Dialog
        open={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        maxWidth="md"
        fullWidth
        scroll="paper"
      >
        {selectedGrievance && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" fontWeight="bold">
                  {selectedGrievance.ticketId}
                </Typography>
                <IconButton onClick={() => setDetailsModalOpen(false)}>
                  <Close />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              {/* Status Timeline */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Status Timeline
                </Typography>
                <Stepper activeStep={getStatusSteps(selectedGrievance).currentIndex} orientation="vertical">
                  {getStatusSteps(selectedGrievance).steps.map((label, index) => (
                    <Step key={label}>
                      <StepLabel>{label}</StepLabel>
                      {index === getStatusSteps(selectedGrievance).currentIndex && (
                        <StepContent>
                          <Typography variant="caption" color="text.secondary">
                            Last updated: {new Date(selectedGrievance.updatedAt).toLocaleString()}
                          </Typography>
                        </StepContent>
                      )}
                    </Step>
                  ))}
                </Stepper>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Ticket Information */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={6}>
                  <Typography variant="caption" color="text.secondary">Category</Typography>
                  <Typography variant="body2" fontWeight="bold">{selectedGrievance.category}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" color="text.secondary">Priority</Typography>
                  <Chip label={selectedGrievance.priority} size="small" color={getPriorityColor(selectedGrievance.priority)} />
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" color="text.secondary">Assigned To</Typography>
                  <Typography variant="body2" fontWeight="bold">{selectedGrievance.assignedTo}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" color="text.secondary">Sentiment</Typography>
                  <Box>
                    <Chip
                      icon={getSentiment(selectedGrievance.sentimentScore).icon}
                      label={getSentiment(selectedGrievance.sentimentScore).label}
                      size="small"
                      color={getSentiment(selectedGrievance.sentimentScore).color}
                    />
                  </Box>
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              {/* Subject & Description */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Subject
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedGrievance.subject}
                </Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Description
                </Typography>
                <Paper sx={{ p: 2, backgroundColor: 'action.hover' }}>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {selectedGrievance.description}
                  </Typography>
                </Paper>
              </Box>

              {/* Attachments */}
              {selectedGrievance.attachments && selectedGrievance.attachments.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Attachments
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    {selectedGrievance.attachments.map((file, index) => (
                      <Chip key={index} label={file} icon={<AttachFile />} variant="outlined" />
                    ))}
                  </Stack>
                </Box>
              )}

              <Divider sx={{ my: 3 }} />

              {/* Comments Thread */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Comments & Updates ({selectedGrievance.comments.length})
                </Typography>
                <List>
                  {selectedGrievance.comments.map((comment) => (
                    <ListItem key={comment.id} alignItems="flex-start" sx={{ px: 0 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: comment.role === 'Admin' ? 'primary.main' : 'secondary.main' }}>
                          {comment.role === 'Admin' ? <AdminPanelSettings /> : <Person />}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {comment.author}
                            </Typography>
                            <Chip label={comment.role} size="small" />
                            <Typography variant="caption" color="text.secondary">
                              {new Date(comment.timestamp).toLocaleString()}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Paper sx={{ p: 2, mt: 1, backgroundColor: 'action.hover' }}>
                            <Typography variant="body2">{comment.text}</Typography>
                          </Paper>
                        }
                      />
                    </ListItem>
                  ))}
                </List>

                {/* Add Comment */}
                {selectedGrievance.status !== 'Closed' && (
                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <TextField
                      fullWidth
                      placeholder="Add a comment..."
                      multiline
                      rows={2}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                    />
                    <Button
                      variant="contained"
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      startIcon={<Send />}
                    >
                      Send
                    </Button>
                  </Box>
                )}
              </Box>

              {/* Resolution */}
              {selectedGrievance.resolution && (
                <Box sx={{ mb: 3 }}>
                  <Alert severity="success" icon={<CheckCircle />}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      Resolution
                    </Typography>
                    <Typography variant="body2">{selectedGrievance.resolution}</Typography>
                  </Alert>
                </Box>
              )}

              {/* Satisfaction Rating */}
              {selectedGrievance.status === 'Resolved' && !selectedGrievance.satisfactionRating && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Rate Your Satisfaction
                  </Typography>
                  <Rating
                    size="large"
                    onChange={(event, newValue) => {
                      if (newValue) handleCloseTicket(newValue);
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    Rate your experience and close this ticket
                  </Typography>
                </Box>
              )}

              {selectedGrievance.satisfactionRating && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Your Rating
                  </Typography>
                  <Rating value={selectedGrievance.satisfactionRating} readOnly size="large" />
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
              <Button onClick={() => setDetailsModalOpen(false)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

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

export default Grievances;
