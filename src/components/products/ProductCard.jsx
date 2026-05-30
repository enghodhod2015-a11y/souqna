import { Link } from 'react-router-dom'
import { ShoppingCart, MessageCircle, Star } from 'lucide-react'
import { Button } from '../ui/Button'

export const ProductCard = ({ product }) => {
  if (!product || !product.id) return null;

  const imageUrl = product.cover_image || (product.images && product.images[0]) || 'https://placehold.co/400x200/06264D/D4AF37?text=صورة';

  return (
    <div className="bg-primary-card rounded-2xl overflow-hidden border border-gold/30 hover:border-gold transition-all duration-300">
      <Link to={`/product/${product.id}`}>
        <img 
          src={imageUrl}
          alt={product.title} 
          className="w-full h-48 object-cover hover:scale-105 transition duration-300"
          onError={(e) => { e.target.src = 'https://placehold.co/400x200/06264D/D4AF37?text=صورة' }}
        />
      </Link>
      <div className="p-4">
        <Link to={`/product/${product.id}`}>
          <h3 className="text-lg font-bold mb-1 line-clamp-1 text-white">{product.title}</h3>
        </Link>
        <div className="flex items-center gap-1 mb-2">
          {[...Array(5)].map((_, i) => (
            <Star key={i} size={16} className={i < Math.floor(product.average_rating || 0) ? 'text-gold fill-gold' : 'text-gray-400'} />
          ))}
          <span className="text-text-secondary text-sm ml-2">({product.total_reviews || 0})</span>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl font-bold text-gold">{product.final_price} ريال</span>
          {product.discount_percentage > 0 && (
            <span className="text-text-secondary line-through text-sm">{product.price} ريال</span>
          )}
        </div>
        <div className="flex gap-2">
          <Link to={`/checkout`} state={{ product, quantity: 1 }} className="flex-1">
            <Button className="w-full text-sm py-1.5">
              <ShoppingCart size={16} className="inline ml-1" /> شراء
            </Button>
          </Link>
          <Link to={`/chat/product/${product.id}`} className="flex-1">
            <Button variant="secondary" className="w-full text-sm py-1.5">
              <MessageCircle size={16} className="inline ml-1" /> استعلام
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

