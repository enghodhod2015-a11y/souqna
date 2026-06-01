import { Suspense, useEffect } from 'react'
import AppRoutesComponent from './routes/AppRoutes'
import { Header } from './components/common/Header'
import { Footer } from './components/common/Footer'
import { requestNotificationPermission } from './services/notificationService'
import { useAuth } from './contexts/AuthContext'

const AppRoutes = AppRoutesComponent.AppRoutes || AppRoutesComponent;

function App() {
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      requestNotificationPermission()
    }
  }, [user])

  // CHANGED: إعادة توجيه الروابط التي تحتوي على #access_token إلى /souqna/reset-password
  useEffect(() => {
    const hash = window.location.hash
    const path = window.location.pathname
    console.log('🔐 App: path =', path, 'hash =', hash)
    
    // إذا كان هناك access_token في الهاش ولم تكن الصفحة الحالية هي reset-password
    if (hash && hash.includes('access_token') && !path.includes('reset-password')) {
      console.log('🔐 إعادة توجيه إلى /souqna/reset-password مع الاحتفاظ بالهاش')
      window.location.href = `/souqna/reset-password${hash}`
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

