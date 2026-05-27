import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// فحص أمني ذكي لكشف انقطاع الاتصال فوراً
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "🚨 Supabase Error: Environment variables are missing!\n" +
    "Check your .env file locally or Environment Variables settings in Vercel."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
