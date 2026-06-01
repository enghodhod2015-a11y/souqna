import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMsg = "🚨 Supabase Error: Missing environment variables VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Please add them in Vercel or .env file.";
  console.error(errorMsg);
  throw new Error(errorMsg);
}

// ✅ استخدام sessionStorage لمنع تعارض الجلسات بين المتصفحات والنوافذ المختلفة
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: sessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// ✅ دالة مساعدة لإضافة مهلة لأي Promise (للاحتياط)
export const withTimeout = (promise, timeoutMs = 15000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`انتهت المهلة بعد ${timeoutMs / 1000} ثانية`)), timeoutMs)
    )
  ]);
};

