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
import Profile from './pages/Student/Profile';
import Transcript from './pages/Student/Transcript';
import MyAssignments from './pages/Student/MyAssignments';
import MyTickets from './pages/Student/MyTickets';
import Notifications from './pages/Student/Notifications';
import AlumniDirectory from './pages/Student/AlumniDirectory';

// Admin Pages
import AdminDashboard from './pages/Admin/Dashboard';
import UserManagement from './pages/Admin/UserManagement';
import AdminCourseManagement from './pages/Admin/CourseManagement';
import AdminReports from './pages/Admin/Reports';
import AdminFinance from './pages/Admin/FinanceManagement';
import AdminGrievanceManagement from './pages/Admin/GrievanceManagement';
import AdminSettings from './pages/Admin/Settings';
import AlumniManagement from './pages/Admin/AlumniManagement';
import DepartmentManagement from './pages/Admin/DepartmentManagement';

// Teacher Pages
import TeacherDashboard from './pages/Teacher/Dashboard';
import TeacherCourses from './pages/Teacher/MyCourses';
import StudentManagement from './pages/Teacher/StudentManagement';
import TeacherReports from './pages/Teacher/Reports';
import TeacherCourseManagement from './pages/Teacher/CourseManagement';
import CreateAssignment from './pages/Teacher/CreateAssignment';
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
import BookManagement from './pages/Library/BookManagement';
import IssuedBooks from './pages/Library/IssuedBooks';
import Reservations from './pages/Library/Reservations';
import LibrarianReports from './pages/Library/LibrarianReports';
import LibrarianGrievances from './pages/Library/LibrarianGrievances';
import Grievances from './pages/Grievances/Grievances';
import AlumniNetwork from './pages/Alumni/AlumniNetwork';
import AlumniEvents from './pages/Alumni/AlumniEvents';
import JobBoard from './pages/Alumni/JobBoard';
import Mentorship from './pages/Alumni/Mentorship';
import SuccessStories from './pages/Alumni/SuccessStories';
import TeacherGrievanceManagement from './pages/Teacher/GrievanceManagement';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  const navigate = useNavigate();
  const { userType, isAuthenticated } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [splashComplete, setSplashComplete] = useState(false);

  useEffect(() => {
    // Check if splash has been shown in this session
    const splashShown = sessionStorage.getItem('splashShown');
    if (splashShown) {
      setShowSplash(false);
      setSplashComplete(true);
    }
  }, []);

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

  // Default dashboard based on user type
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
        return '/dashboard';
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
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/otp" element={<OTP />} />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to={getDefaultDashboard()} />} />
        
        {/* Student Routes */}
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="profile" element={<Profile />} />
        <Route path="transcript" element={<Transcript />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="notifications" element={<Notifications />} />
        
        {/* Admin Routes */}
        <Route path="admin/dashboard" element={<AdminDashboard />} />
        <Route path="admin/users" element={<UserManagement />} />
        <Route path="admin/courses" element={<AdminCourseManagement />} />
        <Route path="admin/departments" element={<DepartmentManagement />} />
        <Route path="admin/alumni" element={<AlumniManagement />} />
        <Route path="admin/reports" element={<AdminReports />} />
        <Route path="admin/finance" element={<AdminFinance />} />
        <Route path="admin/grievances" element={<AdminGrievanceManagement />} />
        <Route path="admin/settings" element={<AdminSettings />} />
        
        {/* Teacher Routes */}
        <Route path="teacher/dashboard" element={<TeacherDashboard />} />
        <Route path="teacher/courses" element={<TeacherCourses />} />
        <Route path="teacher/students" element={<StudentManagement />} />
        <Route path="teacher/course/:id" element={<CourseClassroom />} />
        <Route path="teacher/course/:id/manage" element={<TeacherCourseManagement />} />
        <Route path="teacher/assignments" element={<Assignments />} />
        <Route path="teacher/assignment/:id/edit" element={<CreateAssignment />} />
        <Route path="teacher/assignment/:id/submissions" element={<ViewSubmissions />} />
        <Route path="teacher/create-assignment" element={<CreateAssignment />} />
        <Route path="teacher/quizzes" element={<Quizzes />} />
        <Route path="teacher/quiz/create" element={<CreateAssignment />} />
        <Route path="teacher/quiz/:id/edit" element={<CreateAssignment />} />
        <Route path="teacher/quiz/:id/results" element={<ViewSubmissions />} />
        <Route path="teacher/attendance" element={<TeacherAttendance />} />
        <Route path="teacher/reports" element={<TeacherReports />} />
        
        {/* Attendance Routes */}
        <Route path="attendance" element={<Navigate to="/attendance/smart-attendance" replace />} />
        <Route path="attendance/smart-attendance" element={<SmartAttendance />} />
        <Route path="attendance/gps-verification" element={<GPSVerification />} />
        <Route path="attendance/liveness-detection" element={<LivenessDetection />} />
        <Route path="attendance/face-capture" element={<FaceCapture />} />
        <Route path="attendance/confirmation" element={<Confirmation />} />
        <Route path="attendance/success" element={<AttendanceSuccess />} />
        <Route path="attendance/history" element={<AttendanceHistory />} />
        
        {/* LMS Routes */}
        <Route path="lms" element={<CourseList />} />
        <Route path="lms/course/:id" element={<CourseClassroom />} />
        <Route path="lms/assignment/:id" element={<AssignmentSubmit />} />
        <Route path="lms/submit/:id" element={<AssignmentSubmit />} />
        <Route path="assignments" element={<MyAssignments />} />
        
        {/* Support Routes */}
        <Route path="student/support" element={<MyTickets />} />
        <Route path="support" element={<MyTickets />} />
        
        {/* Finance Routes */}
        <Route path="finance" element={<FeeVouchers />} />
                {/* Student Alumni Interaction Routes */}
        <Route path="student/alumni-directory" element={<AlumniDirectory />} />
                {/* Chat Routes */}
        <Route path="chat" element={<ChatPortal />} />
        
        {/* Library Routes */}
        <Route path="library" element={<Library />} />
        <Route path="librarian/dashboard" element={<LibrarianDashboard />} />
        <Route path="librarian/books" element={<BookManagement />} />
        <Route path="librarian/issued" element={<IssuedBooks />} />
        <Route path="librarian/reservations" element={<Reservations />} />
        <Route path="librarian/reports" element={<LibrarianReports />} />
        <Route path="librarian/grievances" element={<LibrarianGrievances />} />
        
        {/* Alumni Routes */}
        <Route path="alumni/network" element={<AlumniNetwork />} />
        <Route path="alumni/events" element={<AlumniEvents />} />
        <Route path="alumni/jobs" element={<JobBoard />} />
        <Route path="alumni/mentorship" element={<Mentorship />} />
        <Route path="alumni/stories" element={<SuccessStories />} />
        <Route path="alumni/grievances" element={<Grievances />} />
        
        {/* Grievances */}
        <Route path="grievances" element={<Grievances />} />
        <Route path="teacher/grievances" element={<TeacherGrievanceManagement />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}

export default App;
