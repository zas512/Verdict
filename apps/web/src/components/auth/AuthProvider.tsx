"use client";
import {
  User,
  login as authLogin,
  logout as authLogout,
  checkAuth
} from "@/lib/auth";
import { usePathname, useRouter } from "next/navigation";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PROTECTED_PATHS = [
  "/dashboard",
  "/associates",
  "/expenses",
  "/attendance",
  "/tasks",
  "/leave",
  "/matters",
  "/platform"
];

export function AuthProvider({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const activeUser = await checkAuth();
        if (!isMounted) return;
        if (activeUser) {
          setUser(activeUser);
          if (activeUser.mustChangePassword && pathname !== "/setup") {
            router.replace("/setup");
          } else if (pathname === "/login" || pathname === "/register") {
            const targetPath =
              activeUser.role === "SUPER_ADMIN" ? "/platform" : "/dashboard";
            router.replace(targetPath);
          } else if (
            pathname.startsWith("/platform") &&
            activeUser.role !== "SUPER_ADMIN"
          ) {
            router.replace("/dashboard");
          }
        } else {
          setUser(null);

          const isProtected = PROTECTED_PATHS.some((p) =>
            pathname.startsWith(p)
          );
          if (isProtected) {
            router.replace("/login");
          }
        }
      } catch (err) {
        console.error("[AuthProvider] Auth initialization error:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void initAuth();

    return () => {
      isMounted = false;
    };
  }, [pathname, router]);

  const handleLogin = async (credentials: {
    email: string;
    password: string;
  }) => {
    setIsLoading(true);
    try {
      const loggedUser = await authLogin(credentials);
      setUser(loggedUser);
      const destination = loggedUser.mustChangePassword
        ? "/setup"
        : loggedUser.role === "SUPER_ADMIN"
          ? "/platform"
          : "/dashboard";
      console.log(
        `[AuthProvider] 🚀 Login succeeded! Routing to: ${destination}`
      );
      router.push(destination);
      router.refresh();
    } catch (err) {
      setIsLoading(false);
      throw err;
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    setUser(null);
    await authLogout();
  };

  const handleRefreshUser = async () => {
    try {
      const activeUser = await checkAuth();
      setUser(activeUser);
    } catch (err) {
      console.error("[AuthProvider] Error refreshing user session:", err);
    }
  };

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      login: handleLogin,
      logout: handleLogout,
      refreshUser: handleRefreshUser
    }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
