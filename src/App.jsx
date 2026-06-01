import { Suspense, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AppRoutesComponent from './routes/AppRoutes'
import { Header } from './components/common/Header'
import { Footer } from './components/common/Footer'
import { requestNotificationPermission } from './services/notificationService'
import { useAuth } from './contexts/AuthContext'

const AppRoutes = AppRoutesComponent.AppRoutes || AppRoutesComponent;

function App() {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      requestNotificationPermission()
    }
  }, [user])

  // إعادة توجيه أي رابط يحتوي على #access_token إلى /reset-password مع الاحتفاظ بالـ hash
  useEffect(() => {
    const hash = window.location.hash
    if (hash && hash.includes('access_token') && !window.location.pathname.includes('reset-password')) {
      window.location.href = `/reset-password${hash}`
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <Suspense fallback={<div className="text-center py-20">Loading...</div>}>
          <AppRoutes />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}

export default App

