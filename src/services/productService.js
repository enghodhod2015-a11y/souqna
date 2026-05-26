import { supabase } from './supabase'

export const getProducts = async (filters = {}) => {
  let query = supabase.from('products').select('*, seller:profiles(full_name)').eq('is_hidden', false).eq('is_approved', true).order('created_at', { ascending: false })
  if (filters.category) query = query.eq('category', filters.category)
  if (filters.search) query = query.ilike('title', `%${filters.search}%`)
  const { data, error } = await query
  if (error) throw error
  return data
}

export const getSellerProducts = async (sellerId) => {
  const { data, error } = await supabase.from('products').select('*').eq('seller_id', sellerId).order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const getProductById = async (id) => {
  const { data, error } = await supabase.from('products').select('*, seller:profiles(full_name, phone, city)').eq('id', id).single()
  if (error) throw error
  return data
}

export const addProduct = async (productData) => {
  const { data, error } = await supabase.from('products').insert([productData]).select().single()
  if (error) throw error
  return data
}

export const updateProduct = async (id, updates) => {
  const { data, error } = await supabase.from('products').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export const deleteProduct = async (id) => {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
  return true
}

export const uploadProductImages = async (files, productId) => {
  const urls = []
  for (const file of files) {
    const fileName = `${productId}/${Date.now()}_${file.name}`
    const { data, error } = await supabase.storage.from('product-images').upload(fileName, file)
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName)
    urls.push(publicUrl)
  }
  return urls
}