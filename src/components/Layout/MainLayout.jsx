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
} from '@mui/material';
import {
  ChatBubbleOutline,
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
 *
 * Responsibilities:
 * - Handle mobile drawer toggle state and chat widget open state.
 * - Compute a context-aware greeting for the chat widget based on current route.
 * - Provide the main content container where page routes mount (`<Outlet/>`).
 *
 * Notes:
 * - `DRAWER_WIDTH` controls the desktop sidebar width and is passed to `TopBar`/`Sidebar`.
 * - Chat widget is hidden when the user navigates to the full chat portal (`/chat`).
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
        {/* Primary route outlet: each page component mounts here via react-router */}
        <Outlet />
      </Box>

      {/* Floating Chat Widget - Hidden on Chat Portal */}
      {!location.pathname.startsWith('/chat') && (
        <Box
          sx={{
            position: 'fixed',
            right: 24,
            bottom: 24,
            zIndex: 1300,
          }}
        >
          {/* Compact FAB shown when chat widget is closed; badge indicates unread messages */}
          {!chatOpen && (
            <Badge color="error" badgeContent={unreadCount}>
              <Fab
                color="primary"
                onClick={handleChatToggle}
                sx={{
                  '@keyframes pulse': {
                    '0%': { boxShadow: '0 0 0 0 rgba(25,118,210,0.4)' },
                    '70%': { boxShadow: '0 0 0 12px rgba(25,118,210,0)' },
                    '100%': { boxShadow: '0 0 0 0 rgba(25,118,210,0)' },
                  },
                  animation: unreadCount > 0 ? 'pulse 2s infinite' : 'none',
                }}
              >
                <ChatBubbleOutline />
              </Fab>
            </Badge>
          )}
          
          {/* Chat Widget */}
          <ChatWidget
            open={chatOpen}
            onClose={handleChatToggle}
            greetingMessage={contextGreeting}
          />
        </Box>
      )}
    </Box>
  );
};

export default MainLayout;
