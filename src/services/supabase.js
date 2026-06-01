import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMsg = "🚨 Supabase Error: Missing environment variables VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Please add them in Vercel or .env file.";
  console.error(errorMsg);
  throw new Error(errorMsg);
}

// إنشاء العميل الأساسي
const originalSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: sessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// ✅ دالة مساعدة لإضافة مهلة إلى أي promise
const withTimeout = (promise, timeoutMs = 15000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`انتهت المهلة بعد ${timeoutMs / 1000} ثانية`)), timeoutMs)
    )
  ]);
};

// ✅ تغليف جميع دوال supabase لإضافة مهلة تلقائية
export const supabase = new Proxy(originalSupabase, {
  get(target, prop) {
    const original = target[prop];
    if (typeof original === 'function') {
      return async (...args) => {
        try {
          return await withTimeout(original.apply(target, args), 15000);
        } catch (err) {
          console.error(`Supabase error in ${prop}:`, err);
          throw err;
        }
      };
    }
    return original;
  }
});

