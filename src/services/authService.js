import { supabase } from './supabase'

export const signUp = async (email, password, fullName, accountType) => {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { full_name: fullName, account_type: accountType } }
  })
  if (error) throw error
  if (data.user) await supabase.auth.signInWithPassword({ email, password })
  return data
}

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}