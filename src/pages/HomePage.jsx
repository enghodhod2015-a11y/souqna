import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProducts } from '../services/productService'
import { ProductCard } from '../components/products/ProductCard'
import { useAbortController } from '../hooks/useAbortController'
import { Input } from '../components/ui/Input' // CHANGED: إضافة Input للبحث

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
  // CHANGED: إضافة حالات للبحث المتقدم
  const [searchTerm, setSearchTerm] = useState('')
  const [city, setCity] = useState('')
  const abortController = useAbortController()

  // CHANGED: دالة تحميل تستخدم الفلاتر الجديدة
  useEffect(() => {
    let isMounted = true
    const loadProducts = async () => {
      setLoading(true)
      try {
        const filters = {}
        if (selectedCategory) filters.category = selectedCategory
        if (searchTerm.trim()) filters.search = searchTerm.trim()
        if (city.trim()) filters.city = city.trim()
        const data = await getProducts(filters, abortController?.signal)
        if (isMounted) setProducts(data || [])
      } catch (err) {
        if (isMounted && err.name !== 'AbortError') console.error(err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    loadProducts()
    return () => {
      isMounted = false
      abortController?.abort()
    }
  }, [selectedCategory, searchTerm, city, abortController])

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gold mb-8 text-center">مرحباً بكم في سوقنا</h1>

      {/* CHANGED: إضافة شريط البحث المتقدم */}
      <div className="mb-8 flex flex-col md:flex-row gap-4 items-center justify-center">
        <div className="w-full md:w-1/3">
          <Input
            type="text"
            placeholder="🔍  بحث باسم المنتج..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-right"
          />
        </div>
        <div className="w-full md:w-1/3">
          <Input
            type="text"
            placeholder="📍  المدينة (مثال: الرياض، جدة)..."
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="text-right"
          />
        </div>
        {/* زر مسح الفلاتر (اختياري) */}
        {(searchTerm || city) && (
          <button
            onClick={() => { setSearchTerm(''); setCity(''); }}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
          >
            مسح الفلاتر
          </button>
        )}
      </div>

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
              لا توجد منتجات مطابقة لبحثك
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

