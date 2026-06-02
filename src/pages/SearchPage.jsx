import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { getProducts } from '../services/productService'
import { ProductCard } from '../components/products/ProductCard'
import { Button } from '../components/ui/Button'

// CHANGED: قائمة المحافظات اليمنية
const governorates = [
  'أمانة العاصمة (صنعاء)',
  'محافظة صنعاء',
  'محافظة عدن',
  'محافظة تعز',
  'محافظة الحديدة',
  'محافظة إب',
  'محافظة حضرموت',
  'محافظة مأرب',
  'محافظة الجوف',
  'محافظة حجة',
  'محافظة ذمار',
  'محافظة أبين',
  'محافظة البيضاء',
  'محافظة المهرة',
  'محافظة شبوة',
  'محافظة صعدة',
  'محافظة الضالع',
  'محافظة لحج',
  'محافظة المحويت',
  'محافظة ريمة',
  'محافظة عمران',
  'أرخبيل سقطرى'
]

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const query = searchParams.get('q') || ''
  const city = searchParams.get('city') || ''
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState(query)
  const [selectedCity, setSelectedCity] = useState(city)

  useEffect(() => {
    loadProducts()
  }, [query, city])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const filters = {}
      if (query) filters.search = query
      if (city) filters.city = city
      const data = await getProducts(filters)
      setProducts(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const params = {}
    if (searchTerm.trim()) params.q = searchTerm.trim()
    if (selectedCity) params.city = selectedCity
    setSearchParams(params)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gold mb-6 text-right">البحث المتقدم</h1>

      {/* CHANGED: نموذج البحث */}
      <div className="bg-primary-card p-6 rounded-2xl border border-gold/30 mb-8">
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-right text-text-secondary mb-1">اسم المنتج</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="أدخل اسم المنتج..."
              className="w-full px-4 py-2 rounded-lg bg-white text-gray-900 border border-gold/30 focus:outline-none focus:border-gold"
            />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-right text-text-secondary mb-1">المدينة / المحافظة</label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-white text-gray-900 border border-gold/30 focus:outline-none focus:border-gold"
            >
              <option value="">جميع المحافظات</option>
              {governorates.map(gov => (
                <option key={gov} value={gov}>{gov}</option>
              ))}
            </select>
          </div>
          <Button type="submit" className="w-full md:w-auto px-6 py-2 bg-gold text-primary-blue font-bold rounded-lg hover:bg-gold/90 transition">
            بحث
          </Button>
        </form>
      </div>

      <h2 className="text-xl font-bold text-gold mb-4">
        نتائج البحث: {query || 'الكل'} {city ? `في ${city}` : ''}
      </h2>
      {loading ? (
        <div className="text-center py-20">جاري البحث...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 text-text-secondary">
          لا توجد نتائج للبحث
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}

