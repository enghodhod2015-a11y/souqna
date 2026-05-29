import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProducts } from '../services/productService'
import { ProductCard } from '../components/products/ProductCard'
import { Button } from '../components/ui/Button'
import { ChevronLeft } from 'lucide-react'

// قائمة الأقسام
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

// قائمة تسويقية جانبية
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
      setProducts(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 font-[Tajawal]">

      {/* العنوان الأوسط */}
      <h1 className="text-3xl font-bold text-[#D4AF37] mb-8 text-center">مرحباً بكم في سوقنا</h1>

      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* القائمة الجانبية اليمنى - الأقسام */}
        <aside className="lg:w-1/6">
          <div className="bg-[#06264D] rounded-2xl p-4 border-[#D4AF37]/20 sticky top-20 h-fit">
            <h2 className="text-xl font-bold text-[#D4AF37] mb-4 text-center">الأقسام</h2>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => setSelectedCategory('')}
                className={`w-full text-center px-3 py-2 rounded-xl font-bold transition-all duration-200
                  ${!selectedCategory
               ? 'bg-[#D4AF37] text-[#041C3A]'
                    : 'bg-[#0b2f5c] text-white hover:bg-[#D4AF37] hover:text-[#041C3A]'}`}
              >
                الكل
              </button>

              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`w-full text-center px-3 py-2 rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-2
                    ${selectedCategory === cat.id
                 ? 'bg-[#D4AF37] text-[#041C3A]'
                      : 'bg-[#0b2f5c] text-white hover:bg-[#D4AF37] hover:text-[#041C3A]'}`}
                >
                  {cat.name} <span>{cat.icon}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* شبكة المنتجات */}
        <main className="lg:w-4/6">
          {loading? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-[#0b2f5c] rounded-2xl h-80 animate-pulse"></div>
              ))}
            </div>
          ) : products.length === 0? (
            <div className="text-center py-20 text-gray-400">
              لا توجد منتجات في هذا القسم حالياً
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </main>

        {/* القائمة الجانبية اليسرى - التسويقية */}
        <aside className="lg:w-1/6">
          <div className="bg-[#06264D] rounded-2xl p-4 border-[#D4AF37]/20 sticky top-20 h-fit">
            <h2 className="text-xl font-bold text-[#D4AF37] mb-4 text-center">الأقسام التسويقية</h2>

            <div className="flex flex-col gap-2">
              {sideLinks.map(link => (
                <Link
                  key={link.slug}
                  to={`/${link.slug}`}
                  className="w-full text-center px-3 py-2 rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-2 bg-[#0b2f5c] text-white hover:bg-[#D4AF37] hover:text-[#041C3A]"
                >
                  {link.name} <span>{link.icon}</span>
                </Link>
              ))}
            </div>
          </div>
        </aside>

      </div>
    </div>
  )
}