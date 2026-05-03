import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Breadcrumbs,
  Link,
  TextField,
  InputAdornment,
  Popover,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  Paper,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  Help as HelpIcon,
  Search as SearchIcon,
  NavigateNext,
  Home as HomeIcon,
  Circle,
  Assignment as AssignmentIcon,
  Payment as PaymentIcon,
  School as SchoolIcon,
  Info as InfoIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useThemeMode } from '../../contexts/ThemeContext';
import { opsAPI } from '../../api/ops';
import { chatAPI } from '../../api/chat';

const TopBar = ({ onMenuClick, drawerWidth }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  
  // State management
  const [anchorElUser, setAnchorElUser] = useState(null);
  const [anchorElNotifications, setAnchorElNotifications] = useState(null);
  const [searchValue, setSearchValue] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [anchorElSearch, setAnchorElSearch] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const loadNotifications = async () => {
      try {
        const [notificationsRes, announcementsRes, sessionsRes] = await Promise.allSettled([
          opsAPI.getMyNotifications({ limit: 12 }),
          opsAPI.getAnnouncements({ limit: 6 }),
          chatAPI.getSessions(),
        ]);

        const notificationRows = notificationsRes.status === 'fulfilled'
          ? (Array.isArray(notificationsRes.value.data) ? notificationsRes.value.data : (notificationsRes.value.data?.notifications || []))
          : [];

        const mappedNotifications = notificationRows.map((item) => ({
          id: `notif-${item.id}`,
          sourceId: item.id,
          source: 'notification',
          title: item.title || 'Notification',
          subtitle: item.message || '',
          time: item.created_at ? new Date(item.created_at).toLocaleString() : 'Just now',
          read: Boolean(item.is_read),
          createdAt: item.created_at || '',
          icon: item.type === 'assignment'
            ? AssignmentIcon
            : item.type === 'payment'
              ? PaymentIcon
              : item.type === 'academic'
                ? SchoolIcon
                : InfoIcon,
          color: item.priority === 'high' ? 'error' : item.priority === 'medium' ? 'warning' : 'info',
        }));

        const announcementRows = announcementsRes.status === 'fulfilled'
          ? (Array.isArray(announcementsRes.value.data) ? announcementsRes.value.data : (announcementsRes.value.data?.announcements || []))
          : [];

        const mappedAnnouncements = announcementRows.slice(0, 6).map((item) => ({
          id: `ann-${item.id}`,
          sourceId: item.id,
          source: 'announcement',
          title: item.title || 'Announcement',
          subtitle: item.content || '',
          time: item.published_at ? new Date(item.published_at).toLocaleString() : 'Just now',
          read: false,
          createdAt: item.published_at || '',
          icon: InfoIcon,
          color: item.priority === 'high' ? 'error' : item.priority === 'medium' ? 'warning' : 'info',
        }));

        let chatUnreadCount = 0;
        if (sessionsRes.status === 'fulfilled') {
          const sessions = Array.isArray(sessionsRes.value.data)
            ? sessionsRes.value.data
            : (sessionsRes.value.data?.sessions || []);
          const limitedSessions = sessions.slice(0, 8);
          const messageChecks = await Promise.allSettled(
            limitedSessions.map((session) => chatAPI.getMessages(session.session_id, { limit: 20 }))
          );

          messageChecks.forEach((result) => {
            if (result.status !== 'fulfilled') return;
            const rows = Array.isArray(result.value.data)
              ? result.value.data
              : (result.value.data?.messages || []);
            rows.forEach((msg) => {
              if (!msg?.is_read && String(msg?.sender_id) !== String(user?.user_id)) {
                chatUnreadCount += 1;
              }
            });
          });
        }

        const chatDigest = chatUnreadCount > 0
          ? [{
            id: 'chat-unread',
            source: 'chat',
            title: 'New chat messages',
            subtitle: `You have ${chatUnreadCount} unread chat messages`,
            time: 'Just now',
            read: false,
            createdAt: new Date().toISOString(),
            icon: AssignmentIcon,
            color: 'primary',
          }]
          : [];

        const merged = [...chatDigest, ...mappedNotifications, ...mappedAnnouncements]
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
          .slice(0, 20);

        if (isMounted) {
          setNotifications(merged);
        }
      } catch (error) {
        console.error('Failed to load notifications', error);
        if (isMounted) {
          setNotifications([]);
        }
      }
    };

    loadNotifications();
    const pollId = setInterval(loadNotifications, 30000);

    return () => {
      isMounted = false;
      clearInterval(pollId);
    };
  }, [user?.user_id]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const currentRole = user?.role || 'student';

  const getDashboardPath = () => {
    switch (currentRole) {
      case 'admin':
        return '/admin/dashboard';
      case 'teacher':
        return '/teacher/dashboard';
      case 'librarian':
        return '/librarian/dashboard';
      case 'alumni':
        return '/alumni/network';
      default:
        return '/dashboard';
    }
  };

  const getProfilePath = () => {
    switch (currentRole) {
      case 'admin':
        return '/admin/profile';
      case 'teacher':
        return '/teacher/profile';
      case 'librarian':
        return '/librarian/profile';
      case 'alumni':
        return '/alumni/profile';
      default:
        return '/student/profile';
    }
  };

  const getSettingsPath = () => (currentRole === 'admin' ? '/admin/settings' : getProfilePath());

  // Generate breadcrumbs based on current route
  const generateBreadcrumbs = () => {
    const pathnames = location.pathname.split('/').filter(x => x);
    
    // Don't show breadcrumbs if on root or login
    if (pathnames.length === 0 || location.pathname === '/login') {
      return [];
    }

    const breadcrumbs = [];

    const routeNames = {
      dashboard: 'Dashboard',
      profile: 'Profile',
      transcript: 'Transcript',
      attendance: 'Attendance',
      history: 'History',
      lms: 'My Courses',
      course: 'Course Details',
      classroom: 'Course Classroom',
      assignment: 'Assignment',
      assignments: 'Assignments',
      submit: 'Submit Assignment',
      finance: 'Fee Management',
      vouchers: 'Fee Vouchers',
      chat: 'Nexus Chat',
      library: 'Library',
      catalog: 'Library Catalog',
      grievances: 'Grievances',
      admin: 'Admin',
      users: 'User Management',
      courses: 'Course Management',
      departments: 'Departments',
      alumni: 'Alumni Management',
      reports: 'Reports',
      settings: 'Settings',
      teacher: 'Teacher',
      students: 'Students',
      quizzes: 'Quizzes',
      librarian: 'Librarian',
      books: 'Book Management',
      issued: 'Issued Books',
      reservations: 'Reservations',
      network: 'Alumni Network',
      events: 'Events',
      jobs: 'Job Board',
      mentorship: 'Mentorship Program',
      stories: 'Success Stories',
      support: 'My Tickets',
      notifications: 'Notifications',
      'alumni-directory': 'Alumni Directory',
      'smart-attendance': 'Smart Attendance',
      'biometric-enrollment': 'Biometric Enrollment',
      'face-enrollment': 'Biometric Enrollment',   
      student: 'Student',
      operations: 'Operations',
      'my-courses': 'My Courses',
    };

    pathnames.forEach((value, index) => {
      const path = `/${pathnames.slice(0, index + 1).join('/')}`;
      const label = routeNames[value] || value.toUpperCase();
      
      // Skip IDs and numeric values in breadcrumbs
      if (!isNaN(value) || value.length > 20) {
        return;
      }
      
      breadcrumbs.push({ label, path });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // Search functionality
  useEffect(() => {
    if (searchValue.trim() === '') {
      setSearchResults([]);
      return;
    }

    // Simple client-side search from navigation routes
    const searchLower = searchValue.toLowerCase();
    const results = [];

    const searchablePages = [
      { type: 'page', title: 'Dashboard', subtitle: 'Home', path: getDashboardPath() },
      { type: 'page', title: 'My Courses', subtitle: 'LMS', path: '/lms' },
      { type: 'page', title: 'Assignments', subtitle: 'Student', path: '/assignments' },
      { type: 'page', title: 'Attendance', subtitle: 'Mark Attendance', path: '/attendance/smart-attendance' },
      { type: 'page', title: 'Attendance History', subtitle: 'Past Records', path: '/attendance/history' },
      { type: 'page', title: 'Biometric Enrollment', subtitle: 'Face Registration', path: '/attendance/biometric-enrollment' },
      { type: 'page', title: 'Fee Vouchers', subtitle: 'Finance', path: '/finance' },
      { type: 'page', title: 'Transcript', subtitle: 'Academics', path: '/transcript' },
      { type: 'page', title: 'Library', subtitle: 'Books', path: '/library' },
      { type: 'page', title: 'Grievances', subtitle: 'Support', path: '/grievances' },
      { type: 'page', title: 'Nexus Chat', subtitle: 'Chat', path: '/chat' },
      { type: 'page', title: 'Profile', subtitle: 'Account', path: getProfilePath() },
      { type: 'page', title: 'Notifications', subtitle: 'Alerts', path: '/notifications' },
    ];

    searchablePages.forEach(page => {
      if (page.title.toLowerCase().includes(searchLower) ||
          page.subtitle.toLowerCase().includes(searchLower)) {
        results.push({ ...page, id: page.path });
      }
    });

    setSearchResults(results.slice(0, 8));
  }, [searchValue]);

  // Event handlers
  const handleUserMenuOpen = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorElUser(null);
  };

  const handleNotificationsOpen = (event) => {
    setAnchorElNotifications(event.currentTarget);
  };

  const handleNotificationsClose = () => {
    setAnchorElNotifications(null);
  };

  const handleSearchFocus = (event) => {
    setSearchFocused(true);
    setAnchorElSearch(event.currentTarget);
  };

  const handleSearchBlur = () => {
    // Delay to allow click on search results
    setTimeout(() => {
      setSearchFocused(false);
      setAnchorElSearch(null);
    }, 200);
  };

  const handleSearchResultClick = (path) => {
    navigate(path);
    setSearchValue('');
    setSearchResults([]);
    setSearchFocused(false);
    setAnchorElSearch(null);
  };

  const handleProfile = () => {
    navigate(getProfilePath());
    handleUserMenuClose();
  };

  const handleSettings = () => {
    navigate(getSettingsPath());
    handleUserMenuClose();
  };

  const handleHelp = () => {
    navigate('/help-support');
    handleUserMenuClose();
  };

  const handleLogout = () => {
    handleUserMenuClose();
    logout();
    navigate('/login');
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { md: `calc(100% - ${drawerWidth}px)` },
        ml: { md: `${drawerWidth}px` },
        backgroundColor: 'background.paper',
        color: 'text.primary',
        borderBottom: '1px solid',
        borderColor: 'divider',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
      }}
      elevation={0}
    >
      <Toolbar sx={{ minHeight: 64, px: { xs: 2, sm: 3 } }}>
        {/* Left: Hamburger Menu + Back Button & Breadcrumbs */}
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, minWidth: 0, gap: 1 }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={onMenuClick}
            sx={{ 
              mr: 1, 
              display: { md: 'none' },
              color: 'text.secondary',
            }}
          >
            <MenuIcon />
          </IconButton>

          {/* Current Page Title */}
          {breadcrumbs.length > 0 && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 2,
                py: 1,
                borderRadius: 2,
                background: (theme) => theme.palette.mode === 'dark' 
                  ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)'
                  : 'linear-gradient(135deg, rgba(37, 99, 235, 0.06) 0%, rgba(5, 150, 105, 0.04) 100%)',
                border: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(96, 165, 250, 0.2)' : 'rgba(37, 99, 235, 0.15)'}`,
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.08)',
              }}
            >
              <Box
                sx={{
                  width: 4,
                  height: 24,
                  borderRadius: 1,
                  background: (theme) => theme.palette.mode === 'dark'
                    ? 'linear-gradient(180deg, #60A5FA 0%, #059669 100%)'
                    : 'linear-gradient(180deg, #2563EB 0%, #059669 100%)',
                }}
              />
              <Typography
                color="text.primary"
                sx={{ 
                  fontWeight: 600,
                  fontSize: { xs: '0.95rem', sm: '1.05rem' },
                  letterSpacing: 0.3,
                }}
              >
                {breadcrumbs[breadcrumbs.length - 1]?.label}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Center: Search Bar */}
        <Box sx={{ mx: { xs: 1, md: 3 }, display: { xs: 'none', md: 'block' }, flexGrow: { md: 0 } }}>
          <TextField
            placeholder="Search courses, students, assignments..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            size="small"
            sx={{
              width: searchFocused ? { md: 500, lg: 500 } : { md: 300, lg: 400 },
              transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'background.default',
                borderRadius: 2,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  backgroundColor: 'background.paper',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                },
                '&.Mui-focused': {
                  backgroundColor: 'background.paper',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
          
          {/* Search Results Dropdown */}
          <Popover
            open={Boolean(anchorElSearch) && searchResults.length > 0}
            anchorEl={anchorElSearch}
            onClose={() => setAnchorElSearch(null)}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
            PaperProps={{
              sx: {
                width: searchFocused ? 500 : 400,
                mt: 1,
                maxHeight: 400,
                overflow: 'auto',
                borderRadius: 2,
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              },
            }}
            disableAutoFocus
            disableEnforceFocus
          >
            <List sx={{ py: 1 }}>
              {searchResults.map((result) => (
                <ListItemButton
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSearchResultClick(result.path)}
                  sx={{ 
                    py: 1.5,
                    mx: 1,
                    mb: 0.5,
                    borderRadius: 1.5,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                      transform: 'translateX(4px)',
                    },
                  }}
                >
                  <ListItemIcon>
                    {result.type === 'course' ? (
                      <SchoolIcon color="primary" />
                    ) : (
                      <AssignmentIcon color="secondary" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={result.title}
                    secondary={result.subtitle}
                    primaryTypographyProps={{
                      fontWeight: 500,
                      fontSize: '0.95rem',
                    }}
                  />
                  <Chip
                    label={result.type}
                    size="small"
                    sx={{ 
                      textTransform: 'capitalize',
                      height: 20,
                      fontSize: '0.7rem',
                    }}
                  />
                </ListItemButton>
              ))}
            </List>
          </Popover>
        </Box>

        {/* Right: Notifications, Settings, User Menu */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Notifications */}
          <IconButton
            color="inherit"
            onClick={handleNotificationsOpen}
            sx={{
              color: 'text.secondary',
              transition: 'all 0.2s ease',
              '&:hover': {
                color: 'primary.main',
                backgroundColor: 'action.hover',
                transform: 'scale(1.05)',
              },
            }}
          >
            <Badge 
              badgeContent={unreadCount} 
              color="error"
              sx={{
                '& .MuiBadge-badge': {
                  boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                  fontWeight: 600,
                },
              }}
            >
              <NotificationsIcon />
            </Badge>
          </IconButton>

          {/* Settings */}
          <IconButton
            color="inherit"
            onClick={handleSettings}
            sx={{
              color: 'text.secondary',
              transition: 'all 0.2s ease',
              '&:hover': {
                color: 'primary.main',
                backgroundColor: 'action.hover',
                transform: 'rotate(30deg)',
              },
              display: { xs: 'none', sm: 'inline-flex' },
            }}
          >
            <SettingsIcon />
          </IconButton>

          {/* Theme Toggle */}
          <IconButton
            color="inherit"
            onClick={toggleTheme}
            sx={{
              color: 'text.secondary',
              transition: 'all 0.3s ease',
              '&:hover': {
                color: 'primary.main',
                backgroundColor: 'action.hover',
                transform: 'rotate(180deg)',
              },
            }}
            title={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
          </IconButton>

          {/* User Avatar */}
          <IconButton 
            onClick={handleUserMenuOpen} 
            sx={{ 
              ml: 1,
              transition: 'all 0.2s ease',
              '&:hover': {
                transform: 'scale(1.05)',
              },
            }}
          >
            <Avatar
              src={user?.photoUrl}
              alt={user?.name || 'User'}
              sx={{ 
                width: 40, 
                height: 40,
                border: '2px solid',
                borderColor: 'divider',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >{user?.name?.[0] || 'U'}</Avatar>
          </IconButton>
        </Box>

        {/* Notifications Popover */}
        <Popover
          open={Boolean(anchorElNotifications)}
          anchorEl={anchorElNotifications}
          onClose={handleNotificationsClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          PaperProps={{
            sx: {
              width: 380,
              mt: 1.5,
              maxHeight: 500,
              borderRadius: 2,
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            },
          }}
        >
          <Box sx={{ 
            p: 2, 
            borderBottom: 1, 
            borderColor: 'divider',
            background: 'linear-gradient(135deg, rgba(25,118,210,0.05) 0%, rgba(0,150,136,0.05) 100%)',
          }}>
            <Typography variant="h6" fontWeight={600}>
              Notifications
            </Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
              You have {unreadCount} unread {unreadCount === 1 ? 'notification' : 'notifications'}
            </Typography>
          </Box>
          
          <List sx={{ py: 0 }}>
            {notifications.map((notification, index) => {
              const Icon = notification.icon;
              return (
                <React.Fragment key={notification.id}>
                  <ListItem
                    sx={{
                      backgroundColor: notification.read ? 'transparent' : 'action.hover',
                      py: 2,
                      px: 2.5,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: 'action.selected',
                        transform: 'translateX(4px)',
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: `${notification.color}.main`,
                          color: 'white',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        }}
                      >
                        <Icon sx={{ fontSize: 20 }} />
                      </Box>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="body2" fontWeight={notification.read ? 400 : 600}>
                            {notification.title}
                          </Typography>
                          {!notification.read && (
                            <Circle sx={{ fontSize: 8, color: 'primary.main' }} />
                          )}
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            {notification.subtitle}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" fontWeight={500}>
                            {notification.time}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                  {index < notifications.length - 1 && <Divider />}
                </React.Fragment>
              );
            })}
          </List>
          
          <Box 
            sx={{ 
              p: 1.5, 
              borderTop: 1, 
              borderColor: 'divider',
              textAlign: 'center',
            }}
          >
            <Link
              component="button"
              variant="body2"
              onClick={() => {
                handleNotificationsClose();
                navigate('/notifications');
              }}
              sx={{
                fontWeight: 600,
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              View All Notifications
            </Link>
          </Box>
        </Popover>

        {/* User Menu */}
        <Menu
          anchorEl={anchorElUser}
          open={Boolean(anchorElUser)}
          onClose={handleUserMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          PaperProps={{
            sx: {
              mt: 1.5,
              minWidth: 260,
              borderRadius: 2,
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            },
          }}
        >
          <Box sx={{ 
            px: 2.5, 
            py: 2.5, 
            borderBottom: 1, 
            borderColor: 'divider',
            background: 'linear-gradient(135deg, rgba(25,118,210,0.05) 0%, rgba(0,150,136,0.05) 100%)',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
              <Avatar
                src={user?.photoUrl}
                alt={user?.name || 'User'}
                sx={{ 
                  width: 48, 
                  height: 48, 
                  mr: 1.5,
                  border: '2px solid',
                  borderColor: 'primary.main',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
              >{user?.name?.[0] || 'U'}</Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight={600} noWrap>
                  {user?.name || 'User'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {user?.email || ''}
                </Typography>
              </Box>
            </Box>
            <Chip
              label={user?.role || 'User'}
              size="small"
              color="primary"
              sx={{ 
                fontWeight: 600,
                boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
              }}
            />
          </Box>
          
          <MenuItem 
            onClick={handleProfile} 
            sx={{ 
              py: 1.5,
              px: 2.5,
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: 'action.selected',
                transform: 'translateX(4px)',
              },
            }}
          >
            <ListItemIcon>
              <PersonIcon fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="Profile"
              primaryTypographyProps={{
                fontWeight: 500,
              }}
            />
          </MenuItem>
          
          <MenuItem 
            onClick={handleSettings} 
            sx={{ 
              py: 1.5,
              px: 2.5,
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: 'action.selected',
                transform: 'translateX(4px)',
              },
            }}
          >
            <ListItemIcon>
              <SettingsIcon fontSize="small" color="action" />
            </ListItemIcon>
            <ListItemText 
              primary="Settings"
              primaryTypographyProps={{
                fontWeight: 500,
              }}
            />
          </MenuItem>
          
          <MenuItem 
            onClick={handleHelp} 
            sx={{ 
              py: 1.5,
              px: 2.5,
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: 'action.selected',
                transform: 'translateX(4px)',
              },
            }}
          >
            <ListItemIcon>
              <HelpIcon fontSize="small" color="info" />
            </ListItemIcon>
            <ListItemText 
              primary="Help & Support"
              primaryTypographyProps={{
                fontWeight: 500,
              }}
            />
          </MenuItem>
          
          <Divider sx={{ my: 1 }} />
          
          <MenuItem 
            onClick={handleLogout} 
            sx={{ 
              py: 1.5,
              px: 2.5,
              color: 'error.main',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: 'error.lighter',
                transform: 'translateX(4px)',
              },
            }}
          >
            <ListItemIcon>
              <LogoutIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText 
              primary="Logout"
              primaryTypographyProps={{
                fontWeight: 600,
              }}
            />
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;
