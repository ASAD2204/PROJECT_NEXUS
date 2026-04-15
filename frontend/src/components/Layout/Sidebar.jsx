/**
 * Sidebar Component
 * 
 * Responsive navigation sidebar for the application with role-based menu items.
 * Features:
 * - Collapsible sidebar with toggle functionality
 * - Mobile drawer for responsive design
 * - Role-based menu items (Student, Teacher, Admin, etc.)
 * - Badge/notification support for menu items
 * - Active route highlighting
 * - User profile section with logout functionality
 * - Smooth animations and transitions
 * 
 * @component
 */

import React, { useState } from 'react';
import {
  Drawer,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  useTheme,
  alpha,
  IconButton,
  Avatar,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Badge,
  useMediaQuery,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  School as SchoolIcon,
  HowToReg as HowToRegIcon,
  Assignment as AssignmentIcon,
  Payment as PaymentIcon,
  Chat as ChatIcon,
  Person as PersonIcon,
  Description as DescriptionIcon,
  MenuBook as MenuBookIcon,
  SupportAgent as SupportAgentIcon,
  ChevronLeft,
  ChevronRight,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  Assessment as AssessmentIcon,
  Group as GroupIcon,
  People as PeopleIcon,
  Event as EventIcon,
  LocalLibrary as LocalLibraryIcon,
  Quiz as QuizIcon,
  AccountBalance as AccountBalanceIcon,
  CardMembership as CardMembershipIcon,
  Campaign as CampaignIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Badge helpers now return safe defaults — real data comes from API via Dashboard pages.
// Sidebar badges are cosmetic indicators; we keep them simple.

// Helper function to check if attendance marked today (returns false — real check via API)
const isAttendanceMarkedToday = () => false;

// Helper function to get pending assignments count (returns 0 — real count via API)
const getPendingAssignmentsCount = () => 0;

// Helper function to check if unpaid invoices exist (returns false — real check via API)
const hasUnpaidInvoices = () => false;

// Student menu items
const studentMenuItems = [
  { text: 'Dashboard', icon: DashboardIcon, path: '/dashboard' },
  { text: 'My Courses', icon: SchoolIcon, path: '/lms' },
  { 
    text: 'Attendance', 
    icon: HowToRegIcon, 
    path: '/attendance/smart-attendance',
    badge: !isAttendanceMarkedToday() ? 'Mark Now' : null,
    badgeColor: 'warning'
  },
  { 
    text: 'Assignments', 
    icon: AssignmentIcon, 
    path: '/assignments',
    badge: getPendingAssignmentsCount() > 0 ? getPendingAssignmentsCount().toString() : null,
    badgeColor: 'error'
  },
  { 
    text: 'Fee Management', 
    icon: PaymentIcon, 
    path: '/finance',
    badge: hasUnpaidInvoices() ? 'Due' : null,
    badgeColor: 'error'
  },
  { 
    text: 'Nexus Chat', 
    icon: ChatIcon, 
    path: '/chat',
    badgeColor: 'primary'
  },
  { text: 'Profile', icon: PersonIcon, path: '/student/profile', divider: true },
  { text: 'Transcript', icon: DescriptionIcon, path: '/transcript' },
  { text: 'Library', icon: MenuBookIcon, path: '/library' },
  { text: 'Alumni Directory', icon: PeopleIcon, path: '/student/alumni-directory' },
  { text: 'Grievances', icon: SupportAgentIcon, path: '/grievances' },
  { text: 'My Tickets', icon: SupportAgentIcon, path: '/support' },
  { text: 'Notifications', icon: AssessmentIcon, path: '/notifications' },
];

// NOTE: `*_menuItems` are plain arrays describing nav items. Keep these
// lightweight (text, icon, path, optional badge) so they can be consumed by
// unit tests or moved to a config source later without changing rendering logic.

// Admin menu items
const adminMenuItems = [
  { text: 'Dashboard', icon: DashboardIcon, path: '/admin/dashboard' },
  { text: 'User Management', icon: PeopleIcon, path: '/admin/users' },
  { text: 'Course Management', icon: SchoolIcon, path: '/admin/courses' },
  { text: 'Departments', icon: AccountBalanceIcon, path: '/admin/departments' },
  { text: 'Alumni Management', icon: CardMembershipIcon, path: '/admin/alumni' },
  { text: 'Finance Management', icon: PaymentIcon, path: '/admin/finance' },
  { text: 'Grievances', icon: SupportAgentIcon, path: '/admin/grievances' },
  { text: 'Announcements', icon: CampaignIcon, path: '/admin/announcements' },
  { text: 'Reports', icon: AssessmentIcon, path: '/admin/reports' },
  { text: 'Settings', icon: SettingsIcon, path: '/admin/settings', divider: true },
  { text: 'Profile', icon: PersonIcon, path: '/admin/profile' },
  { text: 'Library', icon: MenuBookIcon, path: '/library' },
  { text: 'Nexus Chat', icon: ChatIcon, path: '/chat' },
];

// Teacher menu items
const teacherMenuItems = [
  { text: 'Dashboard', icon: DashboardIcon, path: '/teacher/dashboard' },
  { text: 'My Courses', icon: SchoolIcon, path: '/teacher/courses' },
  { text: 'Students', icon: GroupIcon, path: '/teacher/students' },
  { text: 'Assignments', icon: AssignmentIcon, path: '/teacher/assignments' },
  { text: 'Quizzes', icon: QuizIcon, path: '/teacher/quizzes' },
  { 
    text: 'Attendance', 
    icon: HowToRegIcon, 
    path: '/teacher/attendance',
  },
  { text: 'Reports', icon: AssessmentIcon, path: '/teacher/reports', divider: true },
  { text: 'Profile', icon: PersonIcon, path: '/teacher/profile' },
  { text: 'Library', icon: MenuBookIcon, path: '/library' },
  { 
    text: 'Nexus Chat', 
    icon: ChatIcon, 
    path: '/chat',
  },
  { text: 'Grievances', icon: SupportAgentIcon, path: '/teacher/grievances' },
];

// Librarian menu items
const librarianMenuItems = [
  { text: 'Dashboard', icon: DashboardIcon, path: '/librarian/dashboard' },
  { text: 'Library Catalog', icon: LocalLibraryIcon, path: '/library' },
  { text: 'Book Management', icon: MenuBookIcon, path: '/librarian/books' },
  { text: 'Issued Books', icon: AssignmentIcon, path: '/librarian/issued' },
  { text: 'Reservations', icon: EventIcon, path: '/librarian/reservations' },
  { text: 'Reports', icon: AssessmentIcon, path: '/librarian/reports', divider: true },
  { text: 'Profile', icon: PersonIcon, path: '/librarian/profile' },
  { text: 'Nexus Chat', icon: ChatIcon, path: '/chat' },
  { text: 'Grievances', icon: SupportAgentIcon, path: '/librarian/grievances' },
];

// Alumni menu items
const alumniMenuItems = [
  { text: 'Alumni Network', icon: PeopleIcon, path: '/alumni/network' },
  { text: 'Events', icon: EventIcon, path: '/alumni/events' },
  { text: 'Job Board', icon: AssignmentIcon, path: '/alumni/jobs' },
  { text: 'Mentorship', icon: GroupIcon, path: '/alumni/mentorship' },
  { text: 'Success Stories', icon: SchoolIcon, path: '/alumni/stories', divider: true },
  { text: 'Profile', icon: PersonIcon, path: '/alumni/profile' },
  { text: 'Library', icon: MenuBookIcon, path: '/library' },
  { text: 'Nexus Chat', icon: ChatIcon, path: '/chat' },
  { text: 'Grievances', icon: SupportAgentIcon, path: '/alumni/grievances' },
];

const Sidebar = ({ drawerWidth = 240, mobileOpen, onDrawerToggle }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, userType, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Determine which set of menu items to render for the active user role.
  // Keeps navigation logic centralized and easy to reason about.
  // Get menu items based on user type
  const getMenuItems = () => {
    switch (userType) {
      case 'admin':
        return adminMenuItems;
      case 'teacher':
        return teacherMenuItems;
      case 'librarian':
        return librarianMenuItems;
      case 'alumni':
        return alumniMenuItems;
      default:
        return studentMenuItems;
    }
  };

  const menuItems = getMenuItems();

  const currentDrawerWidth = collapsed && !isMobile ? 64 : drawerWidth;

  const handleLogoutClick = () => {
    setLogoutDialogOpen(true);
  };

  const handleLogoutConfirm = () => {
    setLogoutDialogOpen(false);
    logout();
    navigate('/login');
  };

  const handleLogoutCancel = () => {
    setLogoutDialogOpen(false);
  };

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  // Build the drawer content once and reuse it for both mobile and desktop
  // Drawer instances below. This keeps markup consistent across variants.
  const drawer = (
    <Box 
      sx={{ 
        height: '100%',
        display: 'flex', 
        flexDirection: 'column',
        minHeight: 0,
        background: theme.palette.mode === 'dark'
          ? 'linear-gradient(180deg, #0F2027 0%, #203A43 50%, #2C5364 100%)'
          : 'linear-gradient(180deg, #1565C0 0%, #0277BD 35%, #00838F 70%, #00695C 100%)',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: theme.palette.mode === 'dark'
            ? 'radial-gradient(circle at top right, rgba(76,175,80,0.15) 0%, transparent 50%)'
            : 'radial-gradient(circle at top right, rgba(255,255,255,0.2) 0%, transparent 50%)',
          pointerEvents: 'none',
        },
      }}
    >
      {/* Logo Area */}
      {/*
        Top portion of the drawer containing the app logo/title. When the
        sidebar is collapsed we show a compact icon; otherwise we show the
        full branded block with title and subtitle.
      */}
      <Box
        sx={{
          p: collapsed ? 1 : 2.5,
          pt: collapsed ? 2 : 3.5,
          mt: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 80,
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.18)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid',
          borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.25)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {!collapsed ? (
          <Box sx={{ textAlign: 'center', width: '100%' }}>
            <Box
              sx={{
                width: 150,
                height: 50,
                background: theme.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, rgba(76,175,80,0.25) 0%, rgba(33,150,243,0.25) 100%)'
                  : 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.2) 100%)',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 1,
                boxShadow: theme.palette.mode === 'dark' 
                  ? '0 4px 16px rgba(0,0,0,0.3)'
                  : '0 4px 16px rgba(0,0,0,0.15)',
                border: '2px solid',
                borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.4)',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: theme.palette.mode === 'dark'
                    ? '0 6px 20px rgba(76,175,80,0.2)'
                    : '0 6px 20px rgba(255,255,255,0.3)',
                },
              }}
            >
              <Typography 
                variant="h5" 
                fontWeight="800" 
                color="white" 
                sx={{ 
                  letterSpacing: 3,
                  textShadow: '0 2px 8px rgba(0,0,0,0.2)',
                }}
              >
                NEXUS
              </Typography>
            </Box>
            <Typography 
              variant="caption" 
              color="rgba(255, 255, 255, 0.9)" 
              sx={{ 
                fontWeight: 500,
                letterSpacing: 0.5,
                textShadow: '0 1px 4px rgba(0,0,0,0.2)',
              }}
            >
              Intelligent Campus Platform
            </Typography>
          </Box>
        ) : (
          <SchoolIcon 
            sx={{ 
              fontSize: 32, 
              color: 'white',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
            }} 
          />
        )}
      </Box>

      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.12)' }} />

      {/* Navigation Items */}
      {/*
        The navigation list renders `menuItems` produced by `getMenuItems()`.
        Each `ListItemButton` handles navigation via `navigate(item.path)` and
        will automatically close the mobile drawer when used on small screens.
        The `isActive` flag highlights the current route using gradients and
        subtle motion while preserving accessibility (no pointer-events disabled).
      */}
      <Box
        sx={{
          flex: '1 1 auto',
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          py: 2,
          px: collapsed ? 0.5 : 1,
          pb: 2,
          transition: 'padding 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '10px',
            '&:hover': {
              background: 'rgba(255,255,255,0.3)',
            },
          },
        }}
      >
        <List disablePadding>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

            const listItemContent = (
              <ListItemButton
                onClick={() => {
                  navigate(item.path);
                  if (isMobile && onDrawerToggle) {
                    onDrawerToggle();
                  }
                }}
                sx={{
                  borderRadius: collapsed ? '12px' : '16px',
                  background: isActive
                    ? theme.palette.mode === 'dark'
                      ? 'linear-gradient(135deg, rgba(76,175,80,0.28) 0%, rgba(33,150,243,0.28) 100%)'
                      : 'linear-gradient(135deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.18) 100%)'
                    : 'transparent',
                  color: 'white',
                  backdropFilter: isActive ? 'blur(10px)' : 'none',
                  '&:hover': {
                    background: isActive
                      ? theme.palette.mode === 'dark'
                        ? 'linear-gradient(135deg, rgba(76,175,80,0.35) 0%, rgba(33,150,243,0.35) 100%)'
                        : 'linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.25) 100%)'
                      : theme.palette.mode === 'dark'
                        ? 'rgba(255,255,255,0.1)'
                        : 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(10px)',
                    transform: 'translateX(4px)',
                  },
                  '&:active': {
                    transform: 'translateX(2px)',
                  },
                  border: '1px solid',
                  borderColor: isActive
                    ? theme.palette.mode === 'dark'
                      ? 'rgba(76,175,80,0.4)'
                      : 'rgba(255,255,255,0.35)'
                    : 'transparent',
                  py: collapsed ? 1.5 : 1.2,
                  px: collapsed ? 1.5 : 2,
                  mx: collapsed ? 0 : 0.5,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: isActive 
                    ? theme.palette.mode === 'dark'
                      ? '0 4px 16px rgba(76,175,80,0.2)'
                      : '0 4px 16px rgba(0,0,0,0.15)' 
                    : 'none',
                }}
              >
                {/* Icon area: center icons when collapsed, otherwise provide spacing */}
                <ListItemIcon
                  sx={{
                    color: 'white',
                    minWidth: collapsed ? 0 : 40,
                    justifyContent: 'center',
                  }}
                >
                  {collapsed && item.badge ? (
                    <Badge
                      badgeContent={item.badge}
                      color={item.badgeColor || 'error'}
                      max={99}
                      sx={{
                        '& .MuiBadge-badge': {
                          fontWeight: 700,
                          border: '1px solid rgba(255, 255, 255, 0.35)',
                        },
                      }}
                    >
                      <Icon />
                    </Badge>
                  ) : (
                    <Icon />
                  )}
                </ListItemIcon>

                {/* Render text and optional badge when not collapsed */}
                {!collapsed && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1, minWidth: 0, ml: 0.5 }}>
                    <ListItemText
                      primary={item.text}
                      primaryTypographyProps={{
                        fontWeight: isActive ? 700 : 600,
                        fontSize: '0.92rem',
                        letterSpacing: 0.3,
                      }}
                      sx={{
                        flex: '1 1 auto',
                        minWidth: 0,
                        pr: 0,
                        whiteSpace: 'normal',
                        overflow: 'visible',
                      }}
                    />

                    {item.badge && (
                      <Chip
                        label={
                          (() => {
                            const b = String(item.badge);
                            if (/mark/i.test(b)) return 'Mark';
                            if (b.length > 8) return b.slice(0, 7) + '…';
                            return b;
                          })()
                        }
                        size="small"
                        variant="filled"
                        sx={{
                          height: 18,
                          fontSize: '0.6rem',
                          fontWeight: 700,
                          px: 0.5,
                          minWidth: 'auto',
                          color: 'white',
                          flexShrink: 0,
                          ml: 0.5,
                          backgroundColor: alpha(
                            theme.palette[item.badgeColor || 'error'].main,
                            theme.palette.mode === 'dark' ? 0.3 : 0.9
                          ),
                          border: '1px solid',
                          borderColor: alpha(
                            theme.palette[item.badgeColor || 'error'].main,
                            theme.palette.mode === 'dark' ? 0.5 : 1
                          ),
                          boxShadow: `0 2px 6px ${alpha(theme.palette[item.badgeColor || 'error'].main, 0.22)}`,
                        }}
                      />
                    )}
                  </Box>
                )}
              </ListItemButton>
            );

            return (
              <React.Fragment key={item.text}>
                <ListItem disablePadding sx={{ mb: 0.5 }}>
                  {collapsed ? (
                    <Tooltip title={item.text} placement="right">
                      {listItemContent}
                    </Tooltip>
                  ) : (
                    listItemContent
                  )}
                </ListItem>
                {item.divider && (
                  <Divider sx={{ my: 1, borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.15)' }} />
                )}
              </React.Fragment>
            );
          })}
        </List>
      </Box>

      {/* Footer (always sits at the bottom; never overlaps nav) */}
      {/*
        Footer contains user info, role chip and the logout action. The
        logout button opens a confirmation dialog to avoid accidental sign-outs.
      */}
      <Box sx={{ mt: 'auto', flexShrink: 0 }}>
        <Divider sx={{ borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.15)' }} />

        {/* User Info Card */}
        <Box
          sx={{
            p: collapsed ? 1 : 1.5,
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(76,175,80,0.18) 0%, rgba(33,150,243,0.18) 100%)'
              : 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.12) 100%)',
            backdropFilter: 'blur(12px)',
            borderTop: '1px solid',
            borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.25)',
            boxShadow: '0 -2px 12px rgba(0,0,0,0.1)',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {!collapsed ? (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
              <Avatar
                src={user?.photoUrl}
                alt={user?.name || 'User'}
                sx={{ 
                  width: 40, 
                  height: 40, 
                  mr: 1.5,
                  border: '2px solid',
                  borderColor: 'rgba(255,255,255,0.3)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}
              >{user?.name?.[0] || 'U'}</Avatar>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography
                  variant="body2"
                  color="white"
                  fontWeight={600}
                  noWrap
                  sx={{ 
                    textShadow: '0 1px 4px rgba(0,0,0,0.2)',
                    fontSize: '0.9rem',
                  }}
                >
                  {user?.name || 'User'}
                </Typography>
                <Chip
                  label={userType.charAt(0).toUpperCase() + userType.slice(1)}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    background: theme.palette.mode === 'dark'
                      ? 'linear-gradient(135deg, rgba(76,175,80,0.35) 0%, rgba(33,150,243,0.35) 100%)'
                      : 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.2) 100%)',
                    color: 'white',
                    mt: 0.5,
                    border: '1px solid',
                    borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.35)',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                  }}
                />
              </Box>
            </Box>
          ) : (
            <Tooltip title={user?.name || 'User'} placement="right">
              <Avatar
                src={user?.photoUrl}
                alt={user?.name || 'User'}
                sx={{
                  width: 40,
                  height: 40,
                  mx: 'auto',
                  mb: 1,
                  cursor: 'pointer',
                  border: '2px solid',
                  borderColor: 'rgba(255,255,255,0.3)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'scale(1.05)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  },
                }}
              />
            </Tooltip>
          )}

          {/* Logout Button */}
          <Button
            fullWidth
            variant="outlined"
            startIcon={!collapsed && <LogoutIcon />}
            onClick={handleLogoutClick}
            sx={{
              color: 'white',
              fontWeight: 700,
              fontSize: collapsed ? '0.85rem' : '0.9rem',
              borderColor: theme.palette.mode === 'dark' ? 'rgba(244,67,54,0.4)' : 'rgba(255,255,255,0.4)',
              background: theme.palette.mode === 'dark'
                ? 'rgba(244,67,54,0.18)'
                : 'rgba(211,47,47,0.12)',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                borderColor: theme.palette.mode === 'dark' ? 'rgba(244,67,54,0.6)' : 'rgba(255,255,255,0.6)',
                background: theme.palette.mode === 'dark'
                  ? 'rgba(244,67,54,0.28)'
                  : 'rgba(211,47,47,0.2)',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 12px rgba(244,67,54,0.2)',
              },
              '&:active': {
                transform: 'translateY(0)',
              },
              py: collapsed ? 1.5 : 0.75,
              justifyContent: 'center',
            }}
          >
            {collapsed ? <LogoutIcon /> : 'Logout'}
          </Button>
        </Box>

        {/* Collapse Toggle Button - Desktop Only */}
        {!isMobile && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              p: 0.5,
              background: theme.palette.mode === 'dark'
                ? 'rgba(255,255,255,0.03)'
                : 'rgba(255,255,255,0.08)',
            }}
          >
            <IconButton
              onClick={toggleCollapse}
              sx={{
                color: 'white',
                '&:hover': {
                  background: theme.palette.mode === 'dark'
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(255,255,255,0.15)',
                },
              }}
            >
              {collapsed ? <ChevronRight /> : <ChevronLeft />}
            </IconButton>
          </Box>
        )}
      </Box>
    </Box>
  );

  return (
    <>
      <Box
        component="nav"
        sx={{ 
          width: { xs: 0, md: currentDrawerWidth }, 
          flexShrink: 0,
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={onDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better mobile performance
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              height: '100dvh',
              display: 'flex',
              flexDirection: 'column',
              borderRight: 'none',
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: currentDrawerWidth,
              height: '100dvh',
              display: 'flex',
              flexDirection: 'column',
              borderRight: 'none',
              transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease',
              overflowX: 'hidden',
              overflowY: 'auto',
              '&::-webkit-scrollbar': {
                width: collapsed ? '0px' : '6px',
                transition: 'width 0.3s ease',
              },
              '&::-webkit-scrollbar-track': {
                background: 'rgba(255,255,255,0.05)',
              },
              '&::-webkit-scrollbar-thumb': {
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '10px',
                '&:hover': {
                  background: 'rgba(255,255,255,0.3)',
                },
              },
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Logout Confirmation Dialog */}
      <Dialog
        open={logoutDialogOpen}
        onClose={handleLogoutCancel}
        PaperProps={{
          sx: {
            borderRadius: 3,
            minWidth: 320,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          Confirm Logout
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to logout from Project Nexus?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleLogoutCancel} color="inherit">
            Cancel
          </Button>
          <Button 
            onClick={handleLogoutConfirm} 
            variant="contained" 
            color="error"
            startIcon={<LogoutIcon />}
          >
            Logout
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Sidebar;
