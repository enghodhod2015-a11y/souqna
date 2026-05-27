import { Suspense } from 'react'
// ✅ استيراد مرن يتكيف مع الـ Default أو الـ Named export لمنع انهيار الـ Rollup فوراً
import AppRoutesComponent from './routes/AppRoutes'
import { Header } from './components/common/Header'
import { Footer } from './components/common/Footer'

// فحص أمني لتحديد الكائن الصحيح برمجياً قبل الاستخدام
const AppRoutes = AppRoutesComponent.AppRoutes || AppRoutesComponent;

function App() {
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
