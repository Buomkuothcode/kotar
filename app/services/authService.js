import { supabase } from '../../app/supa/supabase-client';
import { router } from 'expo-router';

export const authService = {
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/screens/Login/Login');
      return null;
    }
    return user;
  },

  async fetchProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  },

  async signOut() {
    await supabase.auth.signOut();
    router.replace('/screens/welcome/welcome');
  },
};