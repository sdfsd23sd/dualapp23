import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import SharedPreferences from '@/plugins/SharedPreferences';

export const useAuthToken = () => {
  useEffect(() => {
    const saveAuthToken = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        try {
          await SharedPreferences.setString({
            key: 'auth_token',
            value: session.access_token
          });
        } catch (error) {
          console.error('Failed to save auth token:', error);
        }
      }
    };

    saveAuthToken();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.access_token) {
        try {
          await SharedPreferences.setString({
            key: 'auth_token',
            value: session.access_token
          });
        } catch (error) {
          console.error('Failed to save auth token:', error);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);
};
