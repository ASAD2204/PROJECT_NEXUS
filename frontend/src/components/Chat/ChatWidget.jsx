/**
 * ChatWidget Component
 * 
 * Floating chat widget providing AI assistant support.
 * 
 * Features:
 * - Floating button with AI icon
 * - Expandable chat window
 * - AI message history with timestamps
 * - Typing indicators
 * - AI-powered responses with Markdown/Table rendering
 * - Smooth animations
 * - Minimizable/expandable interface
 * 
 * @component
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Stack,
  Popover,
  useTheme,
  Chip,
  Tooltip,
  Avatar,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Close,
  OpenInFull,
  Send,
  EmojiEmotions,
  SmartToy,
  AutoAwesome,
  LibraryBooks,
  Assignment,
  Security,
  LocalLibrary,
  Work,
  School,
  Person,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { aiAPI } from '../../api/ai';
import MarkdownRenderer from '../Common/MarkdownRenderer';

const ChatWidget = ({ open, onClose, greetingMessage }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [aiSessionId, setAiSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const chatInputRef = useRef(null);
  const [emojiAnchor, setEmojiAnchor] = useState(null);

  const EMOJI_LIST = ['😀', '😂', '😅', '😍', '🥰', '😎', '🤩', '😘', '😋', '😊', '😉', '😌', '🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😣', '😥', '😮', '🤐', '😯', '😪', '😫', '🥱', '😴', '😌', '😛', '😜', '😝', '🤤', '😒', '😓', '😔', '😕', '🙃', '🤑', '😲', '☹️', '🙁', '😖', '😞', '😟', '😤', '😢', '😭', '😦', '😧', '😨', '😩', '🤯', '😬', '😰', '😱', '🥵', '🥶', '😳', '🤪', '😵', '😡', '😠', '🤬', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '😇', '🥳', '🥺', '🤠', '🤡', '🤥', '🤫', '🤭', '🧐', '🤓', '😈', '👿', '👍', '👎', '👏', '🤝', '🙌', '🎉', '🎊', '🔥', '✨', '🎈', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '✅', '❌', '❓', '❕', '💯'];

  // --- Role-Based Theme Logic ---
  const getRoleTheme = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin': return { primary: '#1E3A8A', secondary: '#1e40af', bubble: theme.palette.mode === 'dark' ? '#1a237e' : '#e3f2fd', icon: <Security />, label: 'Admin Assistant' };
      case 'faculty': case 'teacher': return { primary: '#4C1D95', secondary: '#5b21b6', bubble: theme.palette.mode === 'dark' ? '#311b92' : '#f3e5f5', icon: <School />, label: 'Faculty Co-Pilot' };
      case 'alumni': return { primary: '#92400E', secondary: '#b45309', bubble: theme.palette.mode === 'dark' ? '#3e2723' : '#fff8e1', icon: <Work />, label: 'Career Strategist' };
      case 'librarian': return { primary: '#065F46', secondary: '#047857', bubble: theme.palette.mode === 'dark' ? '#004d40' : '#e0f2f1', icon: <LocalLibrary />, label: 'Librarian Nexus' };
      default: return { primary: '#128C7E', secondary: '#075E54', bubble: theme.palette.mode === 'dark' ? '#1b5e20' : '#e8f5e9', icon: <Person />, label: 'Nexus AI Assistant' };
    }
  };

  const roleTheme = getRoleTheme(user?.role);
  const whatsappGreen = roleTheme.primary;
  const whatsappDarkGreen = roleTheme.secondary;
  const userBubbleColor = roleTheme.bubble;
  const RoleIcon = roleTheme.icon;
  const roleLabel = roleTheme.label;

  const handleEmojiClick = (emoji) => {
    setChatInput((prev) => prev + emoji);
    setEmojiAnchor(null);
    chatInputRef.current?.focus();
  };

  const loadAiHistory = useCallback(async () => {
    try {
      const res = await aiAPI.getHistory();
      const history = res.data?.messages || res.data || [];
      setMessages(history.map((item, index) => ({
        id: index,
        text: item.content || '',
        sender: item.role === 'assistant' ? 'ai' : 'user',
        timestamp: 'Now',
      })));
    } catch (e) { console.error(e); }
  }, []);

  const handleSendMessage = async (textOverride = null) => {
    const messageText = textOverride || chatInput.trim();
    if (!messageText) return;

    if (!textOverride) setChatInput('');

    const tempId = Date.now();
    setMessages(prev => [...prev, { id: tempId, sender: 'user', text: messageText, timestamp: 'Now' }]);
    setIsTyping(true);
    
    try {
      const res = await aiAPI.chat(messageText, aiSessionId || undefined);
      const aiText = res.data?.response;
      if (res.data?.session_id) setAiSessionId(res.data.session_id);
      setMessages((prev) => [...prev, { id: Date.now() + 1, sender: 'ai', text: aiText, timestamp: 'Now' }]);
    } catch (err) {
      showSnackbar('AI Assistant is currently unavailable', 'error');
    } finally {
      setIsTyping(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (open) {
      loadAiHistory();
    }
  }, [open, loadAiHistory]);

  useEffect(() => {
    if (open) {
      chatInputRef.current?.focus();
    }
  }, [open]);

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
          bottom: { xs: 0, sm: 24 },
          right: { xs: 0, sm: 24 },
          left: { xs: 0, sm: 'auto' },
          top: { xs: 0, sm: 'auto' },
          width: { xs: '100%', sm: 400, md: 420 },
          height: { xs: '100%', sm: 600 },
          maxHeight: { xs: '100vh', sm: '80vh' },
          display: 'flex',
          flexDirection: 'column',
          borderRadius: { xs: 0, sm: '16px' },
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
            background: `linear-gradient(135deg, ${whatsappGreen} 0%, ${whatsappDarkGreen} 100%)`,
            color: 'white',
            p: { xs: 1.5, sm: 2 },
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 32, height: 32, border: '1px solid rgba(255,255,255,0.3)' }}>{RoleIcon}</Avatar>
              <Typography variant={{ xs: 'body1', sm: 'subtitle1' }} fontWeight="bold">
                {roleLabel}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.5}>
              <IconButton size="small" onClick={() => navigate('/chat')} sx={{ color: 'white' }}>
                <OpenInFull fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={onClose} sx={{ color: 'white' }}>
                <Close fontSize="small" />
              </IconButton>
            </Stack>
          </Box>
        </Box>

        {/* AI Chat View */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            p: { xs: 1.5, sm: 2 },
            backgroundColor: theme.palette.mode === 'dark' ? '#0A0A0A' : '#E5DDD5',
            backgroundImage: theme.palette.mode === 'dark'
              ? 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)'
              : 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h20v20H0z\' fill=\'%23D9D9D9\' fill-opacity=\'0.2\'/%3E%3C/svg%3E")',
            backgroundSize: '20px 20px',
          }}
        >
          <Stack spacing={1.5}>
            {messages.length === 0 && !isTyping && (
              <Box
                sx={{
                  px: 2,
                  py: 1.5,
                  borderRadius: 2,
                  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.6)',
                  color: 'text.secondary',
                }}
              >
                <Typography variant="body2">
                  {greetingMessage || 'Hello! I am Nexus AI. How can I help you today?'}
                </Typography>
              </Box>
            )}
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
                        ? userBubbleColor
                        : theme.palette.mode === 'dark' ? '#2A2F32' : '#FFFFFF',
                      color: theme.palette.mode === 'dark' && msg.sender !== 'user' ? 'white' : 'black',
                      px: 2,
                      py: 1,
                      borderRadius: msg.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    }}
                  >
                    <MarkdownRenderer text={msg.text} />
                    <Typography variant="caption" sx={{ opacity: 0.6, fontSize: '0.7rem', display: 'block', mt: 0.5, textAlign: 'right' }}>
                      {msg.timestamp}
                    </Typography>
                  </Box>
                </Box>
              </motion.div>
            ))}
            {isTyping && (
              <Box sx={{ display: 'flex', gap: 0.5, px: 2, py: 1 }}>
                <Box component={motion.div} animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: whatsappDarkGreen }} />
                <Box component={motion.div} animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: whatsappDarkGreen }} />
                <Box component={motion.div} animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: whatsappDarkGreen }} />
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
            <IconButton size="small" sx={{ color: '#FFD700' }} onClick={(e) => setEmojiAnchor(e.currentTarget)}>
              <EmojiEmotions fontSize="small" />
            </IconButton>
            <Popover
              open={Boolean(emojiAnchor)}
              anchorEl={emojiAnchor}
              onClose={() => setEmojiAnchor(null)}
              anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
              transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
              <Box sx={{ width: 280, height: 200, p: 1, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {EMOJI_LIST.map((emoji, i) => (
                  <IconButton key={i} size="small" onClick={() => handleEmojiClick(emoji)}>{emoji}</IconButton>
                ))}
              </Box>
            </Popover>
            <TextField
              fullWidth
              size="small"
              placeholder="Ask me anything..."
              value={chatInput}
              inputRef={chatInputRef}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              variant="standard"
              InputProps={{ disableUnderline: true }}
              sx={{ '& .MuiInputBase-input': { fontSize: '0.9rem', py: 0.5 } }}
            />
            <IconButton
              size="small"
              onClick={() => handleSendMessage()}
              disabled={!chatInput.trim()}
              sx={{
                backgroundColor: chatInput.trim() ? whatsappGreen : 'transparent',
                color: chatInput.trim() ? 'white' : 'text.disabled',
                width: 36,
                height: 36,
                '&:hover': { backgroundColor: chatInput.trim() ? whatsappDarkGreen : 'transparent' },
                transition: 'all 0.2s',
              }}
            >
              <Send fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Paper>
    </AnimatePresence>
  );
};

export default ChatWidget;
