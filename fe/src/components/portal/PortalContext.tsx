import { createContext, useState, useEffect, useContext, ReactNode } from "react";

type Env = "sandbox" | "production";

type Merchant = {
  id: string;
  name: string;
  email: string;
  company: string;
  merchant_id: string;
};

type PortalCtx = {
  env: Env;
  setEnv: (e: Env) => void;
  user: Merchant | null;
  setUser: (u: Merchant | null) => void;
  loading: boolean;
  logout: () => Promise<void>;
  authenticated: boolean;
};

const Ctx = createContext<PortalCtx | null>(null);

function getCookie(name: string) {
  const value = "; " + document.cookie;
  const parts = value.split("; " + name + "=");
  if (parts.length === 2) return decodeURIComponent(parts.pop()?.split(";").shift() || "");
}

/**
 * Main Context Provider
 * Simplified to remove Router dependencies which can cause hook call issues
 */
export const PortalProvider = ({ children }: { children: ReactNode }) => {
  const [env, setEnv] = useState<Env>("sandbox");
  const [user, setUser] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);

  // Initial auth check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/portal/me", {
          headers: { "Accept": "application/json" }
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data && data.user) {
            setUser(data.user);
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Sync theme with env state
  useEffect(() => {
    if (env === "production") {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    }
  }, [env]);

  const logout = async () => {
    try {
      await fetch("/api/portal/logout", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "X-XSRF-TOKEN": getCookie("XSRF-TOKEN") || "",
        }
      });
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setUser(null);
      window.location.href = "/login";
    }
  };

  return (
    <Ctx.Provider
      value={{
        env,
        setEnv,
        user,
        setUser,
        loading,
        logout,
        authenticated: !!user,
      }}
    >
      {children}
    </Ctx.Provider>
  );
};

export const usePortal = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePortal must be used inside PortalProvider");
  return v;
};
