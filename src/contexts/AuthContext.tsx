import { createContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { supabase } from "../lib/supabase";
import type { DbProfile, UserRole } from "../types/database";

interface AuthContextType {
  user: DbProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<DbProfile>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setRole: (role: UserRole) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DbProfile | null>(null);
  const [loading, setLoading] = useState(true);

  
    const loadProfile = async (userId: string): Promise<DbProfile | null> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();  // 👈 CAMBIO: antes era .single()

  if (error) {
    console.error("Error loading profile:", error);
    setUser(null);
    return null;
  }

  if (!data) {
    // El usuario existe en auth pero no tiene profile aún (o RLS lo oculta)
    console.warn("No profile found for user:", userId);
    setUser(null);
    return null;
  }

  const profile = data as DbProfile;
  setUser(profile);
  return profile;
};

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;

      if (session?.user) {
        await loadProfile(session.user.id);
      }

      if (mounted) {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await loadProfile(session.user.id);
      } else {
        setUser(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (
    email: string,
    password: string
  ): Promise<DbProfile> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    if (!data.user) {
      throw new Error("No se pudo obtener el usuario autenticado.");
    }

    const profile = await loadProfile(data.user.id);

    if (!profile) {
      throw new Error("No se pudo cargar el perfil del usuario.");
    }

    return profile;
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string
  ): Promise<void> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) throw error;

    setUser(null);
  };

  const refreshProfile = async () => {
    if (!user) return;
    await loadProfile(user.id);
  };

  const setRole = async (role: UserRole) => {
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", user.id);

    if (error) throw error;

    setUser({
      ...user,
      role,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        setRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}