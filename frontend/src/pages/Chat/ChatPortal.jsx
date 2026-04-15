import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Badge,
  Paper,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Tabs,
  Tab,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Send,
  SmartToy,
  Person,
  Add,
  Search,
  Mic,
  AttachFile,
  MoreVert,
  EmojiEmotions,
  ArrowBack,
  Group as GroupIcon,
  Close,
  Check,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { chatAPI } from '../../api/chat';
import { aiAPI } from '../../api/ai';

const ChatPortal = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const messagesEndRef = useRef(null);

  // WhatsApp Color Scheme
  const whatsappGreen = '#128C7E';
  const whatsappDarkGreen = '#075E54';
  const whatsappLightGreen = '#25D366';
  const userBubbleColor = '#DCF8C6';
  const otherBubbleColor = theme.palette.mode === 'dark' ? '#2A2A2A' : '#FFFFFF';
  const chatBgColor = theme.palette.mode === 'dark' ? '#0D1418' : '#E5DDD5';

  // State Management
  const [mode, setMode] = useState('ai'); // 'ai' or 'human'
  const [currentTab, setCurrentTab] = useState(0); // 0: contacts, 1: groups
  const [selectedChat, setSelectedChat] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [aiChatHistory, setAiChatHistory] = useState([]);

  // Data loaded from API
  const [contacts, setContacts] = useState([]);

  const [groups, setGroups] = useState([]);

  // Fetch contacts and groups from API
  useEffect(() => {
    const fetchChatData = async () => {
      try {
        const [contactsRes, groupsRes] = await Promise.allSettled([
          chatAPI.getSessions(),
          chatAPI.getGroups(),
        ]);
        if (contactsRes.status === 'fulfilled') setContacts(contactsRes.value.data?.contacts || contactsRes.value.data?.sessions || contactsRes.value.data || []);
        if (groupsRes.status === 'fulfilled') setGroups(groupsRes.value.data?.groups || groupsRes.value.data || []);
      } catch (e) { console.error(e); }
    };
    if (mode === 'human') fetchChatData();
  }, [mode]);

  // Initialize AI chat
  useEffect(() => {
    if (mode === 'ai') {
      const loadHistory = async () => {
        try {
          const res = await aiAPI.getHistory();
          const history = Array.isArray(res.data)
            ? res.data
            : (res.data?.messages || res.data?.history || []);
          if (history.length > 0) {
            const mapped = history.map((item, index) => ({
              id: item.id || index + 1,
              text: item.message || item.content || '',
              sender: item.role === 'assistant' ? 'ai' : 'user',
              timestamp: item.timestamp
                ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }));
            setMessages(mapped);
            return;
          }
        } catch (error) {
          console.error('Failed to load AI chat history', error);
        }

        if (aiChatHistory.length > 0) {
          setMessages(aiChatHistory);
        } else {
          setMessages([]);
        }
      };

      loadHistory();
      setSelectedChat({ name: 'Nexus AI Assistant', avatar: '🤖', status: 'online' });
    }
  }, [mode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handlers
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const newMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputMessage('');

    // AI response from backend
    if (mode === 'ai') {
      setIsTyping(true);
      try {
        const res = await aiAPI.chat(inputMessage, selectedChat?.id);
        const aiText = res.data?.response || res.data?.message || res.data?.answer || 'I can help you with academics, fees, attendance, courses, and more.';
        const aiResponse = {
          id: Date.now() + 1,
          text: aiText,
          sender: 'ai',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, aiResponse]);
      } catch (e) {
        console.error(e);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            text: 'AI service is temporarily unavailable. Please try again in a moment.',
            sender: 'ai',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } finally {
        setIsTyping(false);
      }
    } else {
      // Human chat — send via chatAPI
      try {
        if (selectedChat?.id) {
          await chatAPI.sendMessage(selectedChat.id, { text: inputMessage });
        }
      } catch (e) { console.error(e); }
    }
  };

  const handleContactClick = async (contact) => {
    setSelectedChat(contact);
    try {
      const res = await chatAPI.getMessages(contact.id, { limit: 100 });
      const rows = Array.isArray(res.data) ? res.data : (res.data?.messages || []);
      const mapped = rows.map((item, index) => ({
        id: item.message_id || item.id || index + 1,
        text: item.content || item.text || '',
        sender: item.sender_id === user?.user_id ? 'user' : 'other',
        senderName: item.sender_name,
        timestamp: item.timestamp
          ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));
      setMessages(mapped);
    } catch (error) {
      console.error('Failed to load chat messages', error);
      setMessages([]);
    }
  };

  const handleGroupClick = async (group) => {
    setSelectedChat(group);
    try {
      const res = await chatAPI.getMessages(group.id, { limit: 100 });
      const rows = Array.isArray(res.data) ? res.data : (res.data?.messages || []);
      const mapped = rows.map((item, index) => ({
        id: item.message_id || item.id || index + 1,
        text: item.content || item.text || '',
        sender: item.sender_id === user?.user_id ? 'user' : 'other',
        senderName: item.sender_name,
        timestamp: item.timestamp
          ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));
      setMessages(mapped);
    } catch (error) {
      console.error('Failed to load group messages', error);
      setMessages([]);
    }
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim() || selectedMembers.length < 2) return;

    const nextGroupId = groups.length
      ? Math.max(...groups.map((g) => Number(g.id) || 0)) + 1
      : 1;

    const newGroup = {
      id: nextGroupId,
      name: newGroupName,
      description: newGroupDescription,
      avatar: '',
      members: selectedMembers.length + 1, // +1 for creator
      lastMessage: 'Group created',
      lastTime: 'Just now',
    };

    setGroups((prev) => [...prev, newGroup]);
    setCreateGroupOpen(false);
    setNewGroupName('');
    setNewGroupDescription('');
    setSelectedMembers([]);
    setCurrentTab(1); // Switch to groups tab
  };

  const toggleMemberSelection = (contactId) => {
    setSelectedMembers((prev) =>
      prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId]
    );
  };

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Chat List Component
  const ChatList = () => (
    <Box
      sx={{
        width: { xs: '100%', md: 360, lg: 400 },
        height: '100%',
        borderRight: { xs: 'none', md: `1px solid ${theme.palette.divider}` },
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.palette.mode === 'dark' ? '#111B21' : '#FFFFFF',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${whatsappGreen} 0%, ${whatsappDarkGreen} 100%)`,
          color: 'white',
          p: { xs: 1.5, md: 2 },
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={{ xs: 1, md: 2 }}>
          <Stack direction="row" spacing={{ xs: 1, md: 2 }} alignItems="center">
            <IconButton onClick={() => navigate('/dashboard')} sx={{ color: 'white', p: { xs: 0.5, md: 1 } }}>
              <ArrowBack fontSize={isMobile ? 'small' : 'medium'} />
            </IconButton>
            <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight="bold">
              Nexus Chat
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Tooltip title={mode === 'ai' ? 'Switch to Human Chat' : 'Switch to AI Assistant'}>
              <IconButton
                onClick={() => {
                  // Save AI chat history before switching
                  if (mode === 'ai' && messages.length > 0) {
                    setAiChatHistory(messages);
                  }
                  // Restore AI chat history when switching back
                  if (mode === 'human' && aiChatHistory.length > 0) {
                    setMessages(aiChatHistory);
                  } else {
                    setMessages([]);
                  }
                  setMode(mode === 'ai' ? 'human' : 'ai');
                  setSelectedChat(null);
                }}
                sx={{
                  color: 'white',
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.25)' },
                  p: { xs: 0.75, md: 1 },
                }}
                size={isMobile ? 'small' : 'medium'}
              >
                {mode === 'ai' ? <Person fontSize={isMobile ? 'small' : 'medium'} /> : <SmartToy fontSize={isMobile ? 'small' : 'medium'} />}
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        {/* Mode Indicator */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            backgroundColor: 'rgba(255,255,255,0.15)',
            borderRadius: '20px',
            px: { xs: 1.5, md: 2 },
            py: { xs: 0.4, md: 0.5 },
          }}
        >
          {mode === 'ai' ? <SmartToy fontSize="small" /> : <Person fontSize="small" />}
          <Typography variant={isMobile ? 'caption' : 'body2'} fontWeight="600">
            {mode === 'ai' ? 'AI Assistant Mode' : 'Human Chat Mode'}
          </Typography>
        </Box>
      </Box>

      {/* Search */}
      {mode === 'human' && (
        <Box sx={{ p: { xs: 1.5, md: 2 }, backgroundColor: theme.palette.mode === 'dark' ? '#111B21' : '#F0F2F5' }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <Search sx={{ color: 'text.secondary', mr: 1, fontSize: { xs: '1rem', md: '1.25rem' } }} />,
              sx: {
                backgroundColor: theme.palette.mode === 'dark' ? '#2A3942' : '#FFFFFF',
                borderRadius: '10px',
                fontSize: { xs: '0.875rem', md: '1rem' },
              },
            }}
          />
        </Box>
      )}

      {/* Tabs for Human Mode */}
      {mode === 'human' && (
        <Box sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: theme.palette.mode === 'dark' ? '#111B21' : 'white' }}>
          <Tabs
            value={currentTab}
            onChange={(e, val) => setCurrentTab(val)}
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': {
                color: whatsappGreen,
                fontWeight: 600,
              },
              '& .Mui-selected': {
                color: whatsappGreen,
              },
              '& .MuiTabs-indicator': {
                backgroundColor: whatsappGreen,
              },
            }}
          >
            <Tab label={`Contacts (${contacts.length})`} />
            <Tab label={`Groups (${groups.length})`} />
          </Tabs>
        </Box>
      )}

      {/* Chat List */}
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {mode === 'ai' ? (
          <ListItemButton
            selected={selectedChat?.name === 'Nexus AI Assistant'}
            onClick={() => {
              if (messages.length === 0) {
                setMessages([
                  {
                    id: Date.now(),
                    text: `Hello! I'm Nexus AI. How can I assist you?`,
                    sender: 'ai',
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  },
                ]);
              }
              setSelectedChat({ name: 'Nexus AI Assistant', avatar: '🤖', status: 'online' });
            }}
            sx={{
              py: 1.5,
              px: 2,
              backgroundColor:
                selectedChat?.name === 'Nexus AI Assistant'
                  ? theme.palette.mode === 'dark'
                    ? '#2A3942'
                    : '#F0F2F5'
                  : 'transparent',
              '&:hover': {
                backgroundColor: theme.palette.mode === 'dark' ? '#2A3942' : '#F5F6F6',
              },
            }}
          >
            <ListItemAvatar>
              <Avatar sx={{ bgcolor: whatsappGreen, width: 50, height: 50 }}>
                <SmartToy />
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={
                <Typography variant="subtitle1" fontWeight="600">
                  Nexus AI Assistant
                </Typography>
              }
              secondary={
                <Typography variant="body2" color="text.secondary" noWrap>
                  Your intelligent campus companion
                </Typography>
              }
            />
          </ListItemButton>
        ) : (
          <List disablePadding>
            {currentTab === 0
              ? filteredContacts.map((contact) => (
                  <ListItemButton
                    key={contact.id}
                    onClick={() => handleContactClick(contact)}
                    selected={selectedChat?.id === contact.id}
                    sx={{
                      py: 1.5,
                      px: 2,
                      backgroundColor:
                        selectedChat?.id === contact.id
                          ? theme.palette.mode === 'dark'
                            ? '#2A3942'
                            : '#F0F2F5'
                          : 'transparent',
                      '&:hover': {
                        backgroundColor: theme.palette.mode === 'dark' ? '#2A3942' : '#F5F6F6',
                      },
                    }}
                  >
                    <ListItemAvatar>
                      <Badge
                        overlap="circular"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        badgeContent={
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              border: '2px solid white',
                              bgcolor:
                                contact.status === 'online'
                                  ? '#25D366'
                                  : contact.status === 'away'
                                  ? '#FFA500'
                                  : '#999',
                            }}
                          />
                        }
                      >
                        <Avatar sx={{ width: 50, height: 50 }}>{contact.name[0]}</Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle1" fontWeight="600">
                            {contact.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {contact.lastTime}
                          </Typography>
                        </Stack>
                      }
                      secondary={
                        <Stack>
                          <Typography variant="caption" color={whatsappGreen} fontWeight="500">
                            {contact.role}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {contact.lastMessage}
                          </Typography>
                        </Stack>
                      }
                    />
                  </ListItemButton>
                ))
              : filteredGroups.map((group) => (
                  <ListItemButton
                    key={group.id}
                    onClick={() => handleGroupClick(group)}
                    selected={selectedChat?.id === group.id}
                    sx={{
                      py: 1.5,
                      px: 2,
                      backgroundColor:
                        selectedChat?.id === group.id
                          ? theme.palette.mode === 'dark'
                            ? '#2A3942'
                            : '#F0F2F5'
                          : 'transparent',
                      '&:hover': {
                        backgroundColor: theme.palette.mode === 'dark' ? '#2A3942' : '#F5F6F6',
                      },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ width: 50, height: 50, bgcolor: whatsappGreen, fontSize: 24 }}>
                        {group.avatar}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle1" fontWeight="600">
                            {group.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {group.lastTime}
                          </Typography>
                        </Stack>
                      }
                      secondary={
                        <Stack>
                          <Typography variant="caption" color="text.secondary">
                            {group.members} members
                          </Typography>
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {group.lastMessage}
                          </Typography>
                        </Stack>
                      }
                    />
                  </ListItemButton>
                ))}
          </List>
        )}
      </Box>

      {/* Create Group FAB */}
      {mode === 'human' && currentTab === 1 && (
        <Box sx={{ p: 2 }}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateGroupOpen(true)}
            sx={{
              bgcolor: whatsappGreen,
              color: 'white',
              fontWeight: 600,
              borderRadius: '25px',
              py: 1.5,
              '&:hover': {
                bgcolor: whatsappDarkGreen,
              },
            }}
          >
            Create New Group
          </Button>
        </Box>
      )}
    </Box>
  );

  // Chat Window Component
  const ChatWindow = () => (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: chatBgColor,
      }}
    >
      {selectedChat ? (
        <>
          {/* Chat Header */}
          <Box
            sx={{
              background: `linear-gradient(135deg, ${whatsappGreen} 0%, ${whatsappDarkGreen} 100%)`,
              color: 'white',
              p: { xs: 1.5, md: 2 },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Stack direction="row" spacing={{ xs: 1, md: 2 }} alignItems="center">
              {isMobile && (
                <IconButton onClick={() => setSelectedChat(null)} sx={{ color: 'white', p: 0.5 }}>
                  <ArrowBack fontSize="small" />
                </IconButton>
              )}
              <Avatar sx={{ width: { xs: 40, md: 45 }, height: { xs: 40, md: 45 }, bgcolor: 'rgba(255,255,255,0.2)' }}>
                {selectedChat.avatar || selectedChat.name[0]}
              </Avatar>
              <Box>
                <Typography variant={isMobile ? 'body1' : 'subtitle1'} fontWeight="600">
                  {selectedChat.name}
                </Typography>
                <Typography variant="caption">
                  {mode === 'ai'
                    ? 'Online • Always available'
                    : selectedChat.members
                    ? `${selectedChat.members} members`
                    : selectedChat.status === 'online'
                    ? 'Online'
                    : 'Offline'}
                </Typography>
              </Box>
            </Stack>
            <IconButton sx={{ color: 'white' }}>
              <MoreVert />
            </IconButton>
          </Box>

          {/* Messages Area */}
          <Box
            sx={{
              flex: 1,
              overflowY: 'auto',
              p: { xs: 1, md: 2 },
              backgroundImage:
                theme.palette.mode === 'dark'
                  ? 'none'
                  : 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h100v100H0z\' fill=\'%23E5DDD5\' /%3E%3Cpath d=\'M25 25l10 10M75 25l-10 10M25 75l10-10M75 75l-10-10\' stroke=\'%23D1CBC1\' stroke-width=\'1\' /%3E%3C/svg%3E")',
            }}
          >
            <Stack spacing={1}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    display: 'flex',
                    justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <Paper
                    sx={{
                      maxWidth: { xs: '85%', md: '70%' },
                      px: { xs: 1.5, md: 2 },
                      py: { xs: 0.75, md: 1 },
                      bgcolor: msg.sender === 'user' ? userBubbleColor : otherBubbleColor,
                      color: msg.sender === 'user' ? '#000' : 'text.primary',
                      borderRadius:
                        msg.sender === 'user' ? '12px 12px 0 12px' : '12px 12px 12px 0',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    }}
                  >
                    {msg.senderName && (
                      <Typography variant="caption" fontWeight="600" color={whatsappGreen}>
                        {msg.senderName}
                      </Typography>
                    )}
                    <Typography 
                      variant={isMobile ? 'body2' : 'body1'} 
                      sx={{ 
                        whiteSpace: 'pre-wrap', 
                        wordBreak: 'break-word',
                        fontSize: { xs: '0.875rem', md: '1rem' },
                      }}
                    >
                      {msg.text}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        textAlign: 'right',
                        mt: 0.5,
                        opacity: 0.7,
                        fontSize: { xs: '0.65rem', md: '0.7rem' },
                      }}
                    >
                      {msg.timestamp}
                    </Typography>
                  </Paper>
                </motion.div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ display: 'flex', justifyContent: 'flex-start' }}
                >
                  <Paper
                    sx={{
                      px: 2,
                      py: 1,
                      bgcolor: otherBubbleColor,
                      borderRadius: '12px 12px 12px 0',
                      display: 'flex',
                      gap: 0.5,
                    }}
                  >
                    {[0, 0.2, 0.4].map((delay, i) => (
                      <Box
                        key={i}
                        component={motion.div}
                        animate={{ y: [0, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 0.6, delay }}
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: whatsappGreen,
                        }}
                      />
                    ))}
                  </Paper>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </Stack>
          </Box>

          {/* Input Area */}
          <Box sx={{ p: { xs: 1.5, md: 2 }, backgroundColor: theme.palette.mode === 'dark' ? '#1E2428' : '#F0F2F5' }}>
            <Stack direction="row" spacing={{ xs: 0.5, md: 1 }} alignItems="center">
              <IconButton sx={{ color: '#7D8B92', p: { xs: 0.75, md: 1 } }} size={isMobile ? 'small' : 'medium'}>
                <EmojiEmotions fontSize={isMobile ? 'small' : 'medium'} />
              </IconButton>
              <IconButton sx={{ color: '#7D8B92', p: { xs: 0.75, md: 1 } }} size={isMobile ? 'small' : 'medium'}>
                <AttachFile fontSize={isMobile ? 'small' : 'medium'} />
              </IconButton>
              <TextField
                fullWidth
                multiline
                maxRows={3}
                placeholder="Type a message"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                size={isMobile ? 'small' : 'medium'}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '25px',
                    backgroundColor: theme.palette.mode === 'dark' ? '#2A3942' : '#FFFFFF',
                    fontSize: { xs: '0.875rem', md: '1rem' },
                  },
                }}
              />
              <IconButton
                onClick={handleSendMessage}
                disabled={!inputMessage.trim()}
                size={isMobile ? 'small' : 'medium'}
                sx={{
                  bgcolor: whatsappGreen,
                  color: 'white',
                  p: { xs: 0.75, md: 1 },
                  '&:hover': {
                    bgcolor: whatsappDarkGreen,
                  },
                  '&.Mui-disabled': {
                    bgcolor: 'rgba(0,0,0,0.12)',
                  },
                }}
              >
                <Send fontSize={isMobile ? 'small' : 'medium'} />
              </IconButton>
            </Stack>
          </Box>
        </>
      ) : (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
          }}
        >
          <Avatar sx={{ width: 100, height: 100, bgcolor: whatsappGreen }}>
            <SmartToy sx={{ fontSize: 60 }} />
          </Avatar>
          <Typography variant="h5" fontWeight="600" color="text.secondary">
            Nexus Chat Portal
          </Typography>
          <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ maxWidth: 400 }}>
            {mode === 'ai'
              ? 'Start a conversation with Nexus AI to get instant help with your academics'
              : 'Select a contact or group to start chatting'}
          </Typography>
        </Box>
      )}
    </Box>
  );

  // Create Group Dialog
  const CreateGroupDialog = () => (
    <Dialog open={createGroupOpen} onClose={() => setCreateGroupOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6" fontWeight="bold">
          Create New Group
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <TextField
            fullWidth
            label="Group Name"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="Enter group name"
          />
          <TextField
            fullWidth
            label="Group Description (Optional)"
            value={newGroupDescription}
            onChange={(e) => setNewGroupDescription(e.target.value)}
            placeholder="What's this group about?"
            multiline
            rows={2}
          />
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Add Members (Select at least 2)
            </Typography>
            <List sx={{ maxHeight: 300, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              {contacts.map((contact) => (
                <ListItem
                  key={contact.id}
                  button
                  onClick={() => toggleMemberSelection(contact.id)}
                  secondaryAction={
                    selectedMembers.includes(contact.id) ? (
                      <Check color="success" />
                    ) : null
                  }
                  sx={{
                    bgcolor: selectedMembers.includes(contact.id)
                      ? theme.palette.mode === 'dark'
                        ? 'rgba(37, 211, 102, 0.1)'
                        : 'rgba(37, 211, 102, 0.05)'
                      : 'transparent',
                  }}
                >
                  <ListItemAvatar>
                    <Avatar>{contact.name[0]}</Avatar>
                  </ListItemAvatar>
                  <ListItemText primary={contact.name} secondary={contact.role} />
                </ListItem>
              ))}
            </List>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              {selectedMembers.length} member(s) selected
            </Typography>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setCreateGroupOpen(false)}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleCreateGroup}
          disabled={!newGroupName.trim() || selectedMembers.length < 2}
          sx={{
            bgcolor: whatsappGreen,
            '&:hover': { bgcolor: whatsappDarkGreen },
          }}
        >
          Create Group
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box
      sx={{
        height: { xs: 'calc(100vh - 56px)', sm: 'calc(100vh - 64px)' },
        display: 'flex',
        overflow: 'hidden',
        backgroundColor: theme.palette.background.default,
      }}
    >
      {(!isMobile || !selectedChat) && <ChatList />}
      {(!isMobile || selectedChat) && <ChatWindow />}
      <CreateGroupDialog />
    </Box>
  );
};

export default ChatPortal;
