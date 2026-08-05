import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LoginPage } from '@/pages/LoginPage'
import { AdminDashboard } from '@/pages/AdminDashboard'
import { AdminUploads } from '@/pages/admin/AdminUploads'
import { AdminMarks } from '@/pages/admin/AdminMarks'
import { CoordinatorDashboard } from '@/pages/CoordinatorDashboard'
import { CoordinatorUploads } from '@/pages/coordinator/CoordinatorUploads'
import { CoordinatorMarks } from '@/pages/coordinator/CoordinatorMarks'
import { CoordinatorProfile } from '@/pages/coordinator/CoordinatorProfile'
import { CoordinatorTemplates } from '@/pages/coordinator/CoordinatorTemplates'
import { CoordinatorSdg } from '@/pages/coordinator/CoordinatorSdg'
import { CoordinatorPublications } from '@/pages/coordinator/CoordinatorPublications'
import { TeacherDashboard } from '@/pages/teacher/TeacherDashboard'
import { TeacherBatchDashboard } from '@/pages/teacher/TeacherBatchDashboard'
import { TeacherReviews } from '@/pages/teacher/TeacherReviews'
import { TeacherReviewer } from '@/pages/teacher/TeacherReviewer'
import { TeacherProfile } from '@/pages/teacher/TeacherProfile'
import { TeacherTemplates } from '@/pages/teacher/TeacherTemplates'
import { TeacherSdg } from '@/pages/teacher/TeacherSdg'
import { TeacherPublications } from '@/pages/teacher/TeacherPublications'
import { StudentDashboard } from '@/pages/student/StudentDashboard'
import { AvailableTopics } from '@/pages/student/AvailableTopics'
import { MyProject } from '@/pages/student/MyProject'
import { StudentReviews } from '@/pages/student/StudentReviews'
import { StudentDetails } from '@/pages/student/StudentDetails'
import { StudentProfile } from '@/pages/student/StudentProfile'
import { StudentUploads } from '@/pages/student/StudentUploads'
import { StudentSdg } from '@/pages/student/StudentSdg'
import { StudentPublications } from '@/pages/student/StudentPublications'
import { useTheme } from '@/context/ThemeContext'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

function ThemedToaster() {
  const { theme } = useTheme()
  return <Toaster position="top-right" richColors theme={theme} />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/uploads"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminUploads />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/marks"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminMarks />
              </ProtectedRoute>
            }
          />
          <Route
            path="/coordinator"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <CoordinatorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/coordinator/uploads"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <CoordinatorUploads />
              </ProtectedRoute>
            }
          />
          <Route
            path="/coordinator/marks"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <CoordinatorMarks />
              </ProtectedRoute>
            }
          />
          <Route
            path="/coordinator/profile"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <CoordinatorProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/coordinator/templates"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <CoordinatorTemplates />
              </ProtectedRoute>
            }
          />
          <Route
            path="/coordinator/sdg"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <CoordinatorSdg />
              </ProtectedRoute>
            }
          />
          <Route
            path="/coordinator/publications"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <CoordinatorPublications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/batch"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherBatchDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/reviews"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherReviews />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/reviewer"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherReviewer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/profile"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/templates"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherTemplates />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/sdg"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherSdg />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/publications"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherPublications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/topics"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <AvailableTopics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/my-project"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <MyProject />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/reviews"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentReviews />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/details"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/profile"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/uploads"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentUploads />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/sdg"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentSdg />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/publications"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentPublications />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
      <ThemedToaster />
    </QueryClientProvider>
  )
}
