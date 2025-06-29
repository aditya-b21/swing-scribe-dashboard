
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
  community_request_status?: 'pending' | 'approved' | 'denied' | null;
  is_community_member: boolean;
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
        return;
      }

      if (data) {
        // Type cast the data to ensure proper typing
        const typedProfile: Profile = {
          id: data.id,
          email: data.email || '',
          full_name: data.full_name || undefined,
          email_verified: data.email_verified || false,
          admin_approved: data.admin_approved || false,
          status: (data.status || 'pending') as 'pending' | 'approved' | 'rejected',
          community_request_status: data.community_request_status as 'pending' | 'approved' | 'denied' | null,
          is_community_member: data.is_community_member || false,
          created_at: data.created_at || new Date().toISOString(),
          updated_at: data.updated_at || new Date().toISOString()
        };

        console.log('Profile fetched:', typedProfile);
        setProfile(typedProfile);
      } else {
        console.log('No profile found, creating new profile...');
        // Create profile if it doesn't exist
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email || '',
            status: 'pending',
            community_request_status: null,
            is_community_member: false
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
          return;
        }

        const typedProfile: Profile = {
          id: newProfile.id,
          email: newProfile.email || '',
          full_name: newProfile.full_name || undefined,
          email_verified: newProfile.email_verified || false,
          admin_approved: newProfile.admin_approved || false,
          status: (newProfile.status || 'pending') as 'pending' | 'approved' | 'rejected',
          community_request_status: newProfile.community_request_status as 'pending' | 'approved' | 'denied' | null,
          is_community_member: newProfile.is_community_member || false,
          created_at: newProfile.created_at || new Date().toISOString(),
          updated_at: newProfile.updated_at || new Date().toISOString()
        };

        setProfile(typedProfile);
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
