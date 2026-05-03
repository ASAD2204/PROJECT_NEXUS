import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import { useSnackbar } from '../../contexts/SnackbarContext';
import { sisAPI } from '../../api/sis';

const AI_ASSISTANT_CHAT = {
  name: 'Nexus AI Assistant',
  avatar: '🤖',
  status: 'online',
  id: 'ai-assistant',
  session_id: 'ai-assistant'
};

const whatsappGreen = '#128C7E';
const whatsappDarkGreen = '#075E54';

// --- Helper Functions (Moved outside) ---

const normalizeConversation = (item, index = 0) => {
  const sessionId = item.session_id || item.id || `conversation-${index + 1}`;
  const participantLabel = Array.isArray(item.participants) && item.participants.length > 0
    ? item.participants.map((p) => String(p).slice(0, 8)).join(', ')
    : 'Direct chat';
  const name = item.name || item.full_name || participantLabel || `Conversation ${sessionId.slice(0, 8)}`;
  return {
    ...item,
    id: sessionId,
    session_id: sessionId,
    name,
    avatar: item.avatar || name[0]?.toUpperCase() || 'C',
    status: item.status || 'online',
    lastMessage: item.last_message || 'No messages yet',
    lastTime: item.last_message_at ? new Date(item.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
    role: item.role || participantLabel,
    members: item.members ?? (item.participants?.length || 0),
    participants: item.participants || [],
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
    avatar: item.avatar || name[0]?.toUpperCase() || 'G',
    lastMessage: item.last_message || 'No messages yet',
    lastTime: item.last_message_at ? new Date(item.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
    members: item.members ?? (item.participants?.length || 0),
    participants: item.participants || [],
  };
};

// --- Sub-components extracted to fix focus loss ---

const ChatList = ({ 
  theme, isMobile, navigate, mode, setMode, 
  setMessages, setAddContactOpen, setCreateGroupOpen, searchQuery, setSearchQuery,
  currentTab, setCurrentTab, contacts, groups, teachers, selectedChat, 
  handleContactClick, handleGroupClick, user
}) => (
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
          <Tooltip title="Add New Contact">
            <IconButton
              onClick={() => setAddContactOpen(true)}
              sx={{ color: 'white', backgroundColor: 'rgba(255,255,255,0.15)', '&:hover': { backgroundColor: 'rgba(255,255,255,0.25)' } }}
              size={isMobile ? 'small' : 'medium'}
            >
              <Add />
            </IconButton>
          </Tooltip>
          <Tooltip title="Create Group">
            <IconButton
              onClick={() => setCreateGroupOpen(true)}
              sx={{ color: 'white', backgroundColor: 'rgba(255,255,255,0.15)', '&:hover': { backgroundColor: 'rgba(255,255,255,0.25)' } }}
              size={isMobile ? 'small' : 'medium'}
            >
              <GroupIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={mode === 'ai' ? 'Switch to Human Chat' : 'Switch to AI Assistant'}>
            <IconButton
              onClick={() => {
                setMode(mode === 'ai' ? 'human' : 'ai');
                setMessages([]);
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

    {mode === 'human' && (
      <Box sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: theme.palette.mode === 'dark' ? '#111B21' : 'white' }}>
        <Tabs
          value={currentTab}
          onChange={(e, val) => setCurrentTab(val)}
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': { color: whatsappGreen, fontWeight: 600 },
            '& .Mui-selected': { color: whatsappGreen },
            '& .MuiTabs-indicator': { backgroundColor: whatsappGreen },
          }}
        >
          <Tab label={`Contacts (${contacts.length})`} />
          <Tab label={`Groups (${groups.length})`} />
        </Tabs>
      </Box>
    )}

    <Box sx={{ flex: 1, overflowY: 'auto' }}>
      {mode === 'ai' ? (
        <ListItemButton
          selected={selectedChat?.name === 'Nexus AI Assistant'}
          onClick={() => handleContactClick(AI_ASSISTANT_CHAT)}
          sx={{
            py: 1.5, px: 2,
            backgroundColor: selectedChat?.name === 'Nexus AI Assistant' ? (theme.palette.mode === 'dark' ? '#2A3942' : '#F0F2F5') : 'transparent',
            '&:hover': { backgroundColor: theme.palette.mode === 'dark' ? '#2A3942' : '#F5F6F6' },
          }}
        >
          <ListItemAvatar>
            <Avatar sx={{ bgcolor: whatsappGreen, width: 50, height: 50 }}><SmartToy /></Avatar>
          </ListItemAvatar>
          <ListItemText primary={<Typography variant="subtitle1" fontWeight="600">Nexus AI Assistant</Typography>} secondary={<Typography variant="body2" color="text.secondary" noWrap>Your intelligent campus companion</Typography>} />
        </ListItemButton>
      ) : (
        <List disablePadding>
          {currentTab === 0 && teachers.length > 0 && (
            <>
              <Box sx={{ px: 2, py: 1, backgroundColor: 'rgba(18, 140, 126, 0.05)' }}>
                <Typography variant="caption" fontWeight="bold" color={whatsappGreen} sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>Course Teachers</Typography>
              </Box>
              {teachers.map((teacher) => (
                <ListItemButton
                  key={`teacher-${teacher.faculty_id}`}
                  onClick={() => {
                    chatAPI.createSession({ participant_ids: [teacher.user_id, user.user_id] })
                      .then(res => handleContactClick(normalizeConversation(res.data)));
                  }}
                  sx={{ py: 1.5, px: 2 }}
                >
                  <ListItemAvatar><Avatar sx={{ bgcolor: theme.palette.primary.main }}>{teacher.designation?.[0] || 'T'}</Avatar></ListItemAvatar>
                  <ListItemText primary={<Typography variant="subtitle1" fontWeight="600">{teacher.designation} (ID: {teacher.employee_code})</Typography>} secondary={<Typography variant="caption" color="primary">Click to start chat</Typography>} />
                </ListItemButton>
              ))}
              <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', my: 1 }} />
            </>
          )}
          {currentTab === 0
            ? contacts.filter(c => (c.name || '').toLowerCase().includes(searchQuery.toLowerCase())).map((contact) => (
                <ListItemButton
                  key={contact.id}
                  onClick={() => handleContactClick(contact)}
                  selected={selectedChat?.id === contact.id}
                  sx={{ py: 1.5, px: 2, backgroundColor: selectedChat?.id === contact.id ? (theme.palette.mode === 'dark' ? '#2A3942' : '#F0F2F5') : 'transparent', '&:hover': { backgroundColor: theme.palette.mode === 'dark' ? '#2A3942' : '#F5F6F6' } }}
                >
                  <ListItemAvatar>
                    <Badge overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} badgeContent={<Box sx={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid white', bgcolor: contact.status === 'online' ? '#25D366' : '#999' }} />}>
                      <Avatar sx={{ width: 50, height: 50 }}>{contact.name?.[0] || 'C'}</Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={<Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="subtitle1" fontWeight="600">{contact.name}</Typography><Typography variant="caption" color="text.secondary">{contact.lastTime}</Typography></Stack>}
                    secondary={<Stack><Typography variant="caption" color={whatsappGreen} fontWeight="500">{contact.role}</Typography><Typography variant="body2" color="text.secondary" noWrap>{contact.lastMessage}</Typography></Stack>}
                  />
                </ListItemButton>
              ))
            : groups.filter(g => (g.name || '').toLowerCase().includes(searchQuery.toLowerCase())).map((group) => (
                <ListItemButton
                  key={group.id}
                  onClick={() => handleGroupClick(group)}
                  selected={selectedChat?.id === group.id}
                  sx={{ py: 1.5, px: 2, backgroundColor: selectedChat?.id === group.id ? (theme.palette.mode === 'dark' ? '#2A3942' : '#F0F2F5') : 'transparent', '&:hover': { backgroundColor: theme.palette.mode === 'dark' ? '#2A3942' : '#F5F6F6' } }}
                >
                  <ListItemAvatar><Avatar sx={{ width: 50, height: 50, bgcolor: whatsappGreen, fontSize: 24 }}>{group.avatar}</Avatar></ListItemAvatar>
                  <ListItemText
                    primary={<Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="subtitle1" fontWeight="600">{group.name}</Typography><Typography variant="caption" color="text.secondary">{group.lastTime}</Typography></Stack>}
                    secondary={<Stack><Typography variant="caption" color="text.secondary">{group.members} members</Typography><Typography variant="body2" color="text.secondary" noWrap>{group.lastMessage}</Typography></Stack>}
                  />
                </ListItemButton>
              ))}
        </List>
      )}
    </Box>

    {mode === 'human' && currentTab === 1 && (
      <Box sx={{ p: 2 }}>
        <Button fullWidth variant="contained" startIcon={<Add />} onClick={() => setCreateGroupOpen(true)} sx={{ bgcolor: whatsappGreen, color: 'white', fontWeight: 600, borderRadius: '25px', py: 1.5, '&:hover': { bgcolor: whatsappDarkGreen } }}>Create New Group</Button>
      </Box>
    )}
  </Box>
);

const ChatWindow = ({
  selectedChat, isMobile, setSelectedChat, mode, chatBgColor, messages, 
  userBubbleColor, otherBubbleColor, isTyping, messagesEndRef, 
  handleFileAttach, fileInputRef, handleFileChange, attachedFile, 
  inputMessage, inputRef, setInputMessage, handleSendMessage, theme,
  handleClearChat
}) => {
  const [emojiAnchor, setEmojiAnchor] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const { showSnackbar } = useSnackbar();

  const handleEmojiClick = (emoji) => {
    setInputMessage(prev => prev + emoji);
    setEmojiAnchor(null);
    inputRef.current?.focus();
  };

  const handleMenuAction = (action) => {
    setMenuAnchor(null);
    if (action === 'clear') {
      handleClearChat();
      showSnackbar('Chat cleared locally', 'info');
    }
  };

  const EMOJI_LIST = ['😀', '😂', '😅', '😍', '🥰', '😎', '🤩', '😘', '😋', '😊', '😉', '😌', '🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😣', '😥', '😮', '🤐', '😯', '😪', '😫', '🥱', '😴', '😌', '😛', '😜', '😝', '🤤', '😒', '😓', '😔', '😕', '🙃', '🤑', '😲', '☹️', '🙁', '😖', '😞', '😟', '😤', '😢', '😭', '😦', '😧', '😨', '😩', '🤯', '😬', '😰', '😱', '🥵', '🥶', '😳', '🤪', '😵', '😡', '😠', '🤬', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '😇', '🥳', '🥺', '🤠', '🤡', '🤥', '🤫', '🤭', '🧐', '🤓', '😈', '👿', '👍', '👎', '👏', '🤝', '🙌', '🎉', '🎊', '🔥', '✨', '🎈', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '✅', '❌', '❓', '❕', '💯'];

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: chatBgColor }}>
      {selectedChat ? (
        <>
          <Box sx={{ background: `linear-gradient(135deg, ${whatsappGreen} 0%, ${whatsappDarkGreen} 100%)`, color: 'white', p: { xs: 1.5, md: 2 }, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Stack direction="row" spacing={{ xs: 1, md: 2 }} alignItems="center">
              {isMobile && <IconButton onClick={() => setSelectedChat(null)} sx={{ color: 'white', p: 0.5 }}><ArrowBack fontSize="small" /></IconButton>}
              <Avatar sx={{ width: { xs: 40, md: 45 }, height: { xs: 40, md: 45 }, bgcolor: 'rgba(255,255,255,0.2)' }}>{selectedChat.avatar || selectedChat.name?.[0] || 'C'}</Avatar>
              <Box><Typography variant={isMobile ? 'body1' : 'subtitle1'} fontWeight="600">{selectedChat.name}</Typography><Typography variant="caption">{mode === 'ai' ? 'Online • Always available' : (selectedChat.status === 'online' ? 'Online' : 'Offline')}</Typography></Box>
            </Stack>
            <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)} sx={{ color: 'white' }}><MoreVert /></IconButton>
            <MuiMenu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
              <MuiMenuItem onClick={() => handleMenuAction('clear')}>Clear Chat</MuiMenuItem>
            </MuiMenu>
          </Box>

          <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 1, md: 2 }, backgroundImage: theme.palette.mode === 'dark' ? 'none' : 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h100v100H0z\' fill=\'%23E5DDD5\' /%3E%3Cpath d=\'M25 25l10 10M75 25l-10 10M25 75l10-10M75 75l-10-10\' stroke=\'%23D1CBC1\' stroke-width=\'1\' /%3E%3C/svg%3E")' }}>
            <Stack spacing={1}>
              {messages.map((msg) => (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} style={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                  <Paper sx={{ maxWidth: { xs: '85%', md: '70%' }, px: { xs: 1.5, md: 2 }, py: { xs: 0.75, md: 1 }, bgcolor: msg.sender === 'user' ? userBubbleColor : otherBubbleColor, color: msg.sender === 'user' ? '#000' : 'text.primary', borderRadius: msg.sender === 'user' ? '12px 12px 0 12px' : '12px 12px 12px 0', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                    {msg.senderName && <Typography variant="caption" fontWeight="600" color={whatsappGreen}>{msg.senderName}</Typography>}
                    {msg.attachments && msg.attachments.length > 0 && msg.attachments.map((file, idx) => (
                      <Box key={idx} sx={{ mt: 0.5, mb: msg.text ? 1 : 0, p: 1, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AttachFile fontSize="small" />
                        <a href={file.file_url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline', fontSize: '0.85rem', wordBreak: 'break-all' }}>
                          {file.file_name || 'View Attachment'}
                        </a>
                      </Box>
                    ))}
                    {msg.text && <Typography variant={isMobile ? 'body2' : 'body1'} sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.text}</Typography>}
                    <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', mt: 0.5, opacity: 0.7 }}>{msg.timestamp}</Typography>
                  </Paper>
                </motion.div>
              ))}
              {isTyping && <Box sx={{ display: 'flex', gap: 0.5, p: 1 }}>{[0, 0.2, 0.4].map((d, i) => <Box key={i} component={motion.div} animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: d }} sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: whatsappGreen }} />)}</Box>}
              <div ref={messagesEndRef} />
            </Stack>
          </Box>

          <Box sx={{ p: { xs: 1.5, md: 2 }, backgroundColor: theme.palette.mode === 'dark' ? '#1E2428' : '#F0F2F5' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton onClick={(e) => setEmojiAnchor(e.currentTarget)} size={isMobile ? 'small' : 'medium'}><EmojiEmotions /></IconButton>
              <Popover 
                open={Boolean(emojiAnchor)} 
                anchorEl={emojiAnchor} 
                onClose={() => setEmojiAnchor(null)} 
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }} 
                transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
              >
                <Box sx={{ width: 300, height: 200, p: 1, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {EMOJI_LIST.map((emoji, i) => (
                    <IconButton key={i} size="small" onClick={() => handleEmojiClick(emoji)}>{emoji}</IconButton>
                  ))}
                </Box>
              </Popover>
              <IconButton onClick={handleFileAttach} size={isMobile ? 'small' : 'medium'}><AttachFile /></IconButton>
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
              <TextField
                fullWidth multiline maxRows={3} placeholder={attachedFile ? `Attached: ${attachedFile.name}` : "Type a message"} value={inputMessage} inputRef={inputRef}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '25px', backgroundColor: theme.palette.mode === 'dark' ? '#2A3942' : '#FFFFFF' } }}
              />
              <IconButton onClick={handleSendMessage} disabled={!inputMessage.trim() && !attachedFile} sx={{ bgcolor: whatsappGreen, color: 'white', '&:hover': { bgcolor: whatsappDarkGreen } }}><Send /></IconButton>
            </Stack>
          </Box>
        </>
      ) : (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <Avatar sx={{ width: 100, height: 100, bgcolor: whatsappGreen }}><SmartToy sx={{ fontSize: 60 }} /></Avatar>
          <Typography variant="h5" fontWeight="600" color="text.secondary">Nexus Chat Portal</Typography>
          <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ maxWidth: 400 }}>{mode === 'ai' ? 'Start a conversation with Nexus AI' : 'Select a contact or group to start chatting'}</Typography>
        </Box>
      )}
    </Box>
  );
};

const CreateGroupDialog = ({ open, onClose, name, setName, contacts, selectedMembers, onToggle, onCreate }) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle>Create New Group</DialogTitle>
    <DialogContent>
      <Stack spacing={3} sx={{ mt: 1 }}>
        <TextField fullWidth label="Group Name" value={name} onChange={(e) => setName(e.target.value)} />
        <List sx={{ maxHeight: 300, overflowY: 'auto' }}>
          {contacts.map((c) => (
            <ListItem key={c.id} button onClick={() => onToggle(c.id)} secondaryAction={selectedMembers.includes(c.id) ? <Check color="success" /> : null}>
              <ListItemAvatar><Avatar>{c.name?.[0]}</Avatar></ListItemAvatar>
              <ListItemText primary={c.name} secondary={c.role} />
            </ListItem>
          ))}
        </List>
      </Stack>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancel</Button>
      <Button variant="contained" onClick={onCreate} disabled={!name.trim() || selectedMembers.length < 1} sx={{ bgcolor: whatsappGreen }}>Create</Button>
    </DialogActions>
  </Dialog>
);

const AddContactDialog = ({ open, onClose, email, setEmail, onAdd }) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle>Add New Contact</DialogTitle>
    <DialogContent>
      <TextField fullWidth label="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} sx={{ mt: 1 }} />
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancel</Button>
      <Button variant="contained" onClick={onAdd} disabled={!email.trim()} sx={{ bgcolor: whatsappGreen }}>Add</Button>
    </DialogActions>
  </Dialog>
);

const ChatPortal = () => {
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const socketRef = useRef(null);

  const [mode, setMode] = useState('ai');
  const [currentTab, setCurrentTab] = useState(0);
  const [selectedChat, setSelectedChat] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const fileInputRef = useRef(null);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [addContactEmail, setAddContactEmail] = useState('');
  const [teachers, setTeachers] = useState([]);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [aiSessionId, setAiSessionId] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);

  const userBubbleColor = '#DCF8C6';
  const otherBubbleColor = theme.palette.mode === 'dark' ? '#2A2A2A' : '#FFFFFF';
  const chatBgColor = theme.palette.mode === 'dark' ? '#0D1418' : '#E5DDD5';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const loadHumanData = useCallback(async () => {
    try {
      const [contactsRes, groupsRes, teachersRes] = await Promise.allSettled([
        chatAPI.getConversations(),
        chatAPI.getGroups(),
        user?.role === 'student' ? sisAPI.getMyTeachers() : Promise.resolve({ data: [] }),
      ]);
      if (contactsRes.status === 'fulfilled') {
        const rows = contactsRes.value.data?.conversations || contactsRes.value.data || [];
        setContacts(rows.map((item, index) => normalizeConversation(item, index)));
      }
      if (groupsRes.status === 'fulfilled') {
        const rows = groupsRes.value.data?.groups || groupsRes.value.data || [];
        setGroups(rows.map((item, index) => normalizeGroup(item, index)));
      }
      if (teachersRes.status === 'fulfilled') setTeachers(teachersRes.value.data || []);
    } catch (e) { console.error(e); }
  }, [user?.role]);

  const loadConversationMessages = useCallback(async (sessionId) => {
    try {
      const res = await chatAPI.getMessages(sessionId);
      const rows = res.data?.messages || res.data || [];
      setMessages(rows.map((item, index) => ({
        id: item.message_id || item.id || index,
        text: item.content || '',
        sender: item.sender_id === user?.user_id ? 'user' : 'other',
        senderName: item.sender_name,
        attachments: item.attachments || [],
        timestamp: item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now',
      })));
    } catch (e) { setMessages([]); }
  }, [user?.user_id]);

  const loadAiHistory = useCallback(async () => {
    try {
      const res = await aiAPI.getHistory();
      const history = res.data?.messages || res.data || [];
      setMessages(history.map((item, index) => ({
        id: index,
        text: item.content || '',
        sender: item.role === 'assistant' ? 'ai' : 'user',
        attachments: item.attachments || [],
        timestamp: item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now',
      })));
    } catch (e) { console.error(e); }
  }, []);

  // ── WebSocket Logic ──
  useEffect(() => {
    if (mode === 'human' && selectedChat?.session_id && selectedChat.id !== 'ai-assistant') {
      // Close existing socket
      if (socketRef.current) {
        socketRef.current.close();
      }

      try {
        const ws = chatAPI.createWebSocket(selectedChat.session_id);
        socketRef.current = ws;

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          setMessages(prev => {
            // Avoid duplicates
            if (prev.find(m => m.id === data.message_id)) return prev;
            return [...prev, {
              id: data.message_id,
              text: data.content,
              sender: data.sender_id === user?.user_id ? 'user' : 'other',
              senderName: data.sender_name,
              attachments: data.attachments || [],
              timestamp: new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }];
          });
        };

        ws.onerror = () => {
          console.error('WebSocket Error');
          showSnackbar('Real-time connection failed. Messages may be delayed.', 'warning');
        };

        ws.onclose = () => {
          console.log('WebSocket Closed');
        };
      } catch (err) {
        console.error('Failed to create WebSocket', err);
      }
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [selectedChat?.session_id, mode, user?.user_id, showSnackbar, selectedChat?.id]);

  useEffect(() => {
    if (mode === 'human') loadHumanData();
    else {
      setSelectedChat(AI_ASSISTANT_CHAT);
      loadAiHistory();
    }
  }, [mode, loadHumanData, loadAiHistory]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() && !attachedFile) return;
    const text = inputMessage;
    const fileToUpload = attachedFile;
    setInputMessage('');
    setAttachedFile(null);

    let attachments = [];
    if (fileToUpload) {
      try {
        const formData = new FormData();
        formData.append('file', fileToUpload);
        const uploadRes = await chatAPI.uploadFile(formData);
        attachments.push({
          file_url: uploadRes.data.file_url,
          file_type: uploadRes.data.file_type,
          file_name: uploadRes.data.file_name
        });
      } catch (err) {
        showSnackbar('Failed to upload file', 'error');
        return;
      }
    }

    if (mode === 'ai') {
      setIsTyping(true);
      try {
        // Optimistically add user message
        const userMsgId = Date.now();
        setMessages(prev => [...prev, { 
          id: userMsgId, 
          text: text, 
          sender: 'user', 
          attachments: attachments,
          timestamp: 'Now' 
        }]);

        const res = await aiAPI.chat(text, aiSessionId, attachments);
        if (res.data?.session_id) setAiSessionId(res.data.session_id);
        setMessages(prev => [...prev, { id: Date.now() + 1, text: res.data.response, sender: 'ai', timestamp: 'Now' }]);
      } catch (err) {
        showSnackbar('AI Assistant is currently unavailable', 'error');
      } finally { setIsTyping(false); }
    } else {
      const sid = selectedChat?.session_id;
      if (!sid) return;

      // If WebSocket is active, send through it
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          content: text,
          message_type: attachments.length > 0 ? 'file' : 'text',
          attachments: attachments
        }));
      } else {
        // Fallback to REST
        try {
          await chatAPI.sendMessage(sid, { 
            content: text,
            message_type: attachments.length > 0 ? 'file' : 'text',
            attachments: attachments
          });
          loadConversationMessages(sid);
        } catch (err) {
          showSnackbar('Failed to send message', 'error');
        }
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAttachedFile(file);
      showSnackbar(`Attached: ${file.name}`, 'info');
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || selectedMembers.length < 1) return;
    try {
      await chatAPI.createGroup({
        name: newGroupName,
        participant_ids: selectedMembers
      });
      showSnackbar('Group created successfully', 'success');
      setCreateGroupOpen(false);
      setNewGroupName('');
      setSelectedMembers([]);
      loadHumanData();
    } catch (err) {
      showSnackbar('Failed to create group', 'error');
    }
  };

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', overflow: 'hidden' }}>
      {(!isMobile || !selectedChat || selectedChat.id === 'ai-assistant' && mode === 'human') && (
        <ChatList 
          theme={theme} isMobile={isMobile} navigate={navigate} mode={mode} setMode={setMode}
          setMessages={setMessages} setAddContactOpen={setAddContactOpen} setCreateGroupOpen={setCreateGroupOpen}
          searchQuery={searchQuery} setSearchQuery={setSearchQuery} currentTab={currentTab} setCurrentTab={setCurrentTab}
          contacts={contacts} groups={groups} teachers={teachers} selectedChat={selectedChat}
          handleContactClick={(c) => { setSelectedChat(c); if(c.session_id) loadConversationMessages(c.session_id); }}
          handleGroupClick={(g) => { setSelectedChat(normalizeGroup(g)); if(g.session_id) loadConversationMessages(g.session_id); }} user={user}
        />
      )}
      {(!isMobile || selectedChat && (selectedChat.id !== 'ai-assistant' || mode === 'ai')) && (
        <ChatWindow 
          selectedChat={selectedChat} isMobile={isMobile} setSelectedChat={setSelectedChat}
          mode={mode} chatBgColor={chatBgColor} messages={messages} userBubbleColor={userBubbleColor}
          otherBubbleColor={otherBubbleColor} isTyping={isTyping} messagesEndRef={messagesEndRef}
          handleFileAttach={() => fileInputRef.current?.click()} fileInputRef={fileInputRef}
          handleFileChange={handleFileChange} attachedFile={attachedFile} inputMessage={inputMessage}
          inputRef={inputRef} setInputMessage={setInputMessage} handleSendMessage={handleSendMessage} theme={theme}
          handleClearChat={() => setMessages([])}
        />
      )}
      <CreateGroupDialog 
        open={createGroupOpen} onClose={() => setCreateGroupOpen(false)} name={newGroupName} setName={setNewGroupName}
        contacts={contacts} selectedMembers={selectedMembers} onToggle={(id) => setSelectedMembers(prev => prev.includes(id) ? prev.filter(x => x!==id) : [...prev, id])}
        onCreate={handleCreateGroup}
      />
      <AddContactDialog 
        open={addContactOpen} onClose={() => setAddContactOpen(false)} email={addContactEmail} setEmail={setAddContactEmail}
        onAdd={() => chatAPI.addByEmail(addContactEmail).then(() => { loadHumanData(); setAddContactOpen(false); setAddContactEmail(''); showSnackbar('Contact added', 'success'); })}
      />
    </Box>
  );
};

export default ChatPortal;
