import { supabase } from './supabase';

// جلب قسيمة بواسطة الكود (للتحقق من صلاحيتها)
export const getCouponByCode = async (code) => {
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .lte('start_date', new Date().toISOString())
    .or(`end_date.is.null,end_date.gt.${new Date().toISOString()}`)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

// تطبيق القسيمة على المبلغ الإجمالي
export const applyCoupon = (coupon, amount) => {
  if (!coupon) return { discount: 0, finalAmount: amount };
  let discount = 0;
  if (coupon.discount_type === 'percentage') {
    discount = (amount * coupon.discount_value) / 100;
    if (coupon.max_discount && discount > coupon.max_discount) discount = coupon.max_discount;
  } else if (coupon.discount_type === 'fixed') {
    discount = coupon.discount_value;
  }
  if (coupon.min_order_amount && amount < coupon.min_order_amount) {
    return { discount: 0, finalAmount: amount, error: `الحد الأدنى للطلب هو ${coupon.min_order_amount} ريال` };
  }
  if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
    return { discount: 0, finalAmount: amount, error: 'تم استخدام هذه القسيمة الحد الأقصى لعدد المرات' };
  }
  const finalAmount = amount - discount;
  return { discount, finalAmount: finalAmount < 0 ? 0 : finalAmount };
};

// زيادة عدد استخدامات القسيمة (بعد إنشاء الطلب)
export const incrementCouponUsage = async (couponId) => {
  const { error } = await supabase.rpc('increment_coupon_usage', { coupon_id: couponId });
  if (error) console.error('Failed to increment coupon usage:', error);
};

// جلب كل القسائم (للأدمن)
export const getAllCoupons = async () => {
  const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

// إنشاء قسيمة جديدة (للأدمن)
export const createCoupon = async (couponData) => {
  const { data, error } = await supabase.from('coupons').insert([couponData]).select().single();
  if (error) throw error;
  return data;
};

// تحديث قسيمة (للأدمن)
export const updateCoupon = async (id, updates) => {
  const { data, error } = await supabase.from('coupons').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

// حذف قسيمة (للأدمن)
export const deleteCoupon = async (id) => {
  const { error } = await supabase.from('coupons').delete().eq('id', id);
  if (error) throw error;
};

// دالة RPC لزيادة العداد (يجب إنشاؤها في Supabase)
/*
CREATE OR REPLACE FUNCTION increment_coupon_usage(coupon_id BIGINT)
RETURNS VOID AS $$
BEGIN
  UPDATE coupons SET used_count = used_count + 1 WHERE id = coupon_id;
END;
$$ LANGUAGE plpgsql;
*/

