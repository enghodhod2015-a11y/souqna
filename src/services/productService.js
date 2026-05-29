```javascript
import { supabase } from './supabase'

/*
|--------------------------------------------------------------------------
| جلب جميع المنتجات
|--------------------------------------------------------------------------
*/
export const getProducts = async (filters = {}) => {
  try {
    let query = supabase
      .from('products')
      .select(`
        *,
        seller:profiles!products_seller_id_fkey (
          full_name,
          avatar_url
        )
      `)
      .eq('is_hidden', false)
      .eq('is_approved', true)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    /*
    |--------------------------------------------------------------------------
    | الفلاتر
    |--------------------------------------------------------------------------
    */

    // فلترة القسم
    if (filters.category) {
      query = query.eq('category', filters.category)
    }

    // البحث بالاسم
    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('❌ خطأ أثناء جلب المنتجات:', error)
      throw error
    }

    return data || []

  } catch (error) {
    console.error('⚠️ فشل جلب المنتجات:', error)
    return []
  }
}


/*
|--------------------------------------------------------------------------
| جلب منتجات بائع محدد
|--------------------------------------------------------------------------
*/
export const getSellerProducts = async (sellerId) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return data || []

  } catch (error) {
    console.error('❌ خطأ أثناء جلب منتجات البائع:', error)
    return []
  }
}


/*
|--------------------------------------------------------------------------
| جلب منتج بواسطة ID
|--------------------------------------------------------------------------
*/
export const getProductById = async (id) => {
  try {

    // حماية ضد undefined أو null
    if (!id || id === 'undefined') {
      throw new Error('معرف المنتج غير صالح')
    }

    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        seller:profiles!products_seller_id_fkey (
          full_name,
          avatar_url,
          phone,
          city
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('❌ خطأ أثناء جلب المنتج:', error)
      throw error
    }

    return data

  } catch (error) {
    console.error('❌ فشل جلب المنتج:', error)
    throw error
  }
}


/*
|--------------------------------------------------------------------------
| إضافة منتج جديد
|--------------------------------------------------------------------------
*/
export const addProduct = async (productData) => {
  try {

    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select()
      .single()

    if (error) {
      console.error('❌ خطأ أثناء إضافة المنتج:', error)
      throw error
    }

    return data

  } catch (error) {
    console.error('❌ فشل إضافة المنتج:', error)
    throw error
  }
}


/*
|--------------------------------------------------------------------------
| تحديث منتج
|--------------------------------------------------------------------------
*/
export const updateProduct = async (id, updates) => {
  try {

    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('❌ خطأ أثناء تحديث المنتج:', error)
      throw error
    }

    return data

  } catch (error) {
    console.error('❌ فشل تحديث المنتج:', error)
    throw error
  }
}


/*
|--------------------------------------------------------------------------
| حذف منتج
|--------------------------------------------------------------------------
*/
export const deleteProduct = async (id) => {
  try {

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('❌ خطأ أثناء حذف المنتج:', error)
      throw error
    }

    return true

  } catch (error) {
    console.error('❌ فشل حذف المنتج:', error)
    throw error
  }
}


/*
|--------------------------------------------------------------------------
| رفع صور المنتجات
|--------------------------------------------------------------------------
*/
export const uploadProductImages = async (files, productId) => {

  try {

    const urls = []

    for (const file of files) {

      const fileName = `${productId}/${Date.now()}_${file.name}`

      const { error } = await supabase
        .storage
        .from('product-images')
        .upload(fileName, file)

      if (error) {
        console.error('❌ خطأ أثناء رفع الصورة:', error)
        throw error
      }

      const {
        data: { publicUrl }
      } = supabase
        .storage
        .from('product-images')
        .getPublicUrl(fileName)

      urls.push(publicUrl)
    }

    return urls

  } catch (error) {
    console.error('❌ فشل رفع الصور:', error)
    throw error
  }
}
```
