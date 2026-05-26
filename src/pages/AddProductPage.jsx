import { useState } from 'react'
import { useNavigate } from 'react-router-dom' // تم التعديل هنا
import { useAuth } from '../contexts/AuthContext'
import { addProduct, uploadProductImages, updateProduct } from '../services/productService'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import toast from 'react-hot-toast'

const categories = ['electronics', 'fashion', 'beauty', 'vehicles', 'home', 'baby', 'grocery', 'books', 'pets']

export default function AddProductPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate() // تم التعديل هنا
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '', description: '', price: '', discount_percentage: 0, category: categories[0],
    quantity: '', city: '', contact_number: '', condition: 'new', featured: false
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
      const productData = {
        seller_id: user.id,
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        discount_percentage: parseInt(formData.discount_percentage),
        category: formData.category,
        quantity: parseInt(formData.quantity),
        city: formData.city,
        contact_number: formData.contact_number,
        condition: formData.condition,
        featured: formData.featured,
        images: [],
        cover_image: ''
      }
      const newProduct = await addProduct(productData)
      if (imageFiles.length > 0) {
        const imageUrls = await uploadProductImages(imageFiles, newProduct.id)
        await updateProduct(newProduct.id, { images: imageUrls, cover_image: imageUrls[0] || '' })
      }
      toast.success('تم نشر المنتج بنجاح')
      
      // تم التعديل هنا لاستخدام navigate بدلاً من window.location
      navigate(`/product/${newProduct.id}`) 
      
    } catch (err) {
      toast.error(err.message)
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
          <Input label="الكمية" name="quantity" type="number" value={formData.quantity} onChange={handleChange} required />
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
          <input type="checkbox" name="featured" checked={formData.featured} onChange={handleChange} className="w-5 h-5" />
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
