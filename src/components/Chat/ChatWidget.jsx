import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Badge,
  Divider,
  Tab,
  Tabs,
  Stack,
  Chip,
  InputAdornment,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import {
  Close,
  OpenInFull,
  Send,
  Mic,
  EmojiEmotions,
  Search,
  SmartToy,
  Person,
  Groups,
  Circle,
  AttachFile,
  MoreVert,
  Add,
  Check,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const ChatWidget = ({ open, onClose, greetingMessage }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [mode, setMode] = useState('ai'); // 'ai' or 'human'
  const [view, setView] = useState('chat'); // 'contacts', 'groups', 'chat'
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [groups, setGroups] = useState([
    { id: 1, name: 'BSIT Batch 2024', members: 48, avatar: 'B', lastMsg: 'Quiz on Friday', time: '10m' },
    { id: 2, name: 'Database Project', members: 5, avatar: 'D', lastMsg: 'Schema finalized', time: '1h' },
    { id: 3, name: 'Study Group A', members: 8, avatar: 'S', lastMsg: 'Tomorrow at library', time: '4h' },
  ]);
  const messagesEndRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: greetingMessage || 'How can I help you today?',
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const contacts = [
    { id: 1, name: 'Ayesha Khan', role: 'Class Rep', status: 'online', avatar: 'A', lastMsg: 'Can you share notes?', time: '5m' },
    { id: 2, name: 'Dr. Sarah Ahmed', role: 'Advisor', status: 'online', avatar: 'S', lastMsg: 'Meeting at 3 PM', time: '1h' },
    { id: 3, name: 'Ali Hassan', role: 'Peer', status: 'away', avatar: 'A', lastMsg: 'Thanks!', time: '2h' },
    { id: 4, name: 'Maria Khan', role: 'Study Group', status: 'online', avatar: 'M', lastMsg: 'Assignment due tomorrow', time: '3h' },
  ];

  const handleCreateGroup = () => {
    if (!newGroupName.trim() || selectedMembers.length < 2) return;

    const newGroup = {
      id: groups.length + 1,
      name: newGroupName,
      members: selectedMembers.length + 1,
      avatar: newGroupName[0].toUpperCase(),
      lastMsg: 'Group created',
      time: 'Now',
    };

    setGroups((prev) => [...prev, newGroup]);
    setCreateGroupOpen(false);
    setNewGroupName('');
    setNewGroupDescription('');
    setSelectedMembers([]);
    setView('groups');
  };

  const toggleMemberSelection = (contactId) => {
    setSelectedMembers((prev) =>
      prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId]
    );
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;

    const newMessage = {
      id: Date.now(),
      sender: 'user',
      text: chatInput,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, newMessage]);
    setChatInput('');

    if (mode === 'ai') {
      setIsTyping(true);
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: 'ai',
            text: 'I understand your query. Let me help you with that!',
            timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        setIsTyping(false);
      }, 1000);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!open) return null;

  return (
    <AnimatePresence>
      <Paper
        component={motion.div}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{
          type: 'spring',
          stiffness: 260,
          damping: 20,
        }}
        elevation={12}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 380,
          height: 600,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          overflow: 'hidden',
          transformOrigin: 'bottom right',
          boxShadow: theme.palette.mode === 'dark'
            ? '0 20px 60px rgba(0,0,0,0.8)'
            : '0 20px 60px rgba(0,0,0,0.2)',
          zIndex: 1400,
        }}
      >
        {/* Header */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #128C7E 0%, #075E54 100%)',
            color: 'white',
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1" fontWeight="bold">
              Nexus Chat
            </Typography>
            <Stack direction="row" spacing={0.5}>
              <IconButton size="small" onClick={() => navigate('/chat')} sx={{ color: 'white' }}>
                <OpenInFull fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={onClose} sx={{ color: 'white' }}>
                <Close fontSize="small" />
              </IconButton>
            </Stack>
          </Box>

          {/* Mode Toggle */}
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              backgroundColor: 'rgba(0,0,0,0.2)',
              borderRadius: '12px',
              p: 0.5,
            }}
          >
            <Box
              onClick={() => { setMode('ai'); setView('chat'); }}
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                py: 0.75,
                px: 1.5,
                borderRadius: '10px',
                backgroundColor: mode === 'ai' ? 'rgba(255,255,255,0.25)' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <SmartToy fontSize="small" />
              <Typography variant="caption" fontWeight={600}>AI Assistant</Typography>
            </Box>
            <Box
              onClick={() => { setMode('human'); setView('contacts'); }}
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                py: 0.75,
                px: 1.5,
                borderRadius: '10px',
                backgroundColor: mode === 'human' ? 'rgba(255,255,255,0.25)' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <Person fontSize="small" />
              <Typography variant="caption" fontWeight={600}>Contacts</Typography>
            </Box>
          </Box>
        </Box>

        {/* Content Area */}
        {mode === 'ai' ? (
          // AI Chat View
          <>
            <Box
              sx={{
                flex: 1,
                overflowY: 'auto',
                p: 2,
                backgroundColor: theme.palette.mode === 'dark' ? '#0A0A0A' : '#E5DDD5',
                backgroundImage: theme.palette.mode === 'dark'
                  ? 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)'
                  : 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h20v20H0z\' fill=\'%23D9D9D9\' fill-opacity=\'0.2\'/%3E%3C/svg%3E")',
                backgroundSize: '20px 20px',
              }}
            >
              <Stack spacing={1.5}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ x: msg.sender === 'user' ? 20 : -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <Box
                        sx={{
                          maxWidth: '75%',
                          background: msg.sender === 'user'
                            ? '#DCF8C6'
                            : theme.palette.mode === 'dark' ? '#2A2F32' : '#FFFFFF',
                          color: theme.palette.mode === 'dark' && msg.sender !== 'user' ? 'white' : 'black',
                          px: 2,
                          py: 1,
                          borderRadius: msg.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                        }}
                      >
                        <Typography variant="body2" sx={{ fontSize: '0.9rem', wordBreak: 'break-word' }}>
                          {msg.text}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.6, fontSize: '0.7rem', display: 'block', mt: 0.5, textAlign: 'right' }}>
                          {msg.timestamp}
                        </Typography>
                      </Box>
                    </Box>
                  </motion.div>
                ))}
                {isTyping && (
                  <Box sx={{ display: 'flex', gap: 0.5, px: 2, py: 1 }}>
                    <Box component={motion.div} animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#075E54' }} />
                    <Box component={motion.div} animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#075E54' }} />
                    <Box component={motion.div} animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#075E54' }} />
                  </Box>
                )}
                <div ref={messagesEndRef} />
              </Stack>
            </Box>

            {/* AI Input */}
            <Box
              sx={{
                p: 1.5,
                backgroundColor: theme.palette.mode === 'dark' ? '#1E1E1E' : '#F0F0F0',
                borderTop: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  gap: 1,
                  alignItems: 'center',
                  backgroundColor: 'background.paper',
                  borderRadius: '24px',
                  px: 2,
                  py: 0.75,
                }}
              >
                <IconButton size="small" sx={{ color: '#FFD700' }}>
                  <EmojiEmotions fontSize="small" />
                </IconButton>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Type a message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  variant="standard"
                  InputProps={{ disableUnderline: true }}
                  sx={{ '& .MuiInputBase-input': { fontSize: '0.9rem', py: 0.5 } }}
                />
                {chatInput.trim() ? (
                  <IconButton
                    size="small"
                    onClick={handleSendMessage}
                    sx={{
                      backgroundColor: '#128C7E',
                      color: 'white',
                      width: 36,
                      height: 36,
                      '&:hover': { backgroundColor: '#0F7A6F' },
                    }}
                  >
                    <Send fontSize="small" />
                  </IconButton>
                ) : (
                  <IconButton size="small" sx={{ color: 'text.secondary' }}>
                    <Mic fontSize="small" />
                  </IconButton>
                )}
              </Box>
            </Box>
          </>
        ) : (
          // Human Chat View
          <>
            {view === 'contacts' || view === 'groups' ? (
              <>
                {/* Tabs */}
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <Tabs value={view === 'contacts' ? 0 : 1} onChange={(e, v) => setView(v === 0 ? 'contacts' : 'groups')}>
                    <Tab label="Contacts" sx={{ flex: 1 }} />
                    <Tab label="Groups" sx={{ flex: 1 }} />
                  </Tabs>
                </Box>

                {/* Search */}
                <Box sx={{ p: 2, backgroundColor: theme.palette.mode === 'dark' ? '#1E1E1E' : '#F0F0F0' }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder={`Search ${view}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'background.paper',
                        borderRadius: '12px',
                      },
                    }}
                  />
                </Box>

                {/* List */}
                <List sx={{ flex: 1, overflowY: 'auto', py: 0 }}>
                  {(view === 'contacts' ? filteredContacts : filteredGroups).map((item) => (
                    <React.Fragment key={item.id}>
                      <ListItemButton
                        onClick={() => {
                          setSelectedContact(item);
                          setView('chat');
                          setMessages([{
                            id: 1,
                            sender: 'other',
                            text: item.lastMsg,
                            timestamp: item.time,
                          }]);
                        }}
                        sx={{ py: 1.5 }}
                      >
                        <ListItemAvatar>
                          <Badge
                            overlap="circular"
                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                            badgeContent={
                              view === 'contacts' && item.status === 'online' ? (
                                <Circle sx={{ fontSize: 10, color: '#25D366' }} />
                              ) : null
                            }
                          >
                            <Avatar sx={{ bgcolor: '#128C7E', width: 48, height: 48 }}>
                              {view === 'contacts' ? item.avatar : <Groups />}
                            </Avatar>
                          </Badge>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography variant="body2" fontWeight={600}>
                              {item.name}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {item.lastMsg}
                            </Typography>
                          }
                        />
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            {item.time}
                          </Typography>
                          {view === 'groups' && (
                            <Chip label={`${item.members} members`} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                          )}
                        </Box>
                      </ListItemButton>
                      <Divider variant="inset" component="li" />
                    </React.Fragment>
                  ))}
                </List>

                {/* Create Group Button */}
                {view === 'groups' && (
                  <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<Add />}
                      onClick={() => setCreateGroupOpen(true)}
                      sx={{
                        bgcolor: '#128C7E',
                        color: 'white',
                        fontWeight: 600,
                        borderRadius: '20px',
                        py: 1,
                        textTransform: 'none',
                        '&:hover': {
                          bgcolor: '#0F7A6F',
                        },
                      }}
                    >
                      Create New Group
                    </Button>
                  </Box>
                )}
              </>
            ) : (
              // Individual Chat View
              <>
                {/* Chat Header */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: 1.5,
                    backgroundColor: theme.palette.mode === 'dark' ? '#1E1E1E' : '#F0F0F0',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <IconButton size="small" onClick={() => setView('contacts')}>
                    <Close fontSize="small" />
                  </IconButton>
                  <Avatar sx={{ bgcolor: '#128C7E', width: 40, height: 40 }}>
                    {selectedContact?.avatar}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={600}>
                      {selectedContact?.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {selectedContact?.status === 'online' ? 'online' : 'offline'}
                    </Typography>
                  </Box>
                  <IconButton size="small">
                    <MoreVert fontSize="small" />
                  </IconButton>
                </Box>

                {/* Messages */}
                <Box
                  sx={{
                    flex: 1,
                    overflowY: 'auto',
                    p: 2,
                    backgroundColor: theme.palette.mode === 'dark' ? '#0A0A0A' : '#E5DDD5',
                  }}
                >
                  <Stack spacing={1.5}>
                    {messages.map((msg) => (
                      <Box
                        key={msg.id}
                        sx={{
                          display: 'flex',
                          justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <Box
                          sx={{
                            maxWidth: '75%',
                            background: msg.sender === 'user' ? '#DCF8C6' : '#FFFFFF',
                            px: 2,
                            py: 1,
                            borderRadius: msg.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                          }}
                        >
                          <Typography variant="body2">{msg.text}</Typography>
                          <Typography variant="caption" sx={{ opacity: 0.6, fontSize: '0.7rem', textAlign: 'right', display: 'block', mt: 0.5 }}>
                            {msg.timestamp}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                    <div ref={messagesEndRef} />
                  </Stack>
                </Box>

                {/* Input */}
                <Box
                  sx={{
                    p: 1.5,
                    backgroundColor: theme.palette.mode === 'dark' ? '#1E1E1E' : '#F0F0F0',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 1,
                      alignItems: 'center',
                      backgroundColor: 'background.paper',
                      borderRadius: '24px',
                      px: 2,
                      py: 0.75,
                    }}
                  >
                    <IconButton size="small" sx={{ color: '#FFD700' }}>
                      <EmojiEmotions fontSize="small" />
                    </IconButton>
                    <IconButton size="small" sx={{ color: 'text.secondary' }}>
                      <AttachFile fontSize="small" />
                    </IconButton>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Type a message..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      variant="standard"
                      InputProps={{ disableUnderline: true }}
                      sx={{ '& .MuiInputBase-input': { fontSize: '0.9rem', py: 0.5 } }}
                    />
                    {chatInput.trim() ? (
                      <IconButton
                        size="small"
                        onClick={handleSendMessage}
                        sx={{
                          backgroundColor: '#128C7E',
                          color: 'white',
                          width: 36,
                          height: 36,
                          '&:hover': { backgroundColor: '#0F7A6F' },
                        }}
                      >
                        <Send fontSize="small" />
                      </IconButton>
                    ) : (
                      <IconButton size="small" sx={{ color: 'text.secondary' }}>
                        <Mic fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </Box>
              </>
            )}
          </>
        )}
      </Paper>

      {/* Create Group Dialog */}
      <Dialog open={createGroupOpen} onClose={() => setCreateGroupOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold">
            Create New Group
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Group Name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Enter group name"
              size="small"
            />
            <TextField
              fullWidth
              label="Description (Optional)"
              value={newGroupDescription}
              onChange={(e) => setNewGroupDescription(e.target.value)}
              placeholder="What's this group about?"
              multiline
              rows={2}
              size="small"
            />
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Add Members (Min. 2)
              </Typography>
              <List sx={{ maxHeight: 200, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                {contacts.map((contact) => (
                  <ListItem
                    key={contact.id}
                    button
                    onClick={() => toggleMemberSelection(contact.id)}
                    dense
                    secondaryAction={
                      selectedMembers.includes(contact.id) ? (
                        <Check color="success" fontSize="small" />
                      ) : null
                    }
                    sx={{
                      bgcolor: selectedMembers.includes(contact.id)
                        ? 'rgba(18, 140, 126, 0.1)'
                        : 'transparent',
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ width: 32, height: 32, fontSize: '0.9rem' }}>{contact.name[0]}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={<Typography variant="body2">{contact.name}</Typography>}
                      secondary={<Typography variant="caption">{contact.role}</Typography>}
                    />
                  </ListItem>
                ))}
              </List>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
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
              bgcolor: '#128C7E',
              '&:hover': { bgcolor: '#0F7A6F' },
            }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </AnimatePresence>
  );
};

export default ChatWidget;
