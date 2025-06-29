
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  email: string;
  full_name?: string;
  email_verified: boolean;
  admin_approved: boolean;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
      
      // Set up real-time subscription for profile changes
      const subscription = supabase
        .channel(`profile-${user.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        }, () => {
          console.log('Profile changed, refetching...');
          fetchProfile();
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      console.log('Fetching profile for user:', user.id);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Profile fetch error:', error);
        
        // If profile doesn't exist, create one
        if (error.code === 'PGRST116') {
          console.log('Profile not found, creating new profile...');
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email || '',
              status: 'pending'
            })
            .select()
            .single();

          if (createError) {
            console.error('Error creating profile:', createError);
            return;
          }

          const typedProfile = {
            ...newProfile,
            status: (newProfile.status || 'pending') as 'pending' | 'approved' | 'rejected',
            email_verified: newProfile.email_verified || false,
            admin_approved: newProfile.admin_approved || false,
            created_at: newProfile.created_at || new Date().toISOString(),
            updated_at: newProfile.updated_at || new Date().toISOString()
          };

          setProfile(typedProfile as Profile);
          return;
        }
        return;
      }

      if (data) {
        // Type cast the data to ensure proper typing
        const typedProfile = {
          ...data,
          status: (data.status || 'pending') as 'pending' | 'approved' | 'rejected',
          email_verified: data.email_verified || false,
          admin_approved: data.admin_approved || false,
          created_at: data.created_at || new Date().toISOString(),
          updated_at: data.updated_at || new Date().toISOString()
        };

        console.log('Profile fetched:', typedProfile);
        setProfile(typedProfile as Profile);
      } else {
        console.log('No profile found, user needs to be created');
        setProfile(null);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      await fetchProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  return {
    profile,
    loading,
    updateProfile,
    refetch: fetchProfile
  };
}
