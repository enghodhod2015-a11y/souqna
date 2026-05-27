import { Suspense, lazy } from 'react'
import { AppRoutes } from './routes/AppRoutes'

const Header = lazy(() => import('./components/common/Header').then(module => ({ 
  default: module.Header || module.default 
})))

const Footer = lazy(() => import('./components/common/Footer').then(module => ({ 
  default: module.Footer || module.default 
})))

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Suspense fallback={null}>
        <Header />
      </Suspense>

      <main className="flex-grow">
        <Suspense fallback={<div className="text-center py-20">Loading...</div>}>
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
