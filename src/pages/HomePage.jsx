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
        {/* القائمة اليسرى (الأقسام) - مربعات احترافية */}
        <aside className="lg:w-1/3">
          <div className="bg-primary-card/90 backdrop-blur-sm rounded-2xl p-5 border border-gold/30 shadow-xl sticky top-20">
            <h2 className="text-xl font-bold text-gold mb-4 border-b border-gold/30 pb-2">📂 الأقسام</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button 
                onClick={() => setSelectedCategory('')}
                className={`w-full text-right px-4 py-3 rounded-xl transition-all duration-300 shadow-md flex items-center gap-2 ${
                  !selectedCategory 
                    ? 'bg-gold text-primary-blue font-bold' 
                    : 'bg-secondary-blue/40 text-white hover:bg-gold/20 hover:text-gold hover:shadow-lg'
                }`}
              >
                <span>📋</span> الكل
              </button>
              {categories.map(cat => (
                <button 
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`w-full text-right px-4 py-3 rounded-xl transition-all duration-300 shadow-md flex items-center gap-2 ${
                    selectedCategory === cat.id 
                      ? 'bg-gold text-primary-blue font-bold' 
                      : 'bg-secondary-blue/40 text-white hover:bg-gold/20 hover:text-gold hover:shadow-lg'
                  }`}
                >
                  <span className="text-xl">{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* منطقة المنتجات الرئيسية */}
        <main className="lg:w-1/2">
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
              {products.map(product => {
                if (!product?.id) return null;
                return <ProductCard key={product.id} product={product} />
              })}
            </div>
          )}
        </main>

        {/* القائمة اليمنى (اكتشف) - مربعات احترافية */}
        <aside className="lg:w-1/4">
          <div className="bg-primary-card/90 backdrop-blur-sm rounded-2xl p-5 border border-gold/30 shadow-xl sticky top-20">
            <h2 className="text-xl font-bold text-gold mb-4 border-b border-gold/30 pb-2">✨ اكتشف</h2>
            <div className="flex flex-col gap-3">
              {sideLinks.map(link => (
                <Link 
                  key={link.slug}
                  to={`/${link.slug}`}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary-blue/40 text-white hover:bg-gold/20 hover:text-gold hover:shadow-lg transition-all duration-300 shadow-md"
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

