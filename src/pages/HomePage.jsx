import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProducts } from '../services/productService'
import { ProductCard } from '../components/products/ProductCard'

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

export default function HomePage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('')

  useEffect(() => {
    loadProducts()
  }, [selectedCategory])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const filters = {}
      if (selectedCategory) filters.category = selectedCategory
      const data = await getProducts(filters)
      setProducts(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gold mb-8 text-center">مرحباً بكم في سوقنا</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* القائمة اليسرى (الأقسام) - كل قسم داخل مربع مع شبكة 2x5 */}
        <aside className="lg:w-1/4">
          <div className="sticky top-20">
            <h2 className="text-xl font-bold text-gold mb-4">الأقسام</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSelectedCategory('')}
                className={`flex items-center justify-center gap-2 text-center px-3 py-3 rounded-xl transition-all duration-300 shadow-sm ${
                  !selectedCategory
                    ? 'bg-gold text-primary-blue font-bold shadow-md'
                    : 'bg-primary-card text-white border border-gold/40 hover:bg-gold hover:text-primary-blue hover:shadow-md'
                }`}
              >
                <span>📋</span>
                <span>الكل</span>
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl transition-all duration-300 shadow-sm ${
                    selectedCategory === cat.id
                      ? 'bg-gold text-primary-blue font-bold shadow-md'
                      : 'bg-primary-card text-white border border-gold/40 hover:bg-gold hover:text-primary-blue hover:shadow-md'
                  }`}
                >
                  <span className="text-xl">{cat.icon}</span>
                  <span className="text-sm whitespace-nowrap">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* منطقة المنتجات الرئيسية */}
        <main className="lg:w-2/4">
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

        {/* القائمة اليمنى (اكتشف) - كل رابط داخل مربع */}
        <aside className="lg:w-1/4">
          <div className="sticky top-20">
            <h2 className="text-xl font-bold text-gold mb-4">اكتشف</h2>
            <div className="flex flex-col gap-3">
              {sideLinks.map((link) => (
                <Link
                  key={link.slug}
                  to={`/${link.slug}`}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary-card text-white border border-gold/40 hover:bg-gold hover:text-primary-blue transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  <span className="text-xl">{link.icon}</span>
                  <span>{link.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

