import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Chip,
  Divider,
  Stack,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  ExpandMore,
  HelpOutline,
  Email,
  Phone,
  LocationOn,
  Send,
  CheckCircle,
  School,
  Payment,
  Assignment,
  LibraryBooks,
  Group,
  Security,
  Language,
  Feedback,
} from '@mui/icons-material';
import { pageTransition } from '../../utils/animations';
import PageHeader from '../../components/Common/PageHeader';

const HelpSupport = () => {
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    category: '',
    description: '',
  });
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(false);

  const handleChange = (field, value) => {
    setTicketForm({ ...ticketForm, [field]: value });
  };

  const handleSubmitTicket = () => {
    // Simulate ticket submission
    setShowSuccessDialog(true);
    setTicketForm({ subject: '', category: '', description: '' });
  };

  const faqCategories = [
    {
      title: 'Account & Access',
      icon: Security,
      color: '#2563EB',
      faqs: [
        {
          question: 'How do I reset my password?',
          answer: 'Go to the login page and click on "Forgot Password". Enter your email address, and you will receive a password reset link within a few minutes.',
        },
        {
          question: 'How do I update my profile information?',
          answer: 'Navigate to your Profile page from the sidebar menu. Click the "Edit Profile" button to update your personal information, contact details, and profile picture.',
        },
        {
          question: 'How do I enable biometric authentication?',
          answer: 'Go to Settings > Security > Biometric Enrollment. Follow the on-screen instructions to enroll your fingerprint or facial recognition.',
        },
      ],
    },
    {
      title: 'Attendance & Classes',
      icon: School,
      color: '#059669',
      faqs: [
        {
          question: 'How does smart attendance work?',
          answer: 'Smart Attendance uses GPS verification and face recognition technology. Make sure you are at the class location, then use your device camera for facial verification.',
        },
        {
          question: 'What if I miss marking attendance?',
          answer: 'Contact your course instructor or submit a grievance through the Grievances portal explaining the reason. Late attendance marking may require approval.',
        },
        {
          question: 'Can I view my attendance history?',
          answer: 'Yes, go to Attendance > History to view your complete attendance records for all courses, including dates, times, and status.',
        },
      ],
    },
    {
      title: 'Assignments & Submissions',
      icon: Assignment,
      color: '#D97706',
      faqs: [
        {
          question: 'How do I submit an assignment?',
          answer: 'Navigate to Assignments, select the assignment, and click "Submit Now". Upload your files (PDF, DOC, or ZIP) and add any comments before final submission.',
        },
        {
          question: 'Can I resubmit an assignment?',
          answer: 'Resubmission depends on your instructor\'s settings. If allowed, you\'ll see a "Resubmit" button on already submitted assignments.',
        },
        {
          question: 'What file formats are supported?',
          answer: 'Supported formats include PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, ZIP, RAR, and common image formats (JPG, PNG). Maximum file size is 50MB.',
        },
      ],
    },
    {
      title: 'Fee Management',
      icon: Payment,
      color: '#DC2626',
      faqs: [
        {
          question: 'How can I download my fee voucher?',
          answer: 'Go to Fee Management > Fee Vouchers, select the voucher you need, and click the "Download" button to get a PDF copy.',
        },
        {
          question: 'What payment methods are accepted?',
          answer: 'You can pay through bank deposit, online transfer, or in-person at the university accounts office. Payment details are on your fee voucher.',
        },
        {
          question: 'How do I check my payment history?',
          answer: 'Navigate to Fee Management to view all your invoices, payment history, and outstanding balances.',
        },
      ],
    },
    {
      title: 'Library Services',
      icon: LibraryBooks,
      color: '#0891B2',
      faqs: [
        {
          question: 'How do I borrow a book?',
          answer: 'Search for books in the Library Catalog, check availability, and click "Reserve". Visit the library with your student card to collect reserved books.',
        },
        {
          question: 'What is the book return policy?',
          answer: 'Books must be returned within 14 days. Late returns incur a fine of PKR 10 per day. You can renew books online if no other reservations exist.',
        },
        {
          question: 'Can I access e-books?',
          answer: 'Yes, the Library section provides access to e-books and digital resources. Use your student credentials to access the digital library.',
        },
      ],
    },
    {
      title: 'Technical Issues',
      icon: Language,
      color: '#7C3AED',
      faqs: [
        {
          question: 'The website is not loading properly',
          answer: 'Try clearing your browser cache and cookies. Ensure you are using the latest version of Chrome, Firefox, or Edge. If the issue persists, contact IT support.',
        },
        {
          question: 'I cannot upload files',
          answer: 'Check your internet connection and ensure file size is under 50MB. Try using a different browser. If the problem continues, report it through the feedback form.',
        },
        {
          question: 'The chat feature is not working',
          answer: 'Make sure you have granted camera/microphone permissions if using video chat. Check your internet connection and try refreshing the page.',
        },
      ],
    },
  ];

  const contactInfo = [
    {
      icon: Email,
      title: 'Email Support',
      value: 'support@nexus.edu.pk',
      description: 'Response within 24 hours',
    },
    {
      icon: Phone,
      title: 'Phone Support',
      value: '+92 42 111-222-333',
      description: 'Mon-Fri, 9:00 AM - 5:00 PM',
    },
    {
      icon: LocationOn,
      title: 'Campus Office',
      value: 'Student Services Center, 2nd Floor',
      description: 'Walk-in support available',
    },
  ];

  return (
    <motion.div {...pageTransition}>
      <Box className="page-container">
        <PageHeader
          title="Help & Support"
          subtitle="Get assistance with your Nexus portal experience"
          icon={HelpOutline}
        />

        {/* Quick Contact Info */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {contactInfo.map((contact, index) => (
            <Grid size={{ xs: 12, md: 4 }} key={index}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                      <contact.icon />
                    </Avatar>
                    <Typography variant="h6" fontWeight="bold">
                      {contact.title}
                    </Typography>
                  </Box>
                  <Typography variant="body1" fontWeight="600" color="text.primary" gutterBottom>
                    {contact.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {contact.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={3}>
          {/* FAQ Section */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <Card>
              <CardContent>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  Frequently Asked Questions
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Find quick answers to common questions
                </Typography>

                {faqCategories.map((category, categoryIndex) => (
                  <Box key={categoryIndex} sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar sx={{ bgcolor: category.color, mr: 2, width: 40, height: 40 }}>
                        <category.icon />
                      </Avatar>
                      <Typography variant="h6" fontWeight="bold">
                        {category.title}
                      </Typography>
                    </Box>

                    {category.faqs.map((faq, faqIndex) => (
                      <Accordion key={faqIndex} sx={{ mb: 1 }}>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                          <Typography variant="subtitle2" fontWeight="600">
                            {faq.question}
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Typography variant="body2" color="text.secondary">
                            {faq.answer}
                          </Typography>
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>

          {/* Submit Ticket Form */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <Card sx={{ position: 'sticky', top: 80 }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Submit a Support Ticket
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Can't find what you're looking for? Submit a ticket and we'll get back to you.
                </Typography>

                <Stack spacing={2}>
                  <TextField
                    label="Subject"
                    fullWidth
                    value={ticketForm.subject}
                    onChange={(e) => handleChange('subject', e.target.value)}
                    placeholder="Brief description of your issue"
                  />

                  <TextField
                    select
                    label="Category"
                    fullWidth
                    value={ticketForm.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    SelectProps={{ native: true }}
                  >
                    <option value="">Select a category</option>
                    <option value="account">Account & Access</option>
                    <option value="attendance">Attendance & Classes</option>
                    <option value="assignments">Assignments & Submissions</option>
                    <option value="fees">Fee Management</option>
                    <option value="library">Library Services</option>
                    <option value="technical">Technical Issues</option>
                    <option value="other">Other</option>
                  </TextField>

                  <TextField
                    label="Description"
                    fullWidth
                    multiline
                    rows={6}
                    value={ticketForm.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Provide detailed information about your issue..."
                  />

                  <Alert severity="info" icon={<Feedback />}>
                    Support tickets are typically responded to within 24-48 hours during business days.
                  </Alert>

                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    startIcon={<Send />}
                    onClick={handleSubmitTicket}
                    disabled={!ticketForm.subject || !ticketForm.category || !ticketForm.description}
                  >
                    Submit Ticket
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Success Dialog */}
        <Dialog open={showSuccessDialog} onClose={() => setShowSuccessDialog(false)}>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'success.main' }}>
                <CheckCircle />
              </Avatar>
              <Typography variant="h6" fontWeight="bold">
                Ticket Submitted Successfully
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" gutterBottom>
              Your support ticket has been submitted successfully. Our support team will review your request and respond within 24-48 hours.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              You can track your ticket status in the "My Tickets" section.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowSuccessDialog(false)} variant="contained">
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </motion.div>
  );
};

export default HelpSupport;
