import { Suspense } from 'react'
import AppRoutesComponent from './routes/AppRoutes'
import { Header } from './components/common/Header'
import { Footer } from './components/common/Footer'
import { NotificationListener } from './components/NotificationListener'

const AppRoutes = AppRoutesComponent.AppRoutes || AppRoutesComponent;

function App() {
  return (
    <NotificationListener>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow">
          <Suspense fallback={<div className="text-center py-20">جاري التحميل...</div>}>
            <AppRoutes />
          </Suspense>
        </main>
        <Footer />
      </div>
    </NotificationListener>
  )
}

export default App

