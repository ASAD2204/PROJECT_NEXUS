# Project Nexus - Quick Start Guide

## 🚀 How to Run

1. Open terminal in project folder
2. Run: `npm run dev`
3. Open: `http://localhost:5173/`
4. Login with any credentials (e.g., email: `test@test.com`, password: `test`)

## 📋 What's Included

### ✅ Completed Features

1. **Authentication Module**
   - Login page with split-screen design
   - Forgot password flow
   - OTP verification

2. **Student Dashboard**
   - CGPA card with trend
   - Attendance circular progress (85%)
   - Pending fees display
   - Pending tasks count
   - GPA line chart (7 semesters)
   - Active courses with progress bars
   - Quick action buttons

3. **Smart Attendance**
   - Biometric camera interface
   - Face detection simulation
   - Geofence verification
   - Real-time status indicators
   - Attendance marking functionality
   - History page with table view

4. **Learning Management System**
   - Course grid with beautiful cards
   - Course classroom with tabs (Stream, Assignments, Quizzes, Content)
   - Assignment submission with drag-drop file upload
   - Status badges for assignments
   - Announcements feed

5. **Finance Module**
   - Fee vouchers list
   - Payment status badges
   - Mock payment gateway with credit card form
   - Real-time payment processing simulation
   - Receipt download option for paid invoices

6. **Nexus Chat**
   - AI chatbot with context-aware responses
   - Citation chips for sources
   - Toggle between AI and human support
   - Real-time message interface
   - Auto-scroll to latest message

7. **Student Profile**
   - Editable profile information
   - Guardian details
   - Academic information display
   - Risk status badge

8. **Transcript**
   - Semester-wise course grades
   - CGPA calculation
   - Credits summary
   - Download option

## 🎨 Design Highlights

- **Colors:**
  - Primary Blue: `#1976D2`
  - Secondary Teal: `#00796B`
  - Background: `#F4F6F8`
  
- **UI Elements:**
  - 12px border radius throughout
  - Consistent spacing using MUI Grid
  - Smooth hover effects
  - Material elevation shadows

## 📱 Navigation

**Sidebar Menu:**
1. Dashboard
2. My Courses
3. Attendance
4. Assignments
5. Fee Management
6. Nexus Chat
7. Profile
8. Transcript

**Top Bar:**
- Greeting with user name
- Notification bell (3 notifications)
- User avatar with dropdown menu
  - Profile
  - Logout

## 🔧 Mock Data Location

File: `src/data/dummyData.js`

Contains:
- 1 current user (Muhammad Asad)
- 4 courses with instructors
- 8 attendance records
- 5 assignments (various statuses)
- 3 quizzes
- 4 fee invoices
- 3 announcements
- 7 semesters of GPA data
- 2 semesters of transcript
- Chat message history

## 🎯 Key Technologies Used

- React 18.3
- Material UI 5
- React Router v6
- Recharts (for GPA graph)
- Vite (build tool)

## 🐛 Known Limitations

- This is a frontend prototype only
- No real backend API calls
- All data persists in memory only (refreshing page resets changes)
- User authentication uses localStorage
- No real file upload (files not actually stored)
- No real payment processing

## 📊 Statistics

- **Total Files Created:** 35+
- **Total Components:** 20+
- **Total Routes:** 15+
- **Lines of Code:** ~3500+

## 🎓 Project Metadata

**Type:** Final Year Project (FYP) Frontend Prototype
**Student:** Muhammad Asad
**Program:** BS Information Technology
**Semester:** 7
**Purpose:** Demonstrate full-stack web development skills

## 💡 Next Steps (Future Enhancements)

1. Connect to real backend API
2. Add real database integration
3. Implement real file upload to cloud storage
4. Add more interactive features
5. Implement notifications system
6. Add calendar/timetable view
7. Add grade analytics
8. Implement peer-to-peer chat
9. Add mobile app version
10. Deploy to production

---

**Status:** ✅ Fully Functional Prototype
**Development Server:** Running on http://localhost:5173/
**Last Updated:** December 29, 2025
