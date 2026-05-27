import { Suspense, lazy } from 'react'
import { AppRoutes } from './routes/AppRoutes'

// 🧠 استخدام الاستيراد الديناميكي (Lazy Loading) لتخطي مشاكل تعارض الـ Rollup وحالة الأحرف
const Header = lazy(() => import('./components/common/Header').then(module => ({ 
  default: module.Header || module.default 
})))

const Footer = lazy(() => import('./components/common/Footer').then(module => ({ 
  default: module.Footer || module.default 
})))

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* تغليف الـ Header بالـ Suspense لضمان التحميل الآمن */}
      <Suspense fallback={<div className="text-center py-4 text-text-secondary">جاري تحميل القائمة...</div>}>
        <Header />
      </Suspense>

      <main className="flex-grow">
        <Suspense fallback={<div className="text-center py-20 text-text-secondary">جاري التحميل...</div>}>
          <AppRoutes />
        </Suspense>
      </main>

      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  )
}

export default App
