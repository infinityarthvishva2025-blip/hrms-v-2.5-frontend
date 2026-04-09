import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';

import Login from '../pages/auth/Login';
import Dashboard from '../pages/dashboard/Dashboard';
import AttendancePage from '../pages/attendance/AttendancePage';
import AttendanceSummary from '../pages/attendance/AttendanceSummary';
import AdminAttendance from '../pages/attendance/AdminAttendance';
import DailyReports from '../pages/attendance/DailyReports';
import EmployeeList from '../pages/employees/EmployeeList';
import CreateEmployee from '../pages/employees/CreateEmployee';
import EditEmployee from '../pages/employees/EditEmployee';
import ProfilePage from '../pages/profile/ProfilePage';
import MyLeaves from '../pages/leaves/MyLeaves';
import ApplyLeave from '../pages/leaves/ApplyLeave';
import LeaveApproval from '../pages/leaves/LeaveApproval';
import LeaveDashboard from '../pages/leaves/LeaveDashboard';
import Announcements from '../pages/announcements/Announcements';
import ManageAnnouncements from '../pages/announcements/ManageAnnouncements';
import HolidayManagement from '../pages/holidays/HolidayManagement';
import CorrectionApproval from '../pages/attendance/CorrectionApproval';
import PayrollDashboard from '../pages/payroll/PayrollDashboard';
import EmployeePayroll from '../pages/payroll/EmployeePayroll';
import VideoList from '../pages/gurukul/VideoList';
import VideoDetail from '../pages/gurukul/VideoDetail';
import EmployeeAttendance from '../pages/attendance/EmployeeAttendance';

const CAN_CREATE = ['SuperUser', 'HR', 'Director', 'VP', 'GM'];
const ALL_ROLES = ['SuperUser', 'HR', 'Manager', 'Director', 'VP', 'GM', 'Employee', 'Intern'];
const MANAGEMENT_PLUS = ['SuperUser', 'HR', 'Director', 'VP', 'GM', 'Manager'];

const AppRouter = () => (
  <AuthProvider>
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.9rem',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          },
          success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route path="/dashboard" element={
          <ProtectedRoute allowedRoles={ALL_ROLES}><Dashboard /></ProtectedRoute>
        } />

        <Route path="/profile" element={
          <ProtectedRoute allowedRoles={ALL_ROLES}><ProfilePage /></ProtectedRoute>
        } />

        <Route path="/attendance" element={
          <ProtectedRoute allowedRoles={ALL_ROLES}><AttendancePage /></ProtectedRoute>
        } />
        <Route path="/attendance/summary" element={
          <ProtectedRoute allowedRoles={ALL_ROLES}><AttendanceSummary /></ProtectedRoute>
        } />
        <Route path="/attendance/admin" element={
          <ProtectedRoute allowedRoles={MANAGEMENT_PLUS}><AdminAttendance /></ProtectedRoute>
        } />
        <Route path="/attendance/reports" element={
          <ProtectedRoute allowedRoles={MANAGEMENT_PLUS}><DailyReports /></ProtectedRoute>
        } />
                <Route path="/attendance/employee/attendance" element={
          <ProtectedRoute allowedRoles={MANAGEMENT_PLUS}><EmployeeAttendance /></ProtectedRoute>
        } />
        <Route path="/attendance/corrections" element={
          <ProtectedRoute allowedRoles={MANAGEMENT_PLUS}><CorrectionApproval /></ProtectedRoute>
        } />

        {/* Leaves */}
        <Route path="/leaves" element={
          <ProtectedRoute allowedRoles={ALL_ROLES}><MyLeaves /></ProtectedRoute>
        } />
        <Route path="/leaves/apply" element={
          <ProtectedRoute allowedRoles={ALL_ROLES}><ApplyLeave /></ProtectedRoute>
        } />
        <Route path="/leave-approvals" element={
          <ProtectedRoute allowedRoles={MANAGEMENT_PLUS}><LeaveApproval /></ProtectedRoute>
        } />
        <Route path="/leave-dashboard" element={
          <ProtectedRoute allowedRoles={['SuperUser', 'HR', 'Director']}><LeaveDashboard /></ProtectedRoute>
        } />

        {/* Holidays */}
        <Route path="/holidays" element={
          <ProtectedRoute allowedRoles={ALL_ROLES}><HolidayManagement /></ProtectedRoute>
        } />

        {/* Payroll */}
        <Route path="/payroll" element={
          <ProtectedRoute allowedRoles={['SuperUser', 'HR', 'Director']}><PayrollDashboard /></ProtectedRoute>
        } />
        <Route path="/payroll/my" element={
          <ProtectedRoute allowedRoles={ALL_ROLES}><EmployeePayroll /></ProtectedRoute>
        } />

        {/* Announcements */}


        <Route path="/announcements" element={
          <ProtectedRoute allowedRoles={ALL_ROLES}><Announcements /></ProtectedRoute>
        } />

        {/* gurukul */}


        <Route path="/gurukul" element={
          <ProtectedRoute allowedRoles={ALL_ROLES}><VideoList /></ProtectedRoute>
        } />

                <Route path="/gurukul/:id" element={
          <ProtectedRoute allowedRoles={ALL_ROLES}><VideoDetail /></ProtectedRoute>
        } />



        <Route path="/manage-announcements" element={
          <ProtectedRoute allowedRoles={MANAGEMENT_PLUS}><ManageAnnouncements /></ProtectedRoute>
        } />

        <Route path="/employees" element={
          <ProtectedRoute allowedRoles={MANAGEMENT_PLUS}><EmployeeList /></ProtectedRoute>
        } />
        <Route path="/employees/create" element={
          <ProtectedRoute allowedRoles={CAN_CREATE}><CreateEmployee /></ProtectedRoute>
        } />
        <Route path="/employees/:id/edit" element={
          <ProtectedRoute allowedRoles={CAN_CREATE}><EditEmployee /></ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

export default AppRouter;
