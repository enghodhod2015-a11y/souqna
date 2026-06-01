import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProducts } from '../services/productService'
import { ProductCard } from '../components/products/ProductCard'
import { useAbortController } from '../hooks/useAbortController'

const categories = [
  { id: 'electronics', name: 'الإلكترونيات', icon: '📱' },
  { id: 'fashion', name: 'الأزياء والموضة', icon: '👗' },
  { id: 'beauty', name: 'الجمال والعناية', icon: '💄' },
  { id: 'vehicles', name: 'السيارات وقطع الغيار', icon: '🚗' },
  { id: 'home', name: 'البيت والمطبخ', icon: '🏠' },
  { id: 'baby', name: 'الأم والطفل', icon: '👶' },
  { id: 'grocery', name: 'السوبر ماركت', icon: '🛒' },
  { id: 'books', name: 'الكتب والقرطاسية', icon: '📚' },
  { id: 'pets', name: 'الحيوانات الأليفة', icon: '🐶' }
]

const sideLinks = [
  { name: 'الأكثر مبيعاً', slug: 'best-selling', icon: '🔥' },
  { name: 'عروض وخصومات', slug: 'offers', icon: '🏷️' },
  { name: 'وصل حديثاً', slug: 'new-arrivals', icon: '🆕' },
  { name: 'تصفية المخزون', slug: 'clearance', icon: '⚡' },
  { name: 'مميز / مختار لك', slug: 'featured', icon: '⭐' }
]

const SidebarItem = ({ children, isActive, onClick, className = '' }) => {
  return (
    <button
      onClick={onClick}
      className={`
        w-full text-right px-4 py-3 rounded-lg border transition-all duration-200
        ${isActive 
          ? 'bg-gold text-primary-blue font-bold shadow-md border-gold' 
          : 'bg-primary-card text-white border border-gold/40 hover:bg-gold hover:text-primary-blue hover:shadow-md'
        }
        ${className}
      `}
    >
      {children}
    </button>
  )
}

const SidebarLink = ({ children, to, className = '' }) => {
  return (
    <Link
      to={to}
      className={`
        w-full text-right px-4 py-3 rounded-lg border transition-all duration-200
        bg-primary-card text-white border border-gold/40 hover:bg-gold hover:text-primary-blue hover:shadow-md
        ${className}
      `}
    >
      {children}
    </Link>
  )
}

export default function HomePage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('')
  const abortController = useAbortController()

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      abortController?.abort()
    }, 15000)

    loadProducts()

    return () => {
      clearTimeout(timeoutId)
      abortController?.abort()
    }
  }, [selectedCategory])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const filters = {}
      if (selectedCategory) filters.category = selectedCategory
      const data = await getProducts(filters, abortController?.signal)
      if (!abortController?.signal.aborted) {
        setProducts(data || [])
      }
    } catch (err) {
      if (err.name !== 'AbortError') console.error(err)
    } finally {
      if (!abortController?.signal.aborted) setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gold mb-8 text-center">مرحباً بكم في سوقنا</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-1/5">
          <div className="sticky top-20">
            <h2 className="text-xl font-bold text-gold mb-4">الأقسام</h2>
            <div className="bg-primary-card rounded-xl shadow-md p-4 border border-gold/30 flex flex-col gap-3">
              <SidebarItem
                isActive={!selectedCategory}
                onClick={() => setSelectedCategory('')}
              >
                <div className="flex items-center gap-2">
                  <span>📋</span>
                  <span>الكل</span>
                </div>
              </SidebarItem>
              {categories.map((cat) => (
                <SidebarItem
                  key={cat.id}
                  isActive={selectedCategory === cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{cat.icon}</span>
                    <span>{cat.name}</span>
                  </div>
                </SidebarItem>
              ))}
            </div>
          </div>
        </aside>

        <main className="lg:w-3/5">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-primary-card rounded-2xl h-80 animate-pulse"></div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 text-text-secondary">
              لا توجد منتجات في هذا القسم حالياً
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {products.map((product) => {
                if (!product?.id) return null
                return <ProductCard key={product.id} product={product} />
              })}
            </div>
          )}
        </main>

        <aside className="lg:w-1/5">
          <div className="sticky top-20">
            <h2 className="text-xl font-bold text-gold mb-4">اكتشف</h2>
            <div className="bg-primary-card rounded-xl shadow-md p-4 border border-gold/30 flex flex-col gap-3">
              {sideLinks.map((link) => (
                <SidebarLink key={link.slug} to={`/${link.slug}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{link.icon}</span>
                    <span>{link.name}</span>
                  </div>
                </SidebarLink>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

