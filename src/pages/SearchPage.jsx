import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getProducts } from '../services/productService'
import { ProductCard } from '../components/products/ProductCard'

export default function SearchPage() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProducts()
  }, [query])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const data = await getProducts({ search: query })
      setProducts(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gold mb-6">
        نتائج البحث: {query || 'الكل'}
      </h1>
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

