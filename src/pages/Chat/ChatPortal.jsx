import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Chip,
  Switch,
  Divider,
  Paper,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  InputAdornment,
  Badge,
  Drawer,
  useMediaQuery,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Stack,
  Tooltip,
  Menu,
  MenuItem,
  Fade,
  Collapse,
} from '@mui/material';
import {
  Send,
  SmartToy,
  Person,
  Add,
  Search,
  Settings,
  Mic,
  AttachFile,
  MoreVert,
  Circle,
  Delete,
  ThumbUp,
  ThumbDown,
  Download,
  ContentCopy,
  HelpOutline,
  EmojiEmotions,
  Stop,
  Menu as MenuIcon,
  Close,
  Lightbulb,
  School,
  Event,
  AccountBalance,
  TrendingUp,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { currentUser } from '../../data/dummyData';
import { ChatSkeleton } from '../../components/Common/LoadingSkeleton';
import { pageTransition, staggerContainer, fadeInUp } from '../../utils/animations';


const ChatPortal = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [loading, setLoading] = useState(true);

  // State management
  const [conversations, setConversations] = useState([
    { id: 1, title: 'What is my CGPA?', lastMessage: 'Your current CGPA is 3.85', timestamp: '2 hours ago', active: true },
    { id: 2, title: 'Show my timetable', lastMessage: 'Here is your class schedule for this week', timestamp: 'Yesterday', active: false },
    { id: 3, title: 'Check dues', lastMessage: 'You have PKR 15,000 in pending dues', timestamp: '2 days ago', active: false },
  ]);
  const [activeConversation, setActiveConversation] = useState(1);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isAiMode, setIsAiMode] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [citationModal, setCitationModal] = useState({ open: false, content: '' });
  const [anchorEl, setAnchorEl] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [hoveredMessage, setHoveredMessage] = useState(null);
  
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Loading effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Quick action queries
  const quickActions = [
    { label: 'What is my CGPA?', icon: <TrendingUp /> },
    { label: 'View Attendance', icon: <Event /> },
    { label: 'Fee Status', icon: <AccountBalance /> },
    { label: 'Course Schedule', icon: <School /> },
  ];

  // Suggested follow-ups
  const [suggestedQuestions, setSuggestedQuestions] = useState([
    "What is my attendance percentage?",
    "Show my upcoming assignments",
    "When is the next exam?"
  ]);

  // Common questions
  const commonQuestions = [
    "How do I submit an assignment?",
    "What are my library timings?",
    "How do I pay my fees?",
    "How do I mark attendance?",
    "Where can I see my transcript?"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText]);

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: Date.now(),
        text: `Hello ${currentUser?.name || 'Student'}! 👋 I'm Nexus AI, your intelligent campus assistant. I'm here to help you with anything related to your academics, fees, attendance, courses, and more. How can I assist you today?`,
        isAi: true,
        timestamp: new Date().toLocaleTimeString(),
        isWelcome: true,
      }]);
    }
  }, []);

  const getAiResponse = (userMessage) => {
    const lowerMessage = userMessage.toLowerCase();
    
    // Context-aware responses with special content
    if (lowerMessage.includes('cgpa') || lowerMessage.includes('gpa') || lowerMessage.includes('grade')) {
      return {
        text: 'Based on your academic record, here are your current grades:',
        type: 'table',
        tableData: [
          { course: 'Data Structures', grade: 'A', gpa: '4.0', credits: '3' },
          { course: 'Database Systems', grade: 'A-', gpa: '3.7', credits: '3' },
          { course: 'Web Development', grade: 'B+', gpa: '3.3', credits: '3' },
          { course: 'Operating Systems', grade: 'A', gpa: '4.0', credits: '4' },
        ],
        summary: 'Your current CGPA is **3.85** which is excellent! Keep up the great work.',
        citations: ['Source: Academic Transcript', 'Updated: Jan 2026'],
        followUps: ['How can I improve my grades?', 'Show my semester-wise performance', 'What is the highest CGPA in my class?']
      };
    } else if (lowerMessage.includes('fee') || lowerMessage.includes('payment') || lowerMessage.includes('dues')) {
      return {
        text: 'I found the following information about your fee status:',
        type: 'action',
        summary: `• Total Fees: PKR 85,000\n• Paid: PKR 70,000\n• Outstanding: PKR 15,000\n• Due Date: January 15, 2026`,
        actionButton: { label: 'Pay Now', action: 'navigate-fees' },
        citations: ['Source: Finance Portal', 'Last Updated: Jan 4, 2026'],
        followUps: ['What happens if I pay late?', 'Can I get a payment plan?', 'Show payment history']
      };
    } else if (lowerMessage.includes('attendance')) {
      return {
        text: 'Here is your current attendance summary:',
        type: 'data',
        summary: `• Overall Attendance: **87%**\n• Data Structures: 92%\n• Database Systems: 85%\n• Web Development: 88%\n• Operating Systems: 83%\n\n⚠️ Note: Operating Systems attendance is below the required 85% threshold.`,
        citations: ['Source: Attendance System', 'Real-time Data'],
        followUps: ['How many more classes can I miss?', 'Mark my attendance now', 'Request attendance condonation']
      };
    } else if (lowerMessage.includes('assignment') || lowerMessage.includes('homework')) {
      return {
        text: 'You have 3 upcoming assignments:',
        type: 'list',
        items: [
          '📝 **Database Design Project** - Due: Jan 10, 2026 (6 days left)',
          '💻 **Web Dev Portfolio** - Due: Jan 15, 2026 (11 days left)',
          '🧮 **Algorithm Analysis** - Due: Jan 20, 2026 (16 days left)'
        ],
        summary: 'To submit an assignment, go to LMS > My Courses, select your course, and click on the assignment.',
        citations: ['Source: LMS Portal'],
        followUps: ['Show assignment details', 'How do I submit?', 'Can I get an extension?']
      };
    } else if (lowerMessage.includes('timetable') || lowerMessage.includes('schedule') || lowerMessage.includes('class')) {
      return {
        text: 'Here is your class schedule for today (Monday):',
        type: 'schedule',
        summary: `🕐 **09:00 - 10:30** - Data Structures (Room 301)\n🕐 **11:00 - 12:30** - Database Systems (Lab 2)\n🕐 **02:00 - 03:30** - Web Development (Room 205)\n🕐 **04:00 - 05:30** - Operating Systems (Room 401)`,
        citations: ['Source: Academic Schedule'],
        followUps: ['Show full week schedule', 'Any class cancellations?', 'Download timetable PDF']
      };
    } else if (lowerMessage.includes('library')) {
      return {
        text: 'University Library Information:',
        type: 'info',
        summary: `📚 **Operating Hours:**\n• Monday - Friday: 8:00 AM - 8:00 PM\n• Saturday: 9:00 AM - 5:00 PM\n• Sunday: Closed\n\n📖 **Services Available:**\n• Book borrowing & returns\n• Study rooms (bookable)\n• Digital resources access\n• Printing & scanning`,
        citations: ['Source: Library Portal', 'Student Handbook 2026'],
        followUps: ['Search for a book', 'Book a study room', 'Check my borrowed books']
      };
    } else if (lowerMessage.includes('help') || lowerMessage.includes('how') || lowerMessage.includes('?')) {
      return {
        text: 'I can help you with various queries related to:',
        type: 'list',
        items: [
          '🎓 Academics (grades, CGPA, transcripts)',
          '📚 Courses (schedule, assignments, exams)',
          '💰 Finance (fees, payments, vouchers)',
          '✅ Attendance (status, marking, history)',
          '📖 Library (timings, book search, reservations)',
          '🎯 And much more!'
        ],
        summary: 'Just ask me anything in natural language, and I\'ll do my best to help!',
        citations: ['Source: Nexus AI Knowledge Base'],
        followUps: ['Show common questions', 'Connect with human support', 'Take a tour']
      };
    } else {
      return {
        text: 'I\'m not quite sure I understood that correctly. Could you please rephrase your question or try one of these common queries?',
        type: 'error',
        items: commonQuestions.slice(0, 3),
        actionButton: { label: 'Connect with Human Support', action: 'switch-human' },
        citations: ['Source: Nexus AI'],
        followUps: ['View all common questions', 'Start a new chat', 'Report an issue']
      };
    }
  };

  const streamResponse = (responseText, callback) => {
    setIsTyping(false);
    setStreamingText('');
    const words = responseText.split(' ');
    let currentIndex = 0;

    const interval = setInterval(() => {
      if (currentIndex < words.length) {
        setStreamingText(prev => prev + (currentIndex > 0 ? ' ' : '') + words[currentIndex]);
        currentIndex++;
      } else {
        clearInterval(interval);
        callback();
      }
    }, 50);
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    // Add user message with slide-up animation
    const userMsg = {
      id: Date.now(),
      text: inputMessage,
      isAi: false,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setCharCount(0);
    setSuggestedQuestions([]);

    // Show typing indicator
    if (isAiMode) {
      setTimeout(() => {
        setIsTyping(true);

        // Simulate API delay
        setTimeout(() => {
          const response = getAiResponse(inputMessage);
          
          // Stream the response
          streamResponse(response.text, () => {
            const aiMsg = {
              id: Date.now() + 1,
              text: response.text,
              isAi: true,
              timestamp: new Date().toLocaleTimeString(),
              type: response.type,
              tableData: response.tableData,
              items: response.items,
              summary: response.summary,
              actionButton: response.actionButton,
              citations: response.citations,
              feedbacks: { thumbsUp: 0, thumbsDown: 0 },
            };
            setMessages(prev => [...prev, aiMsg]);
            setStreamingText('');
            
            // Set follow-up suggestions
            if (response.followUps) {
              setSuggestedQuestions(response.followUps);
            }
          });
        }, 1500);
      }, 100);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleVoiceInput = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      // Simulate voice recording
      setTimeout(() => {
        setInputMessage('What is my current CGPA?');
        setIsRecording(false);
      }, 3000);
    }
  };

  const handleNewChat = () => {
    const newConvId = Date.now();
    setConversations(prev => [
      { id: newConvId, title: 'New Conversation', lastMessage: '', timestamp: 'Just now', active: true },
      ...prev.map(c => ({ ...c, active: false }))
    ]);
    setActiveConversation(newConvId);
    setMessages([{
      id: Date.now(),
      text: `Hello ${currentUser?.name || 'Student'}! 👋 I'm Nexus AI, your intelligent campus assistant. I'm here to help you with anything related to your academics, fees, attendance, courses, and more. How can I assist you today?`,
      isAi: true,
      timestamp: new Date().toLocaleTimeString(),
      isWelcome: true,
    }]);
    setSuggestedQuestions([]);
    if (isMobile) setDrawerOpen(false);
  };

  const handleDeleteConversation = (convId) => {
    setConversations(prev => prev.filter(c => c.id !== convId));
    if (activeConversation === convId && conversations.length > 1) {
      const nextConv = conversations.find(c => c.id !== convId);
      setActiveConversation(nextConv.id);
    }
  };

  const handleQuickAction = (query) => {
    setInputMessage(query);
    setTimeout(() => handleSendMessage(), 100);
  };

  const handleFeedback = (messageId, type) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        return {
          ...msg,
          feedbacks: {
            thumbsUp: type === 'up' ? 1 : 0,
            thumbsDown: type === 'down' ? 1 : 0,
          }
        };
      }
      return msg;
    }));
  };

  const handleCitationClick = (citation) => {
    setCitationModal({
      open: true,
      content: citation,
      details: `This information was retrieved from: ${citation}\n\nRelevant excerpt:\n"The student's current CGPA is calculated based on all completed courses with their respective credit hours and grade points. The calculation follows the standard formula: Sum(Grade Points × Credit Hours) / Total Credit Hours."`
    });
  };

  const handleExportChat = () => {
    const chatText = messages.map(m => 
      `[${m.timestamp}] ${m.isAi ? 'Nexus AI' : currentUser?.name}: ${m.text}`
    ).join('\n\n');
    
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus-chat-${Date.now()}.txt`;
    a.click();
  };

  const handleCopyChat = () => {
    const chatText = messages.map(m => 
      `[${m.timestamp}] ${m.isAi ? 'Nexus AI' : currentUser?.name}: ${m.text}`
    ).join('\n\n');
    navigator.clipboard.writeText(chatText);
  };

  const filteredConversations = conversations.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Emojis for picker (simplified)
  const emojis = ['😊', '😂', '❤️', '👍', '🎉', '🔥', '✨', '💯', '🚀', '📚', '✅', '⚡'];

  // Show loading skeleton
  if (loading) {
    return (
      <Box sx={{ pb: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Chat Portal
          </Typography>
          <Typography variant="body1" color="text.secondary">
            AI-powered assistant for all your queries
          </Typography>
        </Box>
        <ChatSkeleton />
      </Box>
    );
  }

  // Left Panel Component
  const LeftPanel = () => (
    <Box
      sx={{
        width: isMobile ? '280px' : '100%',
        height: '100%',
        backgroundColor: 'background.paper',
        borderRight: isMobile ? 'none' : 1,
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Chat Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight="bold">
            Nexus AI Assistant
          </Typography>
          <IconButton size="small">
            <Settings fontSize="small" />
          </IconButton>
        </Box>
        
        {/* Toggle AI/Human */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'action.hover',
            borderRadius: '8px',
            p: 0.5,
          }}
        >
          <Box
            onClick={() => setIsAiMode(true)}
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.5,
              py: 0.75,
              borderRadius: '6px',
              backgroundColor: isAiMode ? 'primary.main' : 'transparent',
              color: isAiMode ? 'white' : 'text.secondary',
              cursor: 'pointer',
              transition: 'all 0.3s',
            }}
          >
            <SmartToy fontSize="small" />
            <Typography variant="body2" fontWeight="600">
              AI Mode
            </Typography>
          </Box>
          <Box
            onClick={() => setIsAiMode(false)}
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.5,
              py: 0.75,
              borderRadius: '6px',
              backgroundColor: !isAiMode ? 'secondary.main' : 'transparent',
              color: !isAiMode ? 'white' : 'text.secondary',
              cursor: 'pointer',
              transition: 'all 0.3s',
            }}
          >
            <Person fontSize="small" />
            <Typography variant="body2" fontWeight="600">
              Human
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* New Chat Button */}
      <Box sx={{ p: 2 }}>
        <Button
          fullWidth
          variant="contained"
          startIcon={<Add />}
          onClick={handleNewChat}
          sx={{
            py: 1.5,
            borderRadius: '8px',
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          New Chat
        </Button>
      </Box>

      {/* Search Conversations */}
      <Box sx={{ px: 2, pb: 2 }}>
        <TextField
          fullWidth
          placeholder="Search conversations..."
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Conversation List */}
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        <List sx={{ py: 0 }}>
          {filteredConversations.map((conv) => (
            <ListItem
              key={conv.id}
              disablePadding
              secondaryAction={
                <IconButton
                  edge="end"
                  size="small"
                  onClick={() => handleDeleteConversation(conv.id)}
                  sx={{ opacity: 0, '.MuiListItem-root:hover &': { opacity: 1 } }}
                >
                  <Delete fontSize="small" />
                </IconButton>
              }
            >
              <ListItemButton
                selected={activeConversation === conv.id}
                onClick={() => {
                  setActiveConversation(conv.id);
                  if (isMobile) setDrawerOpen(false);
                }}
                sx={{
                  borderRadius: '8px',
                  mx: 1,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.light',
                    '&:hover': {
                      backgroundColor: 'primary.light',
                    },
                  },
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                    <SmartToy fontSize="small" />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="body2" fontWeight="600" noWrap>
                      {conv.title}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {conv.lastMessage}
                    </Typography>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Quick Actions */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<Lightbulb />}
          sx={{ mb: 1, textTransform: 'none', justifyContent: 'flex-start' }}
          onClick={() => setAnchorEl(document.body)}
        >
          Common Questions
        </Button>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<HelpOutline />}
          sx={{ textTransform: 'none', justifyContent: 'flex-start' }}
        >
          Help & Tutorial
        </Button>
      </Box>
    </Box>
  );

  return (
    <motion.div {...pageTransition} style={{ height: '100%' }}>
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', overflow: 'hidden' }}>
      {/* Left Panel - Desktop */}
      {!isMobile && (
        <Box sx={{ width: '350px', maxWidth: '30%', height: '100%' }}>
          <LeftPanel />
        </Box>
      )}

      {/* Left Panel - Mobile Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <LeftPanel />
      </Drawer>

      {/* Main Chat Area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Chat Header Bar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
            backgroundColor: 'background.paper',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {isMobile && (
              <IconButton onClick={() => setDrawerOpen(true)}>
                <MenuIcon />
              </IconButton>
            )}
            <Badge
              overlap="circular"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              variant="dot"
              sx={{
                '& .MuiBadge-badge': {
                  backgroundColor: '#44b700',
                  color: '#44b700',
                  boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
                  '&::after': {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    animation: 'ripple 1.2s infinite ease-in-out',
                    border: '1px solid currentColor',
                    content: '""',
                  },
                },
                '@keyframes ripple': {
                  '0%': {
                    transform: 'scale(.8)',
                    opacity: 1,
                  },
                  '100%': {
                    transform: 'scale(2.4)',
                    opacity: 0,
                  },
                },
              }}
            >
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                <SmartToy />
              </Avatar>
            </Badge>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                {isAiMode ? 'Nexus AI' : 'Support Team'}
              </Typography>
              <Chip
                label={isAiMode ? 'AI Powered' : 'Live Chat'}
                size="small"
                color={isAiMode ? 'primary' : 'success'}
                sx={{ height: 20 }}
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Voice Input">
              <IconButton onClick={handleVoiceInput} color={isRecording ? 'error' : 'default'}>
                {isRecording ? <Stop /> : <Mic />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Attach File">
              <IconButton>
                <AttachFile />
              </IconButton>
            </Tooltip>
            <Tooltip title="More Options">
              <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                <MoreVert />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Messages Container */}
        <Box
          ref={chatContainerRef}
          sx={{
            flex: 1,
            overflowY: 'auto',
            p: 3,
            backgroundColor: 'background.default',
          }}
          component={motion.div}
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {messages.map((message, index) => (
            <Fade in key={message.id} timeout={300}>
              <Box
                component={motion.div}
                variants={fadeInUp}
                onMouseEnter={() => setHoveredMessage(message.id)}
                onMouseLeave={() => setHoveredMessage(null)}
                sx={{
                  display: 'flex',
                  justifyContent: message.isAi ? 'flex-start' : 'flex-end',
                  mb: 3,
                  animation: 'slideUp 0.3s ease',
                  '@keyframes slideUp': {
                    from: { transform: 'translateY(20px)', opacity: 0 },
                    to: { transform: 'translateY(0)', opacity: 1 },
                  },
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1.5,
                    maxWidth: message.isWelcome ? '100%' : '75%',
                    flexDirection: message.isAi ? 'row' : 'row-reverse',
                    width: message.isWelcome ? '100%' : 'auto',
                  }}
                >
                  <Avatar
                    sx={{
                      width: 40,
                      height: 40,
                      bgcolor: message.isAi ? 'primary.main' : 'secondary.main',
                    }}
                  >
                    {message.isAi ? <SmartToy /> : currentUser?.name[0]}
                  </Avatar>

                  <Box sx={{ flex: 1 }}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        backgroundColor: message.isAi ? 'grey.100' : 'primary.main',
                        color: message.isAi ? 'text.primary' : 'white',
                        borderRadius: message.isAi ? '12px 12px 12px 4px' : '12px 12px 4px 12px',
                      }}
                    >
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                        {message.text}
                      </Typography>

                      {/* Welcome Quick Actions */}
                      {message.isWelcome && (
                        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {quickActions.map((action, idx) => (
                            <Chip
                              key={idx}
                              icon={action.icon}
                              label={action.label}
                              onClick={() => handleQuickAction(action.label)}
                              sx={{
                                cursor: 'pointer',
                                '&:hover': { backgroundColor: 'primary.light' },
                              }}
                            />
                          ))}
                        </Box>
                      )}

                      {/* Table Data */}
                      {message.type === 'table' && message.tableData && (
                        <Box sx={{ mt: 2, overflowX: 'auto' }}>
                          <Table size="small">
                            <TableBody>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 'bold', color: message.isAi ? 'inherit' : 'white' }}>Course</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', color: message.isAi ? 'inherit' : 'white' }}>Grade</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', color: message.isAi ? 'inherit' : 'white' }}>GPA</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', color: message.isAi ? 'inherit' : 'white' }}>Credits</TableCell>
                              </TableRow>
                              {message.tableData.map((row, idx) => (
                                <TableRow key={idx}>
                                  <TableCell sx={{ color: message.isAi ? 'inherit' : 'white' }}>{row.course}</TableCell>
                                  <TableCell sx={{ color: message.isAi ? 'inherit' : 'white' }}>{row.grade}</TableCell>
                                  <TableCell sx={{ color: message.isAi ? 'inherit' : 'white' }}>{row.gpa}</TableCell>
                                  <TableCell sx={{ color: message.isAi ? 'inherit' : 'white' }}>{row.credits}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </Box>
                      )}

                      {/* List Items */}
                      {message.items && (
                        <Box sx={{ mt: 2 }}>
                          {message.items.map((item, idx) => (
                            <Typography key={idx} variant="body2" sx={{ mb: 0.5, color: message.isAi ? 'inherit' : 'white' }}>
                              {item}
                            </Typography>
                          ))}
                        </Box>
                      )}

                      {/* Summary Text */}
                      {message.summary && (
                        <Typography variant="body2" sx={{ mt: 2, whiteSpace: 'pre-wrap', color: message.isAi ? 'inherit' : 'white' }}>
                          {message.summary}
                        </Typography>
                      )}

                      {/* Action Button */}
                      {message.actionButton && (
                        <Button
                          variant={message.isAi ? 'contained' : 'outlined'}
                          size="small"
                          sx={{ mt: 2, color: message.isAi ? 'white' : 'inherit' }}
                        >
                          {message.actionButton.label}
                        </Button>
                      )}
                    </Paper>

                    {/* Citations */}
                    {message.isAi && message.citations && (
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
                        {message.citations.map((citation, idx) => (
                          <Chip
                            key={idx}
                            label={citation}
                            size="small"
                            variant="outlined"
                            onClick={() => handleCitationClick(citation)}
                            sx={{
                              fontSize: '0.7rem',
                              height: 24,
                              cursor: 'pointer',
                              '&:hover': { backgroundColor: 'action.hover' },
                            }}
                          />
                        ))}
                      </Box>
                    )}

                    {/* Feedback & Timestamp */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        {message.timestamp}
                      </Typography>
                      
                      {message.isAi && hoveredMessage === message.id && (
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleFeedback(message.id, 'up')}
                            color={message.feedbacks?.thumbsUp ? 'primary' : 'default'}
                          >
                            <ThumbUp sx={{ fontSize: 14 }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleFeedback(message.id, 'down')}
                            color={message.feedbacks?.thumbsDown ? 'error' : 'default'}
                          >
                            <ThumbDown sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Box>
                      )}
                    </Box>

                    {/* Follow-up Questions */}
                    {message.isAi && index === messages.length - 1 && suggestedQuestions.length > 0 && (
                      <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {suggestedQuestions.map((question, idx) => (
                          <Chip
                            key={idx}
                            label={question}
                            size="small"
                            onClick={() => handleQuickAction(question)}
                            sx={{
                              cursor: 'pointer',
                              '&:hover': { backgroundColor: 'primary.light' },
                            }}
                          />
                        ))}
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            </Fade>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
              <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
                <SmartToy />
              </Avatar>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  backgroundColor: 'grey.100',
                  borderRadius: '12px 12px 12px 4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: 'primary.main',
                    animation: 'bounce 1.4s infinite ease-in-out',
                    animationDelay: '0s',
                    '@keyframes bounce': {
                      '0%, 80%, 100%': { transform: 'scale(0)' },
                      '40%': { transform: 'scale(1)' },
                    },
                  }}
                />
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: 'primary.main',
                    animation: 'bounce 1.4s infinite ease-in-out',
                    animationDelay: '0.2s',
                  }}
                />
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: 'primary.main',
                    animation: 'bounce 1.4s infinite ease-in-out',
                    animationDelay: '0.4s',
                  }}
                />
                <Typography variant="caption" sx={{ ml: 1 }}>
                  Nexus is typing...
                </Typography>
              </Paper>
            </Box>
          )}

          {/* Streaming Text */}
          {streamingText && (
            <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
              <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
                <SmartToy />
              </Avatar>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  backgroundColor: 'grey.100',
                  borderRadius: '12px 12px 12px 4px',
                  maxWidth: '75%',
                }}
              >
                <Typography variant="body1">
                  {streamingText}
                  <Box
                    component="span"
                    sx={{
                      display: 'inline-block',
                      width: 2,
                      height: 16,
                      backgroundColor: 'primary.main',
                      ml: 0.5,
                      animation: 'blink 1s infinite',
                      '@keyframes blink': {
                        '0%, 100%': { opacity: 1 },
                        '50%': { opacity: 0 },
                      },
                    }}
                  />
                </Typography>
              </Paper>
            </Box>
          )}

          <div ref={messagesEndRef} />
        </Box>

        {/* Input Area */}
        <Box
          sx={{
            p: 2,
            borderTop: 1,
            borderColor: 'divider',
            backgroundColor: 'background.paper',
          }}
        >
          {/* Suggestions Row */}
          {inputMessage === '' && suggestedQuestions.length === 0 && messages.length > 0 && (
            <Box sx={{ mb: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {['What is my CGPA?', 'Show my timetable', 'Check dues'].map((suggestion, idx) => (
                <Chip
                  key={idx}
                  label={suggestion}
                  size="small"
                  onClick={() => handleQuickAction(suggestion)}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: 'primary.light' },
                  }}
                />
              ))}
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            {/* Emoji Picker */}
            <Box sx={{ position: 'relative' }}>
              <IconButton onClick={() => setShowEmojiPicker(!showEmojiPicker)} size="small">
                <EmojiEmotions />
              </IconButton>
              <Collapse in={showEmojiPicker}>
                <Paper
                  sx={{
                    position: 'absolute',
                    bottom: '100%',
                    left: 0,
                    mb: 1,
                    p: 1,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(6, 1fr)',
                    gap: 0.5,
                    minWidth: 200,
                    zIndex: 1000,
                  }}
                  elevation={4}
                >
                  {emojis.map((emoji, idx) => (
                    <Box
                      key={idx}
                      onClick={() => {
                        setInputMessage(prev => prev + emoji);
                        setShowEmojiPicker(false);
                      }}
                      sx={{
                        cursor: 'pointer',
                        fontSize: 24,
                        textAlign: 'center',
                        '&:hover': { backgroundColor: 'action.hover', borderRadius: 1 },
                      }}
                    >
                      {emoji}
                    </Box>
                  ))}
                </Paper>
              </Collapse>
            </Box>

            {/* Text Input */}
            <TextField
              fullWidth
              placeholder="Ask me anything about your academics..."
              value={inputMessage}
              onChange={(e) => {
                setInputMessage(e.target.value);
                setCharCount(e.target.value.length);
              }}
              onKeyPress={handleKeyPress}
              multiline
              maxRows={5}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                },
              }}
            />

            {/* Voice Recording Animation */}
            {isRecording && (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 80,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 2,
                  backgroundColor: 'error.main',
                  color: 'white',
                  borderRadius: '12px',
                  boxShadow: 3,
                }}
              >
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: 'white',
                    animation: 'pulse 1s infinite',
                    '@keyframes pulse': {
                      '0%, 100%': { transform: 'scale(1)', opacity: 1 },
                      '50%': { transform: 'scale(1.5)', opacity: 0.5 },
                    },
                  }}
                />
                <Typography variant="body2" fontWeight="600">
                  Recording... Click to stop
                </Typography>
              </Box>
            )}

            {/* Send Button */}
            <IconButton
              color="primary"
              onClick={handleSendMessage}
              disabled={!inputMessage.trim()}
              sx={{
                width: 48,
                height: 48,
                backgroundColor: 'primary.main',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                },
                '&.Mui-disabled': {
                  backgroundColor: 'action.disabledBackground',
                  color: 'action.disabled',
                },
              }}
            >
              <Send />
            </IconButton>
          </Box>

          {/* Character Count */}
          {charCount > 500 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', textAlign: 'right' }}>
              {charCount} characters
            </Typography>
          )}
        </Box>
      </Box>

      {/* Citation Modal */}
      <Dialog
        open={citationModal.open}
        onClose={() => setCitationModal({ open: false, content: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold">
            Source Information
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
            {citationModal.details}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCitationModal({ open: false, content: '' })}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* More Options Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => { handleExportChat(); setAnchorEl(null); }}>
          <Download sx={{ mr: 1 }} fontSize="small" />
          Download Chat (PDF)
        </MenuItem>
        <MenuItem onClick={() => { handleCopyChat(); setAnchorEl(null); }}>
          <ContentCopy sx={{ mr: 1 }} fontSize="small" />
          Copy to Clipboard
        </MenuItem>
        <Divider />
        {commonQuestions.map((q, idx) => (
          <MenuItem key={idx} onClick={() => { handleQuickAction(q); setAnchorEl(null); }}>
            <Typography variant="body2">{q}</Typography>
          </MenuItem>
        ))}
      </Menu>
    </Box>
    </motion.div>
  );
};

export default ChatPortal;
