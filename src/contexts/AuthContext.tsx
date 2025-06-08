import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: UserProfile | null;
  loading: boolean;
  profileLoading: boolean;
  signIn: (email: string, password?: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, address?: string, city?: string, state?: string, zip?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  isPro: boolean;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, !!session?.user);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    setProfileLoading(true);
    try {
      console.log('Fetching user profile for:', userId);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user profile:', error);
      }

      if (data) {
        console.log('User profile found:', data);
        setUserProfile(data);
      } else {
        // User profile doesn't exist, create one
        console.log('User profile not found, creating one for user:', userId);
        
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const newProfile = {
            id: userId,
            email: user.email!,
            fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            isPro: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          console.log('Creating new profile:', newProfile);
          const { data: createdProfile, error: createError } = await supabase
            .from('users')
            .insert(newProfile)
            .select()
            .single();

          if (createError) {
            console.error('Error creating user profile:', createError);
            setUserProfile({
              id: userId,
              email: user.email!,
              fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
              isPro: false,
            });
          } else {
            console.log('User profile created successfully:', createdProfile);
            setUserProfile(createdProfile);
          }
        }
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserProfile({
          id: userId,
          email: user.email!,
          fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          isPro: false,
        });
      }
    } finally {
      setProfileLoading(false);
      setLoading(false);
    }
  };

  const signIn = async (email: string, password?: string) => {
    if (password) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        email,
      });
      if (error) throw error;
    }
  };

  const signUp = async (
    email: string, 
    password: string, 
    fullName: string, 
    address?: string, 
    city?: string, 
    state?: string, 
    zip?: string
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) throw error;

    if (data.user) {
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: data.user.email!,
          fullName,
          isPro: false,
          address,
          city,
          state,
          zip,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

      if (profileError) {
        console.error('Error creating user profile:', profileError);
      }
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error('No user logged in');

    const { error } = await supabase
      .from('users')
      .update({
        ...updates,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) throw error;

    // Update local state
    setUserProfile(prev => prev ? { ...prev, ...updates } : null);
  };

  const value = {
    user,
    session,
    userProfile,
    loading,
    profileLoading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 