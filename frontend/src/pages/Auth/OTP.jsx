import React, { useState, useRef, useEffect } from 'react';
import { Box, TextField, Button, Typography, Alert, Paper, IconButton, Stack, Avatar } from '@mui/material';
import { LockReset, ArrowBack, SmartToy, Send } from '@mui/icons-material';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import PageTransition from '../../components/Common/PageTransition';
import { authAPI } from '../../api/auth';
import { aiAPI } from '../../api/ai';
import { alpha } from '@mui/material/styles';
import MarkdownRenderer from '../../components/Common/MarkdownRenderer';

const OTP = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // AI Guardian State
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, sender: 'ai', text: 'I am the Nexus Identity Guardian. I see you requested a password reset. To get your secure OTP, please provide your **Roll Number** and your **Guardian Name** (as registered in our system).' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [aiSessionId, setAiSessionId] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  if (!email) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5" color="error">Invalid session. Please start over.</Typography>
        <Button component={Link} to="/forgot-password" sx={{ mt: 2 }}>Forgot Password</Button>
      </Box>
    );
  }

  const handleChange = (index, value) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      if (value && index < 5) {
        document.getElementById(`otp-${index + 1}`)?.focus();
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');
    
    if (otpCode.length !== 6) {
      setError('Please enter complete 6-digit code');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      const res = await authAPI.verifyOTP(email, otpCode);
      const resetToken = res.data.reset_token;
      setSuccess(true);
      setTimeout(() => {
        navigate('/reset-password', { state: { resetToken } });
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired verification code.');
      setSuccess(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;

    const messageText = chatInput.trim();
    setChatInput('');
    setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: messageText }]);
    setIsTyping(true);

    try {
      const res = await aiAPI.recoveryChat(messageText, email, aiSessionId || undefined);
      if (res.data?.session_id) setAiSessionId(res.data.session_id);
      setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', text: res.data.response }]);
    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', text: "Connection error. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <PageTransition>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'background.default',
          p: 3,
        }}
      >
        <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: 1000 }}>
          {/* Left Side: OTP Entry */}
          <Paper
            sx={{
              width: '100%',
              maxWidth: 450,
              borderRadius: '16px',
              p: 4,
              boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Button component={Link} to="/forgot-password" startIcon={<ArrowBack />} sx={{ mb: 3, alignSelf: 'flex-start' }}>
              Back
            </Button>

            <LockReset sx={{ fontSize: 60, color: 'primary.main', mb: 2, alignSelf: 'center' }} />
            
            <Typography variant="h4" fontWeight="900" gutterBottom>
              Verify Identity
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
              Enter the 6-digit code for
            </Typography>
            <Typography variant="body1" fontWeight="bold" color="primary" sx={{ mb: 4 }}>
              {email}
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 3, borderRadius: '12px' }}>Verification successful! Redirecting...</Alert>}

            <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', mb: 4 }}>
                {otp.map((digit, index) => (
                  <TextField
                    key={index}
                    id={`otp-${index}`}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    inputProps={{ maxLength: 1, style: { textAlign: 'center', fontSize: '24px', fontWeight: 'bold' } }}
                    sx={{ width: 55, '& .MuiOutlinedInput-root': { height: 60, borderRadius: 2 } }}
                  />
                ))}
              </Box>

              <Button type="submit" fullWidth variant="contained" size="large" disabled={submitting} sx={{ py: 1.5, mb: 2, borderRadius: 3, fontWeight: 'bold' }}>
                {submitting ? 'Verifying...' : 'Verify & Continue'}
              </Button>
            </form>
          </Paper>

          {/* Right Side: AI Guardian */}
          <Paper
            sx={{
              width: '100%',
              maxWidth: 450,
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
              overflow: 'hidden',
              height: 500,
            }}
          >
            {/* Header */}
            <Box sx={{ bgcolor: 'primary.main', color: 'white', p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
               <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}><SmartToy /></Avatar>
               <Box>
                  <Typography variant="subtitle1" fontWeight="bold">AI Identity Guardian</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>Retrieve your OTP securely</Typography>
               </Box>
            </Box>

            {/* Chat Area */}
            <Box sx={{ flex: 1, p: 2, overflowY: 'auto', bgcolor: alpha('#1976D2', 0.03) }}>
              <Stack spacing={2}>
                {messages.map((msg) => (
                  <Box key={msg.id} sx={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                    <Paper 
                      elevation={0}
                      sx={{ 
                        p: 1.5, 
                        bgcolor: msg.sender === 'user' ? 'primary.main' : 'background.paper', 
                        color: msg.sender === 'user' ? 'white' : 'text.primary',
                        borderRadius: msg.sender === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        border: msg.sender !== 'user' ? '1px solid' : 'none',
                        borderColor: 'divider'
                      }}
                    >
                      <MarkdownRenderer text={msg.text} />
                    </Paper>
                  </Box>
                ))}
                {isTyping && (
                  <Box sx={{ alignSelf: 'flex-start', p: 1.5, bgcolor: 'background.paper', borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" color="text.secondary">Guardian is verifying...</Typography>
                  </Box>
                )}
                <div ref={messagesEndRef} />
              </Stack>
            </Box>

            {/* Input Area */}
            <Box sx={{ p: 2, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider' }}>
              <Stack direction="row" spacing={1}>
                <TextField 
                  fullWidth 
                  size="small" 
                  placeholder="E.g., My roll no is 21K-1234 and guardian is Asad..." 
                  value={chatInput} 
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => { if (e.key === 'Enter') handleSendChat(); }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4 } }}
                />
                <IconButton onClick={handleSendChat} disabled={!chatInput.trim() || isTyping} color="primary" sx={{ bgcolor: alpha('#1976D2', 0.1) }}>
                  <Send />
                </IconButton>
              </Stack>
            </Box>
          </Paper>

        </Box>
      </Box>
    </PageTransition>
  );
};

export default OTP;
