import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { type User } from "@/types/domain";
import { type User as SupabaseUser } from "@supabase/supabase-js";
import { clearSessionTackleStorage } from "@/lib/session-tackle";

const AUTH_USER_QUERY_KEY = ["supabase", "auth", "user"] as const;

function mapSupabaseUser(user: SupabaseUser | null): User | null {
  if (!user) {
    return null;
  }

  const metadata = user.user_metadata ?? {};

  return {
    id: user.id,
    email: user.email ?? "",
    firstName: metadata.first_name ?? metadata.firstName ?? "",
    lastName: metadata.last_name ?? metadata.lastName ?? "",
  };
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: AUTH_USER_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        if (error.name === "AuthSessionMissingError") {
          return null;
        }
        throw error;
      }
      return mapSupabaseUser(data.user);
    },
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        clearSessionTackleStorage();
      }
      queryClient.invalidateQueries({ queryKey: AUTH_USER_QUERY_KEY });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
  };
}

export function useLogout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData(AUTH_USER_QUERY_KEY, null);
    },
  });
}
