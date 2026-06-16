// src/services/adminGuard.js
import { supabase } from './supabase';

let cachedIsAdmin = null;
let lastCheck = 0;

export async function isCurrentUserAdmin() {
  const now = Date.now();
  if (cachedIsAdmin !== null && (now - lastCheck) < 5000) {
    return cachedIsAdmin;
  }
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      cachedIsAdmin = false;
      lastCheck = now;
      return false;
    }
    
    const { data, error } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    cachedIsAdmin = !!data;
    lastCheck = now;
    return cachedIsAdmin;
  } catch (err) {
    console.error('خطأ في التحقق من صلاحية الأدمن:', err);
    cachedIsAdmin = false;
    return false;
  }
}

export async function adminUpdateProfile(userId, updates) {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    throw new Error('غير مصرح: هذه العملية تتطلب صلاحيات أدمن');
  }
  
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

