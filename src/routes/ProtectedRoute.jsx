import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return <div className="text-center py-20">جاري التحقق...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!profile) {
    return <div className="text-center py-20">جاري تحميل البيانات...</div>
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(profile.account_type)) {
    return <Navigate to="/" replace />
  }

  return children
}


