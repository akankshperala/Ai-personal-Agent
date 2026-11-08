
"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  getAuthenticatedAppUser,
  signOutFromServer,
} from "@/app/actions";

interface AuthContextType {
  user: any;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setPhoneUser: (userData: PhoneUserData) => void;
}

interface PhoneUserData {
  id: string;
  name?: string;
  phone: string;
  auth_provider: "phone";
  verification_method: "sms" | "whatsapp";
}

const PHONE_USER_KEY = "omnisync_phone_user";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const checkUser = async () => {
    setLoading(true);

    try {
      // Preserve existing phone authentication.
      const phoneUserRaw =
        typeof window !== "undefined"
          ? localStorage.getItem(PHONE_USER_KEY)
          : null;

      if (phoneUserRaw) {
        const phoneUser = JSON.parse(phoneUserRaw);
        setUser(phoneUser);
        return;
      }

      // Retrieve the authenticated user and profile on the server.
      const result = await getAuthenticatedAppUser();

      if (!result.success || !result.user) {
        if (result.error) {
          console.error("Error getting current user:", result.error);
        }

        setUser(null);
        return;
      }

      setUser(result.user);
    } catch (err) {
      console.error("Unexpected error checking auth state:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const setPhoneUser = (userData: PhoneUserData) => {
    const enriched = {
      ...userData,
      isPhoneAuth: true,
      profile: {
        name: userData.name || `User ${userData.phone.slice(-4)}`,
      },
    };

    if (typeof window !== "undefined") {
      localStorage.setItem(
        PHONE_USER_KEY,
        JSON.stringify(enriched)
      );
    }

    setUser(enriched);
  };

  useEffect(() => {
    checkUser();
  }, []);

  const handleSignOut = async () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem(PHONE_USER_KEY);
      }

      if (user?.isPhoneAuth) {
        setUser(null);
        return;
      }

      const result = await signOutFromServer();

      if (!result.success) {
        console.error("Error signing out:", result.error);
      }

      setUser(null);
    } catch (err) {
      console.error("Sign out failed:", err);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signOut: handleSignOut,
        refreshUser: checkUser,
        setPhoneUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
