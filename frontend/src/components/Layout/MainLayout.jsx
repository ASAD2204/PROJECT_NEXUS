/**
 * MainLayout Component
 * 
 * Primary layout wrapper for the application providing consistent structure.
 * Includes sidebar navigation, top bar, and scroll-to-top functionality.
 * 
 * Features:
 * - Responsive sidebar with collapse/expand
 * - Top navigation bar with user profile
 * - Mobile drawer navigation
 * - Scroll-to-top floating action button
 * - Smooth page transitions
 * - Theme-aware styling
 * - Adaptive padding and spacing
 * 
 * @component
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  CssBaseline,
  Fab,
  Badge,
  Tooltip,
} from '@mui/material';
import {
  SmartToy,
  AutoAwesome,
} from '@mui/icons-material';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import ChatWidget from '../Chat/ChatWidget';

const DRAWER_WIDTH = 260;

/**
 * MainLayout
 *
 * Top-level application layout used by the main route. Composes the persistent
 * `TopBar` and `Sidebar`, renders nested routes via `Outlet`, and provides a
 * small floating `ChatWidget` with contextual greeting messages.
 */

const MainLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(1);
  const location = useLocation();

  // Compute a short, contextual greeting for the ChatWidget based on current route
  const contextGreeting = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith('/finance')) return 'Do you have questions about your fee voucher?';
    if (path.startsWith('/lms')) return 'Need help with your course or assignment?';
    if (path.startsWith('/attendance')) return 'Want help with attendance check-in?';
    if (path.startsWith('/library')) return 'Looking for a book or reservation help?';
    if (path.startsWith('/grievances')) return 'Need help submitting a grievance?';
    if (path.startsWith('/chat')) return 'Want to continue in full chat?';
    return 'How can I assist you right now?';
  }, [location.pathname]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleChatToggle = () => {
    setChatOpen((prev) => !prev);
    if (!chatOpen) {
      setUnreadCount(0);
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      <TopBar onMenuClick={handleDrawerToggle} drawerWidth={DRAWER_WIDTH} />
      <Sidebar
        drawerWidth={DRAWER_WIDTH}
        mobileOpen={mobileOpen}
        onDrawerToggle={handleDrawerToggle}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: '100%',
          ml: 0,
          mt: { xs: '56px', sm: '64px' },
          backgroundColor: 'background.default',
          minHeight: { xs: 'calc(100vh - 56px)', sm: 'calc(100vh - 64px)' },
          overflowX: 'hidden',
          overflowY: 'auto',
        }}
      >
        <Outlet />
      </Box>

      {/* Floating AI Assistant FAB - Hidden on Chat Portal */}
      {!location.pathname.startsWith('/chat') && !chatOpen && (
        <Tooltip title="Ask Nexus AI" placement="left">
          <Badge
            color="secondary"
            overlap="circular"
            badgeContent={<AutoAwesome sx={{ fontSize: 14 }} />}
            sx={{
              position: 'fixed',
              right: 24,
              bottom: 24,
              zIndex: 1300,
            }}
          >
            <Fab
              color="primary"
              onClick={handleChatToggle}
              sx={{
                background: 'linear-gradient(135deg, #128C7E 0%, #075E54 100%)',
                color: 'white',
                '&:hover': {
                  background: 'linear-gradient(135deg, #075E54 0%, #128C7E 100%)',
                },
                '@keyframes pulse': {
                  '0%': { boxShadow: '0 0 0 0 rgba(18,140,126,0.4)' },
                  '70%': { boxShadow: '0 0 0 15px rgba(18,140,126,0)' },
                  '100%': { boxShadow: '0 0 0 0 rgba(18,140,126,0)' },
                },
                animation: unreadCount > 0 ? 'pulse 2s infinite' : 'none',
              }}
            >
              <SmartToy />
            </Fab>
          </Badge>
        </Tooltip>
      )}

      {/* Chat Widget */}
      {!location.pathname.startsWith('/chat') && (
        <ChatWidget
          open={chatOpen}
          onClose={handleChatToggle}
          greetingMessage={contextGreeting}
        />
      )}
    </Box>
  );
};

export default MainLayout;
