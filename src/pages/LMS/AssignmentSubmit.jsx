/**
 * Assignment Submission and Details Page
 * 
 * Displays assignment details and handles student submissions.
 * Features three states:
 * 1. Pending - File upload interface with drag-and-drop
 * 2. Submitted - Shows submission confirmation and files
 * 3. Graded - Displays grade, feedback, and rubric breakdown
 * 
 * Features:
 * - File validation (PDF, DOCX, ZIP, max 10MB)
 * - Drag-and-drop file upload
 * - Upload progress indicator
 * - Countdown timer for due dates
 * - Grade animation for graded assignments
 * - Submission guidelines and policies
 * - Previous submission history
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
  Divider,
  Alert,
  Chip,
  Avatar,
  TextField,
  LinearProgress,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Collapse,
  Stack,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  ArrowBack,
  Send,
  CheckCircle,
  CloudUpload,
  AttachFile,
  Download,
  Delete,
  Warning,
  ExpandMore,
  Visibility,
  Close,
  InsertDriveFile,
  Schedule,
  Person,
  EventAvailable,
  EmojiEvents,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { assignments, courses, submitAssignment, currentUser } from '../../data/dummyData';
import StatusBadge from '../../components/Common/StatusBadge';
import { FormSkeleton } from '../../components/Common/LoadingSkeleton';
import { pageTransition } from '../../utils/animations';

const AssignmentSubmit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);
  const [comments, setComments] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState('');
  const [showInstructions, setShowInstructions] = useState(true);
  const [animatedGrade, setAnimatedGrade] = useState(0);

  const assignment = assignments.find((a) => a.id === id);
  const course = assignment ? courses.find((c) => c.id === assignment.courseId) : null;

  // Calculate countdown
  const getCountdown = () => {
    const now = new Date();
    const due = new Date(assignment.dueDate);
    const diff = due - now;
    
    if (diff <= 0) return { text: 'Overdue', color: 'error', days: 0 };
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    let color = 'success';
    if (days < 1) color = 'error';
    else if (days <= 3) color = 'warning';
    
    return {
      text: days > 0 ? `${days}d ${hours}h remaining` : `${hours}h remaining`,
      color,
      days
    };
  };

  const countdown = assignment ? getCountdown() : { text: '', color: 'success', days: 0 };

  // Animate grade reveal
  useEffect(() => {
    if (assignment?.obtainedMarks && assignment.status === 'Graded') {
      let start = 0;
      const end = assignment.obtainedMarks;
      const duration = 2000;
      const increment = end / (duration / 50);
      
      const timer = setInterval(() => {
        start += increment;
        if (start >= end) {
          setAnimatedGrade(end);
          clearInterval(timer);
        } else {
          setAnimatedGrade(Math.floor(start));
        }
      }, 50);
      
      return () => clearInterval(timer);
    }
  }, [assignment]);

  // File validation
  const validateFile = (file) => {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip', 'application/x-zip-compressed'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|doc|docx|zip)$/i)) {
      return 'Invalid file type. Only PDF, DOCX, and ZIP files are allowed.';
    }

    if (file.size > maxSize) {
      return 'File size exceeds 10MB limit.';
    }

    return null;
  };

  // Handle file drop
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setFileError('');

    const files = Array.from(e.dataTransfer.files);
    
    for (const file of files) {
      const error = validateFile(file);
      if (error) {
        setFileError(error);
        return;
      }
    }

    setSelectedFiles([...selectedFiles, ...files]);
  };

  // Handle file select
  const handleFileSelect = (e) => {
    setFileError('');
    const files = Array.from(e.target.files);
    
    for (const file of files) {
      const error = validateFile(file);
      if (error) {
        setFileError(error);
        return;
      }
    }

    setSelectedFiles([...selectedFiles, ...files]);
  };

  // Remove file
  const removeFile = (index) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
    setFileError('');
  };

  // Handle submit
  const handleSubmit = () => {
    setShowConfirmDialog(false);
    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          setShowSuccess(true);
          submitAssignment(id, selectedFiles);
          
          setTimeout(() => {
            navigate(-1);
          }, 3000);
          
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  if (!assignment) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Assignment not found</Typography>
      </Box>
    );
  }

  // Mock data for graded state
  const rubric = [
    { criteria: 'Code Quality', points: 5, earned: 5 },
    { criteria: 'Documentation', points: 5, earned: 4 },
    { criteria: 'Functionality', points: 10, earned: 9 },
    { criteria: 'Design', points: 5, earned: 5 },
  ];

  const previousSubmissions = [
    { id: 1, submittedAt: '2026-01-02 10:30 AM', files: ['Assignment_v1.pdf'], grade: '20/25' },
    { id: 2, submittedAt: '2026-01-03 02:15 PM', files: ['Assignment_v2.pdf'], grade: '23/25' },
  ];

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Show loading skeleton
  if (loading) {
    return (
      <Box sx={{ pb: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
          sx={{ mb: 2 }}
        >
          Back to Course
        </Button>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Loading Assignment...
          </Typography>
        </Box>
        <FormSkeleton fields={6} />
      </Box>
    );
  }

  return (
    <motion.div {...pageTransition}>
    <Box className="page-container">
      {/* Back Button */}
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate(-1)}
        sx={{ mb: 2 }}
      >
        Back to Course
      </Button>

      {/* Success Animation */}
      {showSuccess && (
        <Alert 
          severity="success" 
          icon={<CheckCircle />}
          sx={{ 
            mb: 3, 
            animation: 'slideUp 0.5s ease',
            '@keyframes slideUp': {
              from: { transform: 'translateY(20px)', opacity: 0 },
              to: { transform: 'translateY(0)', opacity: 1 },
            },
          }}
        >
          <Typography variant="h6" fontWeight="bold">
            Assignment Submitted Successfully! 🎉
          </Typography>
          <Typography variant="body2">
            Your submission has been recorded. Redirecting...
          </Typography>
        </Alert>
      )}

      {/* Split Screen Layout */}
      <Grid container spacing={3}>
        {/* LEFT PANEL - 40% */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Stack spacing={3}>
            {/* Assignment Details Card */}
            <Card>
              <CardContent>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                  {assignment.title}
                </Typography>
                
                <Chip 
                  label={`${course?.code} - ${course?.title}`} 
                  color="primary" 
                  sx={{ mb: 2 }}
                />

                <Divider sx={{ my: 2 }} />

                {/* Posted By */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Avatar src={course?.instructorPhoto}>
                    {course?.instructor[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Posted by
                    </Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {course?.instructor}
                    </Typography>
                  </Box>
                </Box>

                {/* Posted On */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                    Posted On
                  </Typography>
                  <Typography variant="body1">
                    {assignment.postedOn || 'December 20, 2025'}
                  </Typography>
                </Box>

                {/* Due Date - Large Countdown */}
                <Card 
                  sx={{ 
                    mb: 3, 
                    background: `linear-gradient(135deg, ${
                      countdown.color === 'error' ? '#DC2626' : 
                      countdown.color === 'warning' ? '#F59E0B' : '#10B981'
                    } 0%, ${
                      countdown.color === 'error' ? '#B91C1C' : 
                      countdown.color === 'warning' ? '#D97706' : '#059669'
                    } 100%)`,
                    boxShadow: 3,
                  }}
                >
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <Schedule sx={{ fontSize: 40, color: 'white', mb: 1 }} />
                    <Typography variant="h3" fontWeight="bold" sx={{ color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                      {countdown.text}
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'white', mt: 1, textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                      Due: {new Date(assignment.dueDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Typography>
                  </CardContent>
                </Card>

                {/* Points */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                    Total Points
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="primary">
                    {assignment.totalMarks} points
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Instructions */}
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="h6" fontWeight="bold">
                      Instructions
                    </Typography>
                    <IconButton 
                      size="small"
                      onClick={() => setShowInstructions(!showInstructions)}
                    >
                      <ExpandMore 
                        sx={{ 
                          transform: showInstructions ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.3s',
                        }}
                      />
                    </IconButton>
                  </Box>
                  <Collapse in={showInstructions}>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                      {assignment.description || 'Complete the assignment according to the requirements provided in class. Ensure your submission is well-documented and follows best practices. Include all necessary files and resources.'}
                    </Typography>
                  </Collapse>
                </Box>

                {/* Attachments */}
                {assignment.attachments && assignment.attachments.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      Attachments
                    </Typography>
                    <List dense>
                      {assignment.attachments.map((file, index) => (
                        <ListItem 
                          key={index}
                          sx={{ 
                            backgroundColor: 'action.hover', 
                            borderRadius: 1, 
                            mb: 1,
                          }}
                        >
                          <ListItemIcon>
                            <AttachFile color="primary" />
                          </ListItemIcon>
                          <ListItemText primary={file} />
                          <IconButton size="small">
                            <Download />
                          </IconButton>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Submission Guidelines Card */}
            <Card sx={{ 
              bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7',
              border: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(245, 158, 11, 0.3)' : '#FCD34D'}`,
            }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  color: (theme) => theme.palette.mode === 'dark' ? '#FCD34D' : '#92400E',
                }}>
                  <Warning sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#FCD34D' : '#D97706' }} />
                  Submission Guidelines
                </Typography>
                <Divider sx={{ my: 2, borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(245, 158, 11, 0.3)' : '#FCD34D' }} />
                
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ color: 'text.primary' }}>
                  File Types Allowed
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.primary', mb: 2 }}>
                  PDF, DOCX, ZIP (Maximum 10MB per file)
                </Typography>

                <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ color: 'text.primary' }}>
                  Submission Deadline
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.primary', mb: 2 }}>
                  {new Date(assignment.dueDate).toLocaleString()}
                </Typography>

                <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ color: 'text.primary' }}>
                  Late Submission Policy
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.primary', mb: 2 }}>
                  Late submissions will incur a 10% penalty per day after the deadline.
                </Typography>

                <Alert severity="error" sx={{ mt: 2 }}>
                  <Typography variant="caption" fontWeight="bold">
                    Plagiarism Warning
                  </Typography>
                  <Typography variant="caption" display="block">
                    Ensure your work is original. Plagiarized submissions will result in zero marks.
                  </Typography>
                </Alert>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* RIGHT PANEL - 60% */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ minHeight: 600 }}>
            <CardContent>
              {/* Status Badge */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" fontWeight="bold">
                  Submission Area
                </Typography>
                <StatusBadge status={assignment.status} type="assignment" />
              </Box>

              <Divider sx={{ mb: 3 }} />

              {/* NOT SUBMITTED STATE */}
              {assignment.status === 'Pending' && !showSuccess && (
                <Box>
                  {/* File Dropzone */}
                  <Box
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    sx={{
                      border: '3px dashed',
                      borderColor: dragActive ? 'primary.main' : fileError ? 'error.main' : 'divider',
                      borderRadius: 3,
                      p: 4,
                      textAlign: 'center',
                      backgroundColor: dragActive ? 'action.hover' : 'background.paper',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      '&:hover': {
                        borderColor: 'primary.main',
                        backgroundColor: 'action.hover',
                      },
                    }}
                    onClick={() => document.getElementById('file-input').click()}
                  >
                    <CloudUpload sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Drag files here or click to browse
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Supports: PDF, DOCX, ZIP (Max 10MB)
                    </Typography>
                    <input
                      id="file-input"
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.zip"
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                    />
                  </Box>

                  {/* File Error */}
                  {fileError && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      {fileError}
                    </Alert>
                  )}

                  {/* Selected Files Preview */}
                  {selectedFiles.length > 0 && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        Selected Files ({selectedFiles.length})
                      </Typography>
                      <List>
                        {selectedFiles.map((file, index) => (
                          <ListItem
                            key={index}
                            sx={{
                              backgroundColor: 'action.hover',
                              borderRadius: 2,
                              mb: 1,
                            }}
                          >
                            <ListItemIcon>
                              <InsertDriveFile color="primary" />
                            </ListItemIcon>
                            <ListItemText
                              primary={file.name}
                              secondary={formatFileSize(file.size)}
                            />
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFile(index);
                              }}
                            >
                              <Delete color="error" />
                            </IconButton>
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}

                  {/* Upload Progress */}
                  {isUploading && (
                    <Box sx={{ mt: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Uploading...
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {uploadProgress}%
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={uploadProgress} 
                        sx={{ height: 8, borderRadius: 1 }}
                      />
                    </Box>
                  )}

                  {/* Comments */}
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Add comments for instructor (optional)"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    sx={{ mt: 3 }}
                    disabled={isUploading}
                  />

                  {/* Submit Button */}
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    startIcon={<Send />}
                    onClick={() => setShowConfirmDialog(true)}
                    disabled={selectedFiles.length === 0 || isUploading}
                    sx={{ 
                      mt: 3, 
                      py: 2,
                      fontSize: '1.1rem',
                    }}
                  >
                    Submit Assignment
                  </Button>
                </Box>
              )}

              {/* SUBMITTED STATE */}
              {assignment.status === 'Submitted' && (
                <Box>
                  <Card sx={{ 
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.15)' : '#DBEAFE',
                    border: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.3)' : '#93C5FD'}`,
                    mb: 3,
                  }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <CheckCircle sx={{ 
                          fontSize: 40,
                          color: (theme) => theme.palette.mode === 'dark' ? '#60A5FA' : '#1D4ED8',
                        }} />
                        <Box>
                          <Typography variant="h6" fontWeight="bold" sx={{ color: 'text.primary' }}>
                            Assignment Submitted
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.primary' }}>
                            Your submission is being reviewed by the instructor
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>

                  {/* Submission Details */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Submitted At
                    </Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {assignment.submittedOn ? new Date(assignment.submittedOn).toLocaleString() : 'January 3, 2026, 2:30 PM'}
                    </Typography>
                  </Box>

                  {/* Submitted Files */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Submitted Files
                    </Typography>
                    <List>
                      <ListItem sx={{ backgroundColor: 'action.hover', borderRadius: 2 }}>
                        <ListItemIcon>
                          <InsertDriveFile color="primary" />
                        </ListItemIcon>
                        <ListItemText
                          primary="Assignment_Final.pdf"
                          secondary="2.4 MB"
                        />
                        <IconButton size="small">
                          <Download />
                        </IconButton>
                      </ListItem>
                    </List>
                  </Box>

                  {/* Your Comments */}
                  {comments && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Your Comments
                      </Typography>
                      <Paper sx={{ p: 2, backgroundColor: 'background.default' }}>
                        <Typography variant="body2">
                          {comments}
                        </Typography>
                      </Paper>
                    </Box>
                  )}

                  {/* Status */}
                  <Alert severity="info" sx={{ mb: 3 }}>
                    <Typography variant="body2" fontWeight="bold">
                      Status: Pending Review
                    </Typography>
                    <Typography variant="caption">
                      You will be notified once your assignment is graded.
                    </Typography>
                  </Alert>

                  {/* Actions */}
                  <Stack spacing={2}>
                    {countdown.days > 0 && (
                      <Button
                        variant="outlined"
                        startIcon={<CloudUpload />}
                        onClick={() => {
                          // Reset to pending for resubmission
                          setSelectedFiles([]);
                          setComments('');
                        }}
                      >
                        Resubmit Assignment
                      </Button>
                    )}
                    <Button
                      variant="outlined"
                      startIcon={<Download />}
                    >
                      Download Your Submission
                    </Button>
                  </Stack>
                </Box>
              )}

              {/* GRADED STATE */}
              {assignment.status === 'Graded' && (
                <Box>
                  {/* Grade Card */}
                  <Card 
                    sx={{ 
                      background: 'linear-gradient(135deg, #3B82F6 0%, #10B981 100%)',
                      mb: 3,
                      boxShadow: 4,
                      animation: 'fadeIn 1s ease',
                      '@keyframes fadeIn': {
                        from: { opacity: 0, transform: 'scale(0.95)' },
                        to: { opacity: 1, transform: 'scale(1)' },
                      },
                    }}
                  >
                    <CardContent sx={{ textAlign: 'center', py: 4 }}>
                      <EmojiEvents sx={{ fontSize: 60, color: 'white', mb: 2, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
                      <Typography variant="h2" fontWeight="bold" sx={{ color: 'white', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                        {animatedGrade}/{assignment.totalMarks}
                      </Typography>
                      <Typography variant="h4" sx={{ color: 'white', mt: 1, textShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>
                        {Math.round((animatedGrade / assignment.totalMarks) * 100)}%
                      </Typography>
                      <Chip
                        label={
                          (animatedGrade / assignment.totalMarks) >= 0.9 ? 'A' :
                          (animatedGrade / assignment.totalMarks) >= 0.8 ? 'B' :
                          (animatedGrade / assignment.totalMarks) >= 0.7 ? 'C' :
                          (animatedGrade / assignment.totalMarks) >= 0.6 ? 'D' : 'F'
                        }
                        sx={{
                          mt: 2,
                          fontSize: '1.5rem',
                          fontWeight: 'bold',
                          backgroundColor: 'rgba(255,255,255,0.95)',
                          color: '#1F2937',
                          px: 3,
                          py: 2,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                        }}
                      />
                    </CardContent>
                  </Card>

                  {/* Feedback Section */}
                  <Card sx={{ mb: 3, boxShadow: 2 }}>
                    <CardContent>
                      <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ color: 'text.primary' }}>
                        Instructor Feedback
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Typography variant="body1" sx={{ lineHeight: 1.8, color: 'text.primary' }}>
                        {assignment.feedback || 'Excellent work! Your code is well-structured and documented. The implementation meets all requirements. Minor improvements can be made in error handling. Keep up the good work!'}
                      </Typography>
                    </CardContent>
                  </Card>

                  {/* Rubric Breakdown */}
                  <Card sx={{ mb: 3, boxShadow: 2 }}>
                    <CardContent>
                      <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ color: 'text.primary' }}>
                        Rubric Breakdown
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell><strong>Criteria</strong></TableCell>
                              <TableCell align="center"><strong>Points</strong></TableCell>
                              <TableCell align="center"><strong>Earned</strong></TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {rubric.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>{item.criteria}</TableCell>
                                <TableCell align="center">{item.points}</TableCell>
                                <TableCell align="center">
                                  <Chip
                                    label={`${item.earned}/${item.points}`}
                                    color={item.earned === item.points ? 'success' : 'warning'}
                                    size="small"
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>

                  {/* Actions */}
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Download />}
                  >
                    Download Graded Submission
                  </Button>
                </Box>
              )}

              {/* Previous Submissions Accordion */}
              {assignment.status === 'Graded' && previousSubmissions.length > 0 && (
                <Accordion sx={{ mt: 3 }}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      Previous Submissions ({previousSubmissions.length})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List>
                      {previousSubmissions.map((sub) => (
                        <ListItem
                          key={sub.id}
                          sx={{
                            backgroundColor: 'action.hover',
                            borderRadius: 2,
                            mb: 1,
                          }}
                        >
                          <ListItemText
                            primary={`Attempt ${sub.id}`}
                            secondary={
                              <>
                                <Typography variant="caption" display="block">
                                  Submitted: {sub.submittedAt}
                                </Typography>
                                <Typography variant="caption" display="block">
                                  Files: {sub.files.join(', ')}
                                </Typography>
                              </>
                            }
                          />
                          <Chip label={sub.grade} size="small" color="primary" />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onClose={() => setShowConfirmDialog(false)}>
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold">
            Confirm Submission
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Once submitted, you can only resubmit before the deadline. Make sure you have attached all required files.
            </Typography>
          </Alert>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            You are submitting:
          </Typography>
          <List dense>
            {selectedFiles.map((file, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  <InsertDriveFile fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={file.name} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmDialog(false)}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSubmit}
            startIcon={<Send />}
          >
            Confirm & Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    </motion.div>
  );
};

export default AssignmentSubmit;
