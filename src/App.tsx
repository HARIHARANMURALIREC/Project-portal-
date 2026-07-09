import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LoginPage } from '@/pages/LoginPage'
import { AdminDashboard } from '@/pages/AdminDashboard'
import { CoordinatorDashboard } from '@/pages/CoordinatorDashboard'
import { TeacherDashboard } from '@/pages/teacher/TeacherDashboard'
import { TeacherReviews } from '@/pages/teacher/TeacherReviews'
import { TeacherProfile } from '@/pages/teacher/TeacherProfile'
import { StudentDashboard } from '@/pages/student/StudentDashboard'
import { AvailableTopics } from '@/pages/student/AvailableTopics'
import { MyProject } from '@/pages/student/MyProject'
import { StudentReviews } from '@/pages/student/StudentReviews'
import { StudentProfile } from '@/pages/student/StudentProfile'
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
            path="/coordinator"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <CoordinatorDashboard />
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
            path="/teacher/reviews"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherReviews />
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
            path="/student/profile"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentProfile />
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
