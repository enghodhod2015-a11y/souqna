import { Suspense, useEffect } from 'react'
import AppRoutesComponent from './routes/AppRoutes'
import { Header } from './components/common/Header'
import { Footer } from './components/common/Footer'
import { requestNotificationPermission } from './services/notificationService'
import { useAuth } from './contexts/AuthContext'
import { NotificationListener } from './components/NotificationListener'   // <-- أضف هذا الاستيراد

const AppRoutes = AppRoutesComponent.AppRoutes || AppRoutesComponent;

function App() {
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      requestNotificationPermission()
    }
  }, [user])

  return (
    <NotificationListener>   {/* <-- غلف التطبيق */}
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow">
          <Suspense fallback={<div className="text-center py-20">Loading...</div>}>
            <AppRoutes />
          </Suspense>
        </main>
        <Footer />
      </div>
    </NotificationListener>
  )
}

export default App

