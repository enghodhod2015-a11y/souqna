import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getProducts } from '../services/productService'
import { ProductCard } from '../components/products/ProductCard'
import { SkeletonProductGrid } from '../components/ui/Skeleton'

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

const SidebarItem = ({ children, isActive, onClick, className = '' }) => (
  <button onClick={onClick} className={`w-full text-right px-4 py-3 rounded-lg border transition-all duration-200 ${isActive ? 'bg-gold text-primary-blue font-bold shadow-md border-gold' : 'bg-primary-card text-white border border-gold/40 hover:bg-gold hover:text-primary-blue hover:shadow-md'} ${className}`}>
    {children}
  </button>
)

const SidebarLink = ({ children, to, className = '' }) => (
  <Link to={to} className={`w-full text-right px-4 py-3 rounded-lg border transition-all duration-200 bg-primary-card text-white border border-gold/40 hover:bg-gold hover:text-primary-blue hover:shadow-md ${className}`}>
    {children}
  </Link>
)

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState('')

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', selectedCategory],
    queryFn: () => getProducts({ category: selectedCategory }),
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gold mb-8 text-center">مرحباً بكم في سوقنا</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-1/5">
          <div className="sticky top-20">
            <h2 className="text-xl font-bold text-gold mb-4">الأقسام</h2>
            <div className="bg-primary-card rounded-xl shadow-md p-4 border border-gold/30 flex flex-col gap-3">
              <SidebarItem isActive={!selectedCategory} onClick={() => setSelectedCategory('')}>
                <div className="flex items-center gap-2"><span>📋</span><span>الكل</span></div>
              </SidebarItem>
              {categories.map((cat) => (
                <SidebarItem key={cat.id} isActive={selectedCategory === cat.id} onClick={() => setSelectedCategory(cat.id)}>
                  <div className="flex items-center gap-2"><span className="text-xl">{cat.icon}</span><span>{cat.name}</span></div>
                </SidebarItem>
              ))}
            </div>
          </div>
        </aside>

        <main className="lg:w-3/5">
          {isLoading ? (
            <SkeletonProductGrid count={6} />
          ) : products.length === 0 ? (
            <div className="text-center py-20 text-text-secondary">لا توجد منتجات في هذا القسم حالياً</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {products.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          )}
        </main>

        <aside className="lg:w-1/5">
          <div className="sticky top-20">
            <h2 className="text-xl font-bold text-gold mb-4">اكتشف</h2>
            <div className="bg-primary-card rounded-xl shadow-md p-4 border border-gold/30 flex flex-col gap-3">
              {sideLinks.map((link) => (
                <SidebarLink key={link.slug} to={`/${link.slug}`}>
                  <div className="flex items-center gap-2"><span className="text-xl">{link.icon}</span><span>{link.name}</span></div>
                </SidebarLink>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}


