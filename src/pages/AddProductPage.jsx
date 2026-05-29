import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { addProduct, uploadProductImages, updateProduct } from '../services/productService'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import toast from 'react-hot-toast'

const categories = ['electronics', 'fashion', 'beauty', 'vehicles', 'home', 'baby', 'grocery', 'books', 'pets']

export default function AddProductPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    discount_percentage: 0,
    category: categories[0],
    stock_quantity: '',
    city: '',
    contact_number: '',
    condition: 'new',
    is_featured: false
  })
  const [imageFiles, setImageFiles] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])

  if (!user || profile?.account_type !== 'seller') {
    return <div className="text-center py-20">غير مصرح لك – يجب أن تكون بائعاً</div>
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files)
    setImageFiles(files)
    setImagePreviews(files.map(file => URL.createObjectURL(file)))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      // حساب compare_at_price من نسبة الخصم
      let compare_at_price = null
      if (formData.discount_percentage > 0 && formData.price) {
        const originalPrice = parseFloat(formData.price) / (1 - formData.discount_percentage / 100)
        compare_at_price = parseFloat(originalPrice.toFixed(2))
      }

      // تحويل البيانات إلى ما يتوقعه الجدول
      const productData = {
        seller_id: user.id,
        name: formData.title,
        slug: formData.title.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
        description: formData.description,
        price: parseFloat(formData.price),
        compare_at_price: compare_at_price,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        category: formData.category,
        city: formData.city,
        condition: formData.condition,
        is_featured: formData.is_featured,
        is_hidden: false,
        is_approved: true,
        is_active: true,
        images: [],
        cover_image: ''
      }

      const newProduct = await addProduct(productData)
      if (!newProduct?.id) throw new Error('لم يتم استلام معرف المنتج')

      if (imageFiles.length > 0) {
        const imageUrls = await uploadProductImages(imageFiles, newProduct.id)
        await updateProduct(newProduct.id, { images: imageUrls, cover_image: imageUrls[0] || '' })
      }

      toast.success('تم نشر المنتج بنجاح')
      navigate(`/product/${newProduct.id}`)
    } catch (err) {
      console.error(err)
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-gold mb-6">إضافة منتج جديد</h1>
      <form onSubmit={handleSubmit} className="bg-primary-card p-6 rounded-2xl border border-gold/30">
        <Input label="اسم المنتج" name="title" value={formData.title} onChange={handleChange} required />
        <div className="mb-4">
          <label className="block mb-1 text-text-secondary">الوصف</label>
          <textarea name="description" value={formData.description} onChange={handleChange} rows="4" className="w-full px-4 py-2 rounded-lg bg-primary-card border border-gold/30 text-white" required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="السعر (ريال)" name="price" type="number" step="0.01" value={formData.price} onChange={handleChange} required />
          <Input label="نسبة الخصم %" name="discount_percentage" type="number" min="0" max="100" value={formData.discount_percentage} onChange={handleChange} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="mb-4">
            <label className="block mb-1 text-text-secondary">القسم</label>
            <select name="category" value={formData.category} onChange={handleChange} className="w-full px-4 py-2 rounded-lg bg-primary-card border border-gold/30 text-white">
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <Input label="الكمية" name="stock_quantity" type="number" value={formData.stock_quantity} onChange={handleChange} required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="المدينة" name="city" value={formData.city} onChange={handleChange} />
          <Input label="رقم التواصل" name="contact_number" value={formData.contact_number} onChange={handleChange} />
        </div>
        <div className="mb-4">
          <label className="block mb-1 text-text-secondary">حالة المنتج</label>
          <select name="condition" value={formData.condition} onChange={handleChange} className="w-full px-4 py-2 rounded-lg bg-primary-card border border-gold/30 text-white">
            <option value="new">جديد</option>
            <option value="used">مستعمل</option>
            <option value="refurbished">مجدد</option>
          </select>
        </div>
        <div className="mb-4 flex items-center gap-2">
          <input type="checkbox" name="is_featured" checked={formData.is_featured} onChange={handleChange} className="w-5 h-5" />
          <label>منتج مميز</label>
        </div>
        <div className="mb-4">
          <label className="block mb-1 text-text-secondary">صور المنتج</label>
          <input type="file" multiple accept="image/*" onChange={handleImageChange} className="w-full" />
          <div className="flex gap-2 mt-2 flex-wrap">
            {imagePreviews.map((src, idx) => <img key={idx} src={src} alt="preview" className="w-20 h-20 object-cover rounded" />)}
          </div>
        </div>
        <Button type="submit" disabled={loading} className="w-full">{loading ? 'جاري النشر...' : 'نشر المنتج'}</Button>
      </form>
    </div>
  )
}

