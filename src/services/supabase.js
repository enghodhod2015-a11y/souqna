import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMsg = "🚨 Supabase Error: Missing environment variables VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Please add them in Vercel or .env file.";
  console.error(errorMsg);
  throw new Error(errorMsg);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,        // ✅ تغيير جوهري: استخدام localStorage بدلاً من sessionStorage
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce'              // ✅ إضافة لضمان التوافق مع المنصات الحديثة
  }
});

