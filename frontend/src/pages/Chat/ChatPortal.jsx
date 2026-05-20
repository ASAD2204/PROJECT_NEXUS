import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
  Popover,
  Menu as MuiMenu,
  MenuItem as MuiMenuItem,
  Divider,
  CircularProgress,
  Chip,
  Skeleton,
  FormControlLabel,
  Checkbox,
  Fade,
  Zoom,
} from '@mui/material';
import { alpha, styled } from '@mui/material/styles';
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
  DoneAll,
  Security,
  LocalLibrary,
  Work,
  School,
  Delete,
  FileDownload,
  InsertDriveFile,
  Image as ImageIcon,
  PictureAsPdf,
  QuestionAnswer,
  History,
  AutoAwesome,
  Info,
  ChevronRight,
  Hub,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { chatAPI } from '../../api/chat';
import { aiAPI } from '../../api/ai';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { sisAPI } from '../../api/sis';
import MarkdownRenderer from '../../components/Common/MarkdownRenderer';

const AI_ASSISTANT_CHAT = {
  name: 'Nexus Intelligence Core',
  avatar: '🤖',
  status: 'online',
  id: 'ai-assistant',
  session_id: 'ai-assistant'
};

const reactionList = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

// --- Styled Components for Visual Perfection ---

const GlassSidebarHeader = styled(Box)(({ theme, bgcolor }) => ({
  padding: theme.spacing(2.5),
  background: bgcolor,
  color: 'white',
  position: 'relative',
  overflow: 'hidden',
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    right: 0,
    width: '100%',
    height: '100%',
    background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 100%)',
    pointerEvents: 'none',
  }
}));

const ChatInputWrapper = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  background: theme.palette.background.paper,
  borderTop: `1px solid ${theme.palette.divider}`,
  boxShadow: '0 -4px 20px rgba(0,0,0,0.03)',
  zIndex: 10,
}));

const ModernListItem = styled(ListItemButton)(({ theme, selected }) => ({
  margin: theme.spacing(0.5, 1.5),
  borderRadius: theme.spacing(1.5),
  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  border: '1px solid transparent',
  ...(selected && {
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
    borderColor: alpha(theme.palette.primary.main, 0.1),
    '& .MuiListItemText-primary': {
      fontWeight: 800,
    }
  }),
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.04),
    transform: 'translateX(4px)',
  }
}));

// --- Helper Functions ---

const getAvatarColor = (name) => {
  const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const normalizeConversation = (item, index = 0, onlineUsers = []) => {
  const sessionId = item.session_id || item.id || `conversation-${index + 1}`;
  const participants = item.participants || [];
  const isOnline = participants.some(p => onlineUsers.includes(String(p)));

  const participantLabel = Array.isArray(item.participants) && item.participants.length > 0
    ? item.participants.map((p) => String(p).slice(0, 8)).join(', ')
    : 'Direct chat';
  const name = item.name || item.full_name || participantLabel || `Conversation ${sessionId.slice(0, 8)}`;
  return {
    ...item,
    id: sessionId,
    session_id: sessionId,
    name,
    avatar: item.avatar,
    status: isOnline ? 'online' : 'offline',
    lastMessage: item.last_message || 'No messages yet',
    lastTime: item.last_message_at ? new Date(item.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
    role: item.role || participantLabel,
    members: item.members ?? (item.participants?.length || 0),
    participants: item.participants || [],
    is_group: item.is_group || false
  };
};

const normalizeGroup = (item, index = 0) => {
  const sessionId = item.session_id || item.id || `group-${index + 1}`;
  const name = item.name || `Group ${sessionId.slice(0, 8)}`;
  return {
    ...item,
    id: sessionId,
    session_id: sessionId,
    name,
    avatar: item.avatar,
    lastMessage: item.last_message || 'No messages yet',
    lastTime: item.last_message_at ? new Date(item.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
    members: item.members ?? (item.participants?.length || 0),
    participants: item.participants || [],
    is_group: true
  };
};

const getFileIcon = (type) => {
  if (!type) return <InsertDriveFile />;
  if (type.includes('image')) return <ImageIcon />;
  if (type.includes('pdf')) return <PictureAsPdf />;
  return <InsertDriveFile />;
};

// --- Components ---

const MessageBubble = ({ msg, isUser, theme, userBubbleColor, otherBubbleColor, onReaction }) => (
  <motion.div
    initial={{ opacity: 0, y: 10, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.2 }}
    style={{ alignSelf: isUser ? 'flex-end' : 'flex-start', maxWidth: '80%', position: 'relative', marginBottom: '16px' }}
  >
    <Paper 
      elevation={0}
      onContextMenu={(e) => { e.preventDefault(); onReaction(e, msg.id); }}
      sx={{ 
        p: 1.8, 
        bgcolor: isUser ? userBubbleColor : otherBubbleColor, 
        borderRadius: isUser ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
        color: isUser && theme.palette.mode === 'light' ? 'inherit' : 'text.primary',
        boxShadow: isUser ? '0 4px 12px rgba(0,0,0,0.08)' : '0 2px 8px rgba(0,0,0,0.05)',
        position: 'relative',
        transition: 'all 0.2s ease',
        border: '1px solid',
        borderColor: alpha(theme.palette.divider, 0.05),
        '&:hover': {
          boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
          transform: 'translateY(-1px)',
        }
      }}
    >
      {!isUser && msg.senderName && (
        <Typography variant="caption" color="primary" fontWeight="900" sx={{ display: 'block', mb: 0.8, fontSize: '0.65rem', letterSpacing: 0.8, textTransform: 'uppercase' }}>
          {msg.senderName}
        </Typography>
      )}
      
      {/* Attachments Section */}
      {msg.attachments?.map((att, i) => (
        <Box key={i} sx={{ 
          mb: 1.5, 
          p: 1.5, 
          border: '1px solid', 
          borderColor: 'divider', 
          borderRadius: 2, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1.5, 
          bgcolor: alpha(theme.palette.background.paper, 0.6),
          backdropFilter: 'blur(8px)'
        }}>
           <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', width: 36, height: 32 }}>
             {getFileIcon(att.file_type)}
           </Avatar>
           <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" noWrap fontWeight="700" display="block">{att.file_name}</Typography>
              <Typography variant="caption" sx={{ opacity: 0.6, fontSize: '0.6rem' }}>{att.file_type.split('/')[1]?.toUpperCase() || 'FILE'}</Typography>
           </Box>
           <IconButton size="small" component="a" href={att.file_url} download sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'primary.main', color: 'white' } }}>
             <FileDownload fontSize="small" />
           </IconButton>
        </Box>
      ))}

      <Box className="message-content" sx={{ '& table': { my: 1, borderCollapse: 'collapse', width: '100%' } }}>
        <MarkdownRenderer text={msg.text} />
      </Box>
      
      <Stack direction="row" spacing={0.8} alignItems="center" justifyContent="flex-end" sx={{ mt: 1, opacity: 0.5 }}>
        <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 600 }}>{msg.timestamp}</Typography>
        {isUser && (msg.is_read ? <DoneAll sx={{ fontSize: 14, color: '#34B7F1' }} /> : <Check sx={{ fontSize: 14 }} />)}
      </Stack>

      {/* Reactions */}
      {Object.keys(msg.reactions || {}).length > 0 && (
        <Box sx={{ position: 'absolute', bottom: -12, left: isUser ? 'auto' : 12, right: isUser ? 12 : 'auto', display: 'flex', gap: 0.5, zIndex: 2 }}>
          {Object.entries(msg.reactions).map(([emoji, users]) => (
            <Tooltip key={emoji} title={`${users.length} reaction(s)`}>
              <Chip 
                label={`${emoji} ${users.length}`} 
                size="small" 
                sx={{ 
                  height: 24, 
                  bgcolor: 'background.paper', 
                  border: '1px solid', 
                  borderColor: 'divider',
                  fontSize: '0.7rem',
                  fontWeight: '900',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
                  '&:hover': { transform: 'scale(1.1)' }
                }} 
              />
            </Tooltip>
          ))}
        </Box>
      )}
    </Paper>
  </motion.div>
);

// --- Main Chat Portal ---

const ChatPortal = () => {
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Refs
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Core State
  const [mode, setMode] = useState('human');
  const [currentTab, setCurrentTab] = useState(0);
  const [selectedChat, setSelectedChat] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [attachedFile, setAttachedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Dialogs
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [addContactEmail, setAddContactEmail] = useState('');
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);

  // AI & Socket States
  const [aiSessionId, setAiSessionId] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [reactionAnchor, setReactionAnchor] = useState({ el: null, msgId: null });

  // --- Role-Based Theme ---
  const roleTheme = useMemo(() => {
    const role = user?.role?.toLowerCase();
    switch (role) {
      case 'admin': return { primary: '#1E3A8A', secondary: '#1e40af', bubble: theme.palette.mode === 'dark' ? '#1a237e' : '#e3f2fd', icon: <Security />, label: 'Admin Command' };
      case 'faculty': case 'teacher': return { primary: '#4C1D95', secondary: '#5b21b6', bubble: theme.palette.mode === 'dark' ? '#311b92' : '#f3e5f5', icon: <School />, label: 'Faculty Hub' };
      case 'alumni': return { primary: '#92400E', secondary: '#b45309', bubble: theme.palette.mode === 'dark' ? '#3e2723' : '#fff8e1', icon: <Work />, label: 'Alumni Core' };
      case 'librarian': return { primary: '#065F46', secondary: '#047857', bubble: theme.palette.mode === 'dark' ? '#004d40' : '#e0f2f1', icon: <LocalLibrary />, label: 'Library Nexus' };
      default: return { primary: '#128C7E', secondary: '#075E54', bubble: theme.palette.mode === 'dark' ? '#1b5e20' : '#e8f5e9', icon: <Person />, label: 'Nexus Social' };
    }
  }, [user?.role, theme.palette.mode]);

  const whatsappGreen = roleTheme.primary;
  const whatsappDarkGreen = roleTheme.secondary;
  const userBubbleColor = roleTheme.bubble;
  const otherBubbleColor = theme.palette.mode === 'dark' ? '#262626' : '#FFFFFF';
  const chatBgColor = theme.palette.mode === 'dark' ? '#121212' : '#F5F7FB';

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); };
  useEffect(() => { scrollToBottom(); }, [messages, isTyping]);

  // Online Presence
  const fetchOnlineUsers = useCallback(async () => {
    try {
      const res = await chatAPI.getOnlineUsers();
      setOnlineUsers(res.data.online_users || []);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    if (mode === 'human') { 
      fetchOnlineUsers(); 
      const interval = setInterval(fetchOnlineUsers, 30000); 
      return () => clearInterval(interval); 
    }
  }, [mode, fetchOnlineUsers]);

  // Data Loading
  const loadHumanData = useCallback(async () => {
    setLoading(true);
    try {
      const [contactsRes, groupsRes] = await Promise.allSettled([
        chatAPI.getConversations(), 
        chatAPI.getGroups(),
      ]);
      if (contactsRes.status === 'fulfilled') {
        const rows = contactsRes.value.data?.conversations || contactsRes.value.data || [];
        setContacts(rows.map((item, index) => normalizeConversation(item, index, onlineUsers)));
      }
      if (groupsRes.status === 'fulfilled') {
        const rows = groupsRes.value.data?.groups || groupsRes.value.data || [];
        setGroups(rows.map((item, index) => normalizeGroup(item, index)));
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [onlineUsers]);

  useEffect(() => { if (mode === 'human') loadHumanData(); }, [mode, loadHumanData]);

  const loadConversationMessages = useCallback(async (sessionId) => {
    if (!sessionId || sessionId === 'ai-assistant') return;
    try {
      const res = await chatAPI.getMessages(sessionId);
      const rows = res.data?.messages || res.data || [];
      setMessages(rows.map((item, index) => ({ 
        id: item.message_id || item._id || index, 
        text: item.content || '', 
        sender: item.sender_id === user?.user_id ? 'user' : 'other', 
        senderName: item.sender_name, 
        attachments: item.attachments || [], 
        is_read: item.is_read || false,
        reactions: item.reactions || {},
        timestamp: item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now' 
      })));
    } catch (e) { setMessages([]); }
  }, [user?.user_id]);

  // Handlers
  const handleSendMessage = async () => {
    if (!inputMessage.trim() && !attachedFile) return;
    const text = inputMessage; setInputMessage(''); setAttachedFile(null);
    let attachments = [];
    if (attachedFile) {
      try {
        const formData = new FormData(); formData.append('file', attachedFile);
        const res = await chatAPI.uploadFile(formData);
        attachments.push({ file_url: res.data.file_url, file_type: res.data.file_type, file_name: res.data.file_name });
      } catch (err) { showSnackbar('Upload failed', 'error'); return; }
    }
    
    if (mode === 'ai') {
      setIsTyping(true);
      setMessages(prev => [...prev, { id: Date.now(), text, sender: 'user', attachments, timestamp: 'Now' }]);
      try {
        const res = await aiAPI.chat(text, aiSessionId, attachments);
        if (res.data?.session_id) setAiSessionId(res.data.session_id);
        setMessages(prev => [...prev, { id: Date.now() + 1, text: res.data.response, sender: 'ai', timestamp: 'Now' }]);
      } catch (err) { showSnackbar('AI unavailable', 'error'); } finally { setIsTyping(false); }
    } else {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ content: text, message_type: attachments.length > 0 ? 'file' : 'text', attachments }));
      } else {
        try { 
          await chatAPI.sendMessage(selectedChat.session_id, { content: text, message_type: attachments.length > 0 ? 'file' : 'text', attachments }); 
          loadConversationMessages(selectedChat.session_id); 
        } catch (err) { showSnackbar('Failed to send', 'error'); }
      }
    }
  };

  const handleAddContact = async () => {
    if (!addContactEmail) return;
    try {
      const res = await chatAPI.createSessionByEmail(addContactEmail);
      showSnackbar('Contact added successfully', 'success');
      setAddContactOpen(false);
      setAddContactEmail('');
      await loadHumanData();
      const newChat = normalizeConversation(res.data, 0, onlineUsers);
      setSelectedChat(newChat);
      loadConversationMessages(newChat.session_id);
    } catch (e) {
      showSnackbar(e.response?.data?.detail || 'Failed to add contact', 'error');
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName || selectedMembers.length < 1) {
       showSnackbar('Please enter group name and select members', 'warning');
       return;
    }
    try {
      const res = await chatAPI.createGroup({ name: newGroupName, participant_ids: selectedMembers });
      showSnackbar('Group created successfully', 'success');
      setCreateGroupOpen(false);
      setNewGroupName('');
      setSelectedMembers([]);
      await loadHumanData();
      const newGroup = normalizeGroup(res.data);
      setSelectedChat(newGroup);
      loadConversationMessages(newGroup.session_id);
    } catch (e) {
      showSnackbar('Failed to create group. Database validation failed.', 'error');
    }
  };

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', overflow: 'hidden', bgcolor: 'background.default' }}>
      {/* 1. SIDEBAR */}
      {(!isMobile || !selectedChat) && (
        <Box sx={{ 
          width: { xs: '100%', md: 360, lg: 400 }, 
          height: '100%', 
          borderRight: 1, 
          borderColor: 'divider', 
          display: 'flex', 
          flexDirection: 'column', 
          bgcolor: 'background.paper',
          zIndex: 10,
          boxShadow: '4px 0 20px rgba(0,0,0,0.02)'
        }}>
          {/* Header */}
          <GlassSidebarHeader bgcolor={whatsappGreen}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack direction="row" spacing={1.8} alignItems="center">
                 <Avatar sx={{ 
                    bgcolor: 'rgba(255,255,255,0.15)', 
                    border: '1px solid rgba(255,255,255,0.3)',
                    width: 44, height: 44,
                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                 }}>
                   {roleTheme.icon}
                 </Avatar>
                 <Box>
                    <Typography variant="subtitle1" fontWeight="900" sx={{ lineHeight: 1.1, letterSpacing: -0.5 }}>{roleTheme.label}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase' }}>Academic Intelligence</Typography>
                 </Box>
              </Stack>
              <Stack direction="row" spacing={0.5}>
                <Tooltip title="Mode Switch"><IconButton onClick={() => { setMode(mode === 'ai' ? 'human' : 'ai'); setSelectedChat(null); }} size="small" sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}>{mode === 'ai' ? <QuestionAnswer fontSize="small"/> : <SmartToy fontSize="small"/>}</IconButton></Tooltip>
              </Stack>
            </Stack>
          </GlassSidebarHeader>
          
          {mode === 'human' && (
            <Tabs 
              value={currentTab} 
              onChange={(e,v) => setCurrentTab(v)} 
              variant="fullWidth" 
              sx={{ 
                borderBottom: 1, 
                borderColor: 'divider',
                minHeight: 48,
                '& .MuiTab-root': { fontWeight: '800', fontSize: '0.75rem', color: 'text.secondary' },
                '& .Mui-selected': { color: 'primary.main' }
              }}
            >
              <Tab icon={<Person sx={{ fontSize: 18 }}/>} iconPosition="start" label="PERSONAL" />
              <Tab icon={<GroupIcon sx={{ fontSize: 18 }}/>} iconPosition="start" label="GROUPS" />
            </Tabs>
          )}

          <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
            <AnimatePresence mode="wait">
              {loading ? (
                <List key="loading">{[1,2,3,4].map(i=><ListItem key={i} sx={{ px: 2 }}><ListItemAvatar><Skeleton variant="circular" width={44} height={44}/></ListItemAvatar><ListItemText primary={<Skeleton width="60%"/>} secondary={<Skeleton width="40%"/>}/></ListItem>)}</List>
              ) : mode === 'ai' ? (
                <motion.div key="ai" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                  <ModernListItem selected onClick={() => { setSelectedChat(AI_ASSISTANT_CHAT); setMessages([]); }}>
                    <ListItemAvatar>
                      <Badge overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} badgeContent={<AutoAwesome sx={{ fontSize: 10, color: 'white' }}/>} sx={{ '& .MuiBadge-badge': { bgcolor: 'primary.main', border: '2px solid white' } }}>
                        <Avatar sx={{ bgcolor: whatsappGreen, color: 'white', width: 44, height: 44 }}><SmartToy /></Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText primary="Nexus Intelligence" secondary="Real-time Knowledge Engine" secondaryTypographyProps={{ color: 'primary', fontWeight: '700', fontSize: '0.7rem' }} />
                    <ChevronRight sx={{ opacity: 0.3 }} />
                  </ModernListItem>
                </motion.div>
              ) : (
                <motion.div key="human" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                  <List disablePadding>
                    {(currentTab === 0 ? contacts : groups).map(chat => (
                      <ModernListItem key={chat.id} selected={selectedChat?.id === chat.id} onClick={() => { setSelectedChat(chat); loadConversationMessages(chat.session_id); }}>
                        <ListItemAvatar>
                          <Badge overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} variant="dot" color={chat.status === 'online' ? 'success' : 'default'}>
                            <Avatar sx={{ 
                              border: '1px solid', 
                              borderColor: alpha(getAvatarColor(chat.name), 0.3), 
                              width: 44, height: 44, 
                              bgcolor: alpha(getAvatarColor(chat.name), 0.1),
                              color: getAvatarColor(chat.name),
                              fontWeight: '900',
                              fontSize: '1.2rem'
                            }}>
                               {chat.is_group ? <GroupIcon sx={{ fontSize: '1.4rem' }}/> : chat.name[0]}
                            </Avatar>
                          </Badge>
                        </ListItemAvatar>
                        <ListItemText 
                          primary={chat.name} 
                          secondary={chat.lastMessage} 
                          primaryTypographyProps={{ fontSize: '0.9rem', color: 'text.primary' }}
                          secondaryTypographyProps={{ noWrap: true, fontSize: '0.75rem', mt: -0.2 }} 
                        />
                        <Stack alignItems="flex-end" spacing={0.5}>
                          {chat.lastTime && <Typography variant="caption" sx={{ opacity: 0.5, fontSize: '0.6rem', fontWeight: 600 }}>{chat.lastTime}</Typography>}
                        </Stack>
                      </ModernListItem>
                    ))}
                    { (currentTab === 0 ? contacts : groups).length === 0 && (
                      <Box sx={{ textAlign: 'center', py: 10, px: 4 }}>
                        <Avatar sx={{ width: 64, height: 64, mx: 'auto', mb: 2, bgcolor: alpha(theme.palette.text.disabled, 0.1) }}>{currentTab === 0 ? <Person sx={{ color: 'text.disabled' }}/> : <GroupIcon sx={{ color: 'text.disabled' }}/>}</Avatar>
                        <Typography variant="body2" color="text.secondary" fontWeight="700">No {currentTab === 0 ? 'contacts' : 'groups'} yet</Typography>
                        <Button variant="outlined" size="small" startIcon={<Add />} onClick={() => currentTab === 0 ? setAddContactOpen(true) : setCreateGroupOpen(true)} sx={{ mt: 2, borderRadius: 2, borderWidth: 2, '&:hover': { borderWidth: 2 } }}>{currentTab === 0 ? 'Add Contact' : 'Create Group'}</Button>
                      </Box>
                    )}
                  </List>
                </motion.div>
              )}
            </AnimatePresence>
          </Box>
          
          {mode === 'human' && (
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
               <Button fullWidth startIcon={<Add />} variant="contained" onClick={() => currentTab === 0 ? setAddContactOpen(true) : setCreateGroupOpen(true)} sx={{ borderRadius: 2.5, py: 1.2, bgcolor: whatsappGreen, fontWeight: 800, boxShadow: `0 8px 20px ${alpha(whatsappGreen, 0.3)}` }}>
                  NEW {currentTab === 0 ? 'CONTACT' : 'GROUP'}
               </Button>
            </Box>
          )}
        </Box>
      )}

      {/* 2. CHAT WINDOW */}
      {(!isMobile || selectedChat) && (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: chatBgColor, position: 'relative' }}>
          {selectedChat ? (
            <>
              {/* Header */}
              <Box sx={{ 
                p: 1.5, 
                px: 3,
                bgcolor: alpha(theme.palette.background.paper, 0.8), 
                backdropFilter: 'blur(12px)',
                borderBottom: 1, 
                borderColor: 'divider', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 2, 
                zIndex: 5,
                boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
              }}>
                {isMobile && <IconButton onClick={() => setSelectedChat(null)}><ArrowBack /></IconButton>}
                <Avatar sx={{ 
                    width: 44, height: 44, 
                    border: '1px solid', borderColor: 'divider',
                    bgcolor: alpha(getAvatarColor(selectedChat.name), 0.1),
                    color: getAvatarColor(selectedChat.name),
                    fontWeight: '900'
                }}>
                    {selectedChat.is_group ? <GroupIcon /> : selectedChat.name[0]}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                   <Typography variant="subtitle1" fontWeight="900" sx={{ letterSpacing: -0.2 }}>{selectedChat.name}</Typography>
                   <Stack direction="row" spacing={0.8} alignItems="center">
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: selectedChat.status === 'online' || selectedChat.id === 'ai-assistant' ? '#4CAF50' : '#9E9E9E', border: '2px solid white' }} />
                      <Typography variant="caption" sx={{ opacity: 0.6, fontWeight: 700 }}>{selectedChat.id === 'ai-assistant' ? 'Database Grounded' : selectedChat.status === 'online' ? 'Online' : 'Offline'}</Typography>
                   </Stack>
                </Box>
                <Stack direction="row" spacing={0.5}>
                  <IconButton sx={{ bgcolor: 'action.hover' }}><Search fontSize="small" /></IconButton>
                  <IconButton sx={{ bgcolor: 'action.hover' }}><MoreVert fontSize="small" /></IconButton>
                </Stack>
              </Box>

              {/* Messages Area */}
              <Box sx={{ 
                flex: 1, 
                overflowY: 'auto', 
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                backgroundImage: theme.palette.mode === 'dark' ? 'none' : 'url("https://w0.peakpx.com/wallpaper/580/650/wallpaper-whatsapp-background.jpg")',
                backgroundSize: '400px',
                backgroundBlendMode: 'overlay',
                backgroundColor: alpha(chatBgColor, 0.95),
                scrollBehavior: 'smooth',
                '&::-webkit-scrollbar': { width: 6 },
                '&::-webkit-scrollbar-thumb': { backgroundColor: alpha(theme.palette.text.disabled, 0.2), borderRadius: 3 }
              }}>
                <AnimatePresence>
                  {messages.map((msg) => (
                    <MessageBubble 
                      key={msg.id} 
                      msg={msg} 
                      isUser={msg.sender === 'user'} 
                      theme={theme} 
                      userBubbleColor={userBubbleColor} 
                      otherBubbleColor={otherBubbleColor} 
                      onReaction={(e, id) => setReactionAnchor({ el: e.currentTarget, msgId: id })}
                    />
                  ))}
                  {isTyping && (
                    <Box sx={{ alignSelf: 'flex-start', p: 1.8, bgcolor: otherBubbleColor, borderRadius: '20px 20px 20px 4px', display: 'flex', gap: 0.6, mb: 2, boxShadow: 1 }}>
                       {[0,0.2,0.4].map(d=><Box key={d} component={motion.div} animate={{y:[0,-5,0]}} transition={{repeat:Infinity,duration:0.6,delay:d}} sx={{width:7,height:7,borderRadius:'50%',bgcolor:whatsappGreen}}/>)}
                    </Box>
                  )}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </Box>

              {/* Input Area */}
              <ChatInputWrapper>
                {attachedFile && (
                  <Zoom in={Boolean(attachedFile)}>
                    <Paper sx={{ mb: 2, p: 2, display: 'flex', alignItems: 'center', gap: 2, bgcolor: alpha(whatsappGreen, 0.05), border: '1px dashed', borderColor: whatsappGreen, borderRadius: 3 }}>
                      <Avatar sx={{ bgcolor: whatsappGreen, width: 36, height: 36 }}>{getFileIcon(attachedFile.type)}</Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="caption" fontWeight="800" noWrap display="block">{attachedFile.name}</Typography>
                        <Typography variant="caption" sx={{ opacity: 0.6, fontSize: '0.6rem' }}>Ready for upload</Typography>
                      </Box>
                      <IconButton size="small" onClick={() => setAttachedFile(null)} sx={{ color: 'error.main', bgcolor: 'background.paper' }}><Close fontSize="small" /></IconButton>
                    </Paper>
                  </Zoom>
                )}
                
                <Stack direction="row" spacing={1.5} alignItems="flex-end">
                  <Stack direction="row" spacing={0.5}>
                    <IconButton size="small" sx={{ mb: 0.5, bgcolor: 'action.hover' }}><EmojiEmotions fontSize="small"/></IconButton>
                    <IconButton size="small" sx={{ mb: 0.5, bgcolor: 'action.hover' }} onClick={() => fileInputRef.current.click()}><AttachFile fontSize="small"/></IconButton>
                  </Stack>
                  <input type="file" ref={fileInputRef} hidden onChange={(e)=>setAttachedFile(e.target.files[0])} />
                  
                  <TextField 
                    fullWidth 
                    multiline 
                    maxRows={5} 
                    placeholder={mode === 'ai' ? "Ask about grades, attendance, or fees..." : "Type a message..."}
                    value={inputMessage} 
                    onChange={(e)=>setInputMessage(e.target.value)} 
                    onKeyPress={(e)=>{if(e.key==='Enter' && !e.shiftKey){e.preventDefault(); handleSendMessage();}}} 
                    sx={{ 
                      '& .MuiOutlinedInput-root': { 
                        borderRadius: 3, 
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#F0F2F5',
                        fontSize: '0.9rem',
                        transition: 'all 0.2s',
                        '&:hover': { bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#E8EAED' }
                      },
                      '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
                    }}
                  />
                  
                  <IconButton 
                    onClick={handleSendMessage} 
                    disabled={!inputMessage.trim() && !attachedFile}
                    sx={{ 
                      bgcolor: whatsappGreen, 
                      color: 'white', 
                      mb: 0.5,
                      width: 48, height: 48,
                      boxShadow: `0 6px 15px ${alpha(whatsappGreen, 0.4)}`,
                      '&:hover': { bgcolor: whatsappDarkGreen, transform: 'scale(1.05)' },
                      '&.Mui-disabled': { bgcolor: 'action.disabledBackground', boxShadow: 'none' }
                    }}
                  >
                    <Send />
                  </IconButton>
                </Stack>
              </ChatInputWrapper>
            </>
          ) : (
            <Fade in={!selectedChat}>
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, p: 4, textAlign: 'center' }}>
                <Box sx={{ position: 'relative' }}>
                  <Avatar sx={{ 
                    width: 140, height: 140, 
                    bgcolor: alpha(whatsappGreen, 0.05), 
                    border: '2px dashed', 
                    borderColor: alpha(whatsappGreen, 0.3),
                    transition: 'all 0.5s ease',
                    '&:hover': { borderColor: whatsappGreen, transform: 'rotate(5deg)' }
                  }}>
                    {mode === 'ai' ? <SmartToy sx={{ fontSize: 70, color: whatsappGreen }} /> : <Person sx={{ fontSize: 70, color: whatsappGreen }} />}
                  </Avatar>
                  <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 3 }} style={{ position: 'absolute', top: 0, right: 0 }}>
                    <AutoAwesome sx={{ color: whatsappGreen, fontSize: 36 }} />
                  </motion.div>
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="1000" color="text.primary" gutterBottom sx={{ letterSpacing: -1 }}>
                    {mode === 'ai' ? 'Intelligence Core' : 'Campus Messenger'}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 450, mx: 'auto', lineHeight: 1.6 }}>
                    {mode === 'ai' 
                      ? 'Secure, database-grounded RAG agent at your service. Query your academic performance, financial history, or campus knowledge graph.' 
                      : 'Connect instantly with the Nexus community. Real-time, encrypted communication for the modern campus.'}
                  </Typography>
                </Box>
                {mode === 'ai' && (
                   <Stack direction="row" spacing={1.5} flexWrap="wrap" justifyContent="center">
                      <Chip icon={<History />} label="Session History" onClick={() => loadConversationMessages('ai-assistant')} variant="outlined" sx={{ borderRadius: 2, px: 1, fontWeight: 700 }} />
                      <Chip icon={<Info />} label="Privacy Shield" onClick={() => showSnackbar('End-to-end encrypted session active.', 'info')} variant="outlined" sx={{ borderRadius: 2, px: 1, fontWeight: 700 }} />
                   </Stack>
                )}
              </Box>
            </Fade>
          )}
        </Box>
      )}

      {/* 3. DIALOGS */}
      
      <Dialog open={addContactOpen} onClose={() => setAddContactOpen(false)} PaperProps={{ sx: { borderRadius: 4, width: 420, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: '900', fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: 1.5 }}>
           <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}><Person /></Avatar>
           Add Contact
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary', fontWeight: 500 }}>Link a university email to your personal terminal to start chatting.</Typography>
          <TextField 
            fullWidth 
            label="Nexus Email ID" 
            placeholder="student@nexus.edu"
            value={addContactEmail} 
            onChange={(e) => setAddContactEmail(e.target.value)} 
            autoFocus
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setAddContactOpen(false)} color="inherit" sx={{ fontWeight: 800 }}>CANCEL</Button>
          <Button variant="contained" onClick={handleAddContact} sx={{ bgcolor: whatsappGreen, fontWeight: 800, px: 4, borderRadius: 2.5 }}>SYNC CONTACT</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={createGroupOpen} onClose={() => setCreateGroupOpen(false)} PaperProps={{ sx: { borderRadius: 4, width: 480, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: '900', fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: 1.5 }}>
           <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}><GroupIcon /></Avatar>
           Create Space
        </DialogTitle>
        <DialogContent>
          <TextField 
            fullWidth 
            label="Group Name" 
            placeholder="e.g. Research Squad"
            value={newGroupName} 
            onChange={(e) => setNewGroupName(e.target.value)} 
            sx={{ mt: 1, mb: 3, '& .MuiOutlinedInput-root': { borderRadius: 3 } }} 
          />
          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: '900', fontSize: '0.75rem', color: 'primary.main', textTransform: 'uppercase' }}>Select Members ({selectedMembers.length})</Typography>
          <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto', borderRadius: 3, bgcolor: alpha(theme.palette.action.hover, 0.3) }}>
            <List disablePadding>
              {contacts.filter(c => !c.is_group).map((c, idx) => {
                const otherUid = c.participants?.find(p=>p!==user?.user_id);
                if (!otherUid) return null;

                const isSelected = selectedMembers.includes(otherUid);
                return (
                  <ListItem key={otherUid} disablePadding divider={idx < contacts.length - 1}>
                    <ListItemButton onClick={() => {
                      if (isSelected) setSelectedMembers(selectedMembers.filter(id => id !== otherUid));
                      else setSelectedMembers([...selectedMembers, otherUid]);
                    }} sx={{ px: 2, py: 1.5 }}>
                      <ListItemAvatar>
                         <Avatar sx={{ bgcolor: alpha(getAvatarColor(c.name), 0.1), color: getAvatarColor(c.name), fontWeight: 'bold' }}>{c.name[0]}</Avatar>
                      </ListItemAvatar>
                      <ListItemText primary={c.name} secondary={c.role || 'Member'} primaryTypographyProps={{ fontWeight: 700 }} />
                      <Checkbox checked={isSelected} sx={{ '&.Mui-checked': { color: whatsappGreen } }} />
                    </ListItemButton>
                  </ListItem>
                );
              })}
              {contacts.length === 0 && <Box sx={{ p: 4, textAlign: 'center' }}><Typography variant="caption" color="text.secondary" fontWeight="700">Add contacts to build your team</Typography></Box>}
            </List>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setCreateGroupOpen(false)} color="inherit" sx={{ fontWeight: 800 }}>CANCEL</Button>
          <Button variant="contained" onClick={handleCreateGroup} disabled={!newGroupName || selectedMembers.length < 1} sx={{ bgcolor: whatsappGreen, fontWeight: 800, px: 4, borderRadius: 2.5, boxShadow: `0 8px 15px ${alpha(whatsappGreen, 0.2)}` }}>LAUNCH SPACE</Button>
        </DialogActions>
      </Dialog>

      {/* Reaction Popover */}
      <Popover 
        open={Boolean(reactionAnchor.el)} 
        anchorEl={reactionAnchor.el} 
        onClose={() => setReactionAnchor({ el: null, msgId: null })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Paper sx={{ p: 1, borderRadius: 10, display: 'flex', gap: 0.5, bgcolor: 'background.paper', boxShadow: 12 }}>
          {reactionList.map(emoji => (
            <IconButton key={emoji} onClick={() => {
              if (socketRef.current?.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify({ type: 'reaction', message_id: reactionAnchor.msgId, reaction: emoji }));
              }
              setReactionAnchor({ el: null, msgId: null });
            }} size="small" sx={{ '&:hover': { transform: 'scale(1.3)', bgcolor: 'action.hover' }, transition: 'all 0.2s' }}>{emoji}</IconButton>
          ))}
        </Paper>
      </Popover>
    </Box>
  );
};

export default ChatPortal;
