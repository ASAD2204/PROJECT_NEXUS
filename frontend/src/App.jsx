/**
 * App Component - Main Application Router
 * 
 * This is the root component that defines all application routes.
 * Manages route protection, splash screen, and role-based navigation.
 * 
 * Route Structure:
 * - Public routes: Login, ForgotPassword, OTP
 * - Protected routes: All authenticated user routes
 * - Role-specific routes: Student, Teacher, Admin, Alumni, Librarian
 * 
 * Features:
 * - Route protection with authentication check
 * - Splash screen on first load
 * - Role-based default dashboard redirection
 * - Nested routing with MainLayout wrapper
 */

import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Components
import SplashScreen from './components/Common/SplashScreen';

// Layouts
import MainLayout from './components/Layout/MainLayout';

// Auth Pages
import Login from './pages/Auth/Login';
import ForgotPassword from './pages/Auth/ForgotPassword';
import OTP from './pages/Auth/OTP';

// Student Pages
import Dashboard from './pages/Student/Dashboard';
import StudentProfile from './pages/Student/Profile';
import Transcript from './pages/Student/Transcript';
import MyAssignments from './pages/Student/MyAssignments';
import MyTickets from './pages/Student/MyTickets';
import Notifications from './pages/Student/Notifications';
import AlumniDirectory from './pages/Student/AlumniDirectory';

// Admin Pages
import AdminDashboard from './pages/Admin/Dashboard';
import AdminProfile from './pages/Admin/Profile';
import UserManagement from './pages/Admin/UserManagement';
import AdminCourseManagement from './pages/Admin/CourseManagement';
import AdminReports from './pages/Admin/Reports';
import AdminFinance from './pages/Admin/FinanceManagement';
import AdminGrievanceManagement from './pages/Admin/GrievanceManagement';
import AdminSettings from './pages/Admin/Settings';
import AlumniManagement from './pages/Admin/AlumniManagement';
import DepartmentManagement from './pages/Admin/DepartmentManagement';
import AnnouncementManagement from './pages/Admin/AnnouncementManagement';

// Teacher Pages
import TeacherDashboard from './pages/Teacher/Dashboard';
import TeacherProfile from './pages/Teacher/Profile';
import TeacherCourses from './pages/Teacher/MyCourses';
import StudentManagement from './pages/Teacher/StudentManagement';
import TeacherReports from './pages/Teacher/Reports';
import TeacherCourseManagement from './pages/Teacher/CourseManagement';
import CreateAssignment from './pages/Teacher/CreateAssignment';
import CreateQuiz from './pages/Teacher/CreateQuiz';
import ViewSubmissions from './pages/Teacher/ViewSubmissions';
import Assignments from './pages/Teacher/Assignments';
import Quizzes from './pages/Teacher/Quizzes';
import TeacherAttendance from './pages/Teacher/TeacherAttendance';

// Attendance Pages
import SmartAttendance from './pages/Attendance/SmartAttendance';
import AttendanceHistory from './pages/Attendance/History';
import GPSVerification from './pages/Attendance/GPSVerification';
import LivenessDetection from './pages/Attendance/LivenessDetection';
import FaceCapture from './pages/Attendance/FaceCapture';
import BiometricEnrollment from './pages/Attendance/BiometricEnrollment';
import Confirmation from './pages/Attendance/Confirmation';
import AttendanceSuccess from './pages/Attendance/AttendanceSuccess';

// LMS Pages
import CourseList from './pages/LMS/CourseList';
import CourseClassroom from './pages/LMS/CourseClassroom';
import AssignmentSubmit from './pages/LMS/AssignmentSubmit';

// Finance Pages
import FeeVouchers from './pages/Finance/FeeVouchers';

// Chat Pages
import ChatPortal from './pages/Chat/ChatPortal';

// Other Pages
import Library from './pages/Library/Library';
import LibrarianDashboard from './pages/Library/LibrarianDashboard';
import LibrarianProfile from './pages/Library/Profile';
import BookManagement from './pages/Library/BookManagement';
import IssuedBooks from './pages/Library/IssuedBooks';
import Reservations from './pages/Library/Reservations';
import LibrarianReports from './pages/Library/LibrarianReports';
import LibrarianGrievances from './pages/Library/LibrarianGrievances';
import Grievances from './pages/Grievances/Grievances';
import AlumniNetwork from './pages/Alumni/AlumniNetwork';
import AlumniProfile from './pages/Alumni/Profile';
import AlumniEvents from './pages/Alumni/AlumniEvents';
import JobBoard from './pages/Alumni/JobBoard';
import Mentorship from './pages/Alumni/Mentorship';
import SuccessStories from './pages/Alumni/SuccessStories';
import TeacherGrievanceManagement from './pages/Teacher/GrievanceManagement';
import HelpSupport from './pages/Support/HelpSupport';

/**
 * Protected Route Component
 * Ensures only authenticated users can access protected routes
 * Redirects to login if user is not authenticated
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null; // Wait for auth check
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  const navigate = useNavigate();
  const { userType, isAuthenticated, loading } = useAuth();
  
  // State for splash screen management
  const [showSplash, setShowSplash] = useState(true);
  const [splashComplete, setSplashComplete] = useState(false);

  /**
   * Check if splash screen has been shown in current session
   * Uses sessionStorage to show splash only once per browser session
   */
  useEffect(() => {
    const splashShown = sessionStorage.getItem('splashShown');
    if (splashShown) {
      setShowSplash(false);
      setSplashComplete(true);
    }
  }, []);

  /**
   * Handle splash screen completion
   * Marks splash as shown and navigates to appropriate page
   */
  const handleSplashComplete = () => {
    sessionStorage.setItem('splashShown', 'true');
    setShowSplash(false);
    setTimeout(() => {
      setSplashComplete(true);
      // Navigate to login if not authenticated
      if (!isAuthenticated) {
        navigate('/login');
      }
    }, 500);
  };

  /**
   * Get Default Dashboard Route
   * Returns appropriate dashboard based on user role
   * 
   * @returns {string} - Dashboard route path
   */
  const getDefaultDashboard = () => {
    switch (userType) {
      case 'admin':
        return '/admin/dashboard';
      case 'teacher':
        return '/teacher/dashboard';
      case 'librarian':
        return '/librarian/dashboard';
      case 'alumni':
        return '/alumni/network';
      default:
        return '/dashboard'; // Student dashboard
    }
  };

  // Show splash screen on first load
  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  // Don't render routes until splash is complete
  if (!splashComplete) {
    return null;
  }

  return (
    <Routes>
      {/* ============================================
          PUBLIC ROUTES - No authentication required
          ============================================ */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/otp" element={<OTP />} />

      {/* ============================================
          PROTECTED ROUTES - Authentication required
          Wrapped in MainLayout for consistent UI
          ============================================ */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* Root redirect to role-based dashboard */}
        <Route index element={<Navigate to={getDefaultDashboard()} />} />
        
        {/* =====================================
            STUDENT ROUTES
            ===================================== */}
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="profile" element={<StudentProfile />} />
        <Route path="student/profile" element={<StudentProfile />} />
        <Route path="transcript" element={<Transcript />} />
        <Route path="notifications" element={<Notifications />} />
        
        {/* =====================================
            ADMIN ROUTES
            ===================================== */}
        <Route path="admin/dashboard" element={<AdminDashboard />} />
        <Route path="admin/profile" element={<AdminProfile />} />
        <Route path="admin/users" element={<UserManagement />} />
        <Route path="admin/courses" element={<AdminCourseManagement />} />
        <Route path="admin/departments" element={<DepartmentManagement />} />
        <Route path="admin/alumni" element={<AlumniManagement />} />
        <Route path="admin/reports" element={<AdminReports />} />
        <Route path="admin/finance" element={<AdminFinance />} />
        <Route path="admin/grievances" element={<AdminGrievanceManagement />} />
        <Route path="admin/announcements" element={<AnnouncementManagement />} />
        <Route path="admin/settings" element={<AdminSettings />} />
        
        {/* =====================================
            TEACHER ROUTES
            ===================================== */}
        <Route path="teacher/dashboard" element={<TeacherDashboard />} />
        <Route path="teacher/profile" element={<TeacherProfile />} />
        <Route path="teacher/courses" element={<TeacherCourses />} />
        <Route path="teacher/students" element={<StudentManagement />} />
        <Route path="teacher/course/:id" element={<CourseClassroom />} />
        <Route path="teacher/course/:id/manage" element={<TeacherCourseManagement />} />
        <Route path="teacher/assignments" element={<Assignments />} />
        <Route path="teacher/assignment/:id/edit" element={<CreateAssignment />} />
        <Route path="teacher/assignment/:id/submissions" element={<ViewSubmissions />} />
        <Route path="teacher/create-assignment" element={<CreateAssignment />} />
        <Route path="teacher/quizzes" element={<Quizzes />} />
        <Route path="teacher/quiz/create" element={<CreateQuiz />} />
        <Route path="teacher/quiz/:id/edit" element={<CreateQuiz />} />
        <Route path="teacher/quiz/:id/results" element={<ViewSubmissions />} />
        <Route path="teacher/attendance" element={<TeacherAttendance />} />
        <Route path="teacher/reports" element={<TeacherReports />} />
        <Route path="teacher/grievances" element={<TeacherGrievanceManagement />} />
        
        {/* =====================================
            ATTENDANCE ROUTES
            Multi-step attendance marking flow
            ===================================== */}
        <Route path="attendance" element={<Navigate to="/attendance/smart-attendance" replace />} />
        <Route path="attendance/smart-attendance" element={<SmartAttendance />} />
        <Route path="attendance/gps-verification" element={<GPSVerification />} />
        <Route path="attendance/liveness-detection" element={<LivenessDetection />} />
        <Route path="attendance/face-capture" element={<FaceCapture />} />
        <Route path="attendance/biometric-enrollment" element={<BiometricEnrollment />} />
        <Route path="attendance/face-enrollment" element={<Navigate to="/attendance/biometric-enrollment" replace />} />
        <Route path="attendance/confirmation" element={<Confirmation />} />
        <Route path="attendance/success" element={<AttendanceSuccess />} />
        <Route path="attendance/history" element={<AttendanceHistory />} />
        
        {/* =====================================
            LMS ROUTES
            Learning Management System
            ===================================== */}
        <Route path="lms" element={<CourseList />} />
        <Route path="lms/course/:id" element={<CourseClassroom />} />
        <Route path="lms/assignment/:id" element={<AssignmentSubmit />} />
        <Route path="lms/submit/:id" element={<AssignmentSubmit />} />
        <Route path="assignments" element={<MyAssignments />} />
        
        {/* =====================================
            SUPPORT & HELP ROUTES
            ===================================== */}
        <Route path="student/support" element={<MyTickets />} />
        <Route path="support" element={<MyTickets />} />
        <Route path="help-support" element={<HelpSupport />} />
        
        {/* =====================================
            FINANCE ROUTES
            ===================================== */}
        <Route path="finance" element={<FeeVouchers />} />
        
        {/* =====================================
            STUDENT ALUMNI INTERACTION
            ===================================== */}
        <Route path="student/alumni-directory" element={<AlumniDirectory />} />
        
        {/* =====================================
            CHAT ROUTES
            ===================================== */}
        <Route path="chat" element={<ChatPortal />} />
        
        {/* =====================================
            LIBRARY ROUTES
            Student and Librarian access
            ===================================== */}
        <Route path="library" element={<Library />} />
        <Route path="librarian/dashboard" element={<LibrarianDashboard />} />
        <Route path="librarian/profile" element={<LibrarianProfile />} />
        <Route path="librarian/books" element={<BookManagement />} />
        <Route path="librarian/issued" element={<IssuedBooks />} />
        <Route path="librarian/reservations" element={<Reservations />} />
        <Route path="librarian/reports" element={<LibrarianReports />} />
        <Route path="librarian/grievances" element={<LibrarianGrievances />} />
        
        {/* =====================================
            ALUMNI ROUTES
            Alumni portal features
            ===================================== */}
        <Route path="alumni/network" element={<AlumniNetwork />} />
        <Route path="alumni/profile" element={<AlumniProfile />} />
        <Route path="alumni/events" element={<AlumniEvents />} />
        <Route path="alumni/jobs" element={<JobBoard />} />
        <Route path="alumni/mentorship" element={<Mentorship />} />
        <Route path="alumni/stories" element={<SuccessStories />} />
        <Route path="alumni/grievances" element={<Grievances />} />
        
        {/* =====================================
            GRIEVANCE ROUTES
            ===================================== */}
        <Route path="grievances" element={<Grievances />} />
      </Route>

      {/* ============================================
          FALLBACK ROUTE
          Redirect any unknown routes to login
          ============================================ */}
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}

export default App;
