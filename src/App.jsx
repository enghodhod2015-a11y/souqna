import { Suspense } from 'react'
import { AppRoutes } from './routes/AppRoutes'
import { Header } from './components/common/Header'
import { Footer } from './components/common/Footer'

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <Suspense fallback={<div className="text-center py-20">جاري التحميل...</div>}>
          <AppRoutes />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
export default App