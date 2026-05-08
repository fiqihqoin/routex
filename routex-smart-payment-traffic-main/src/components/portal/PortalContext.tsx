import { createContext, useContext, useState, ReactNode, useEffect } from "react";

type Env = "sandbox" | "production";

type User = {
  name: string;
  email: string;
  company: string;
};

type PortalCtx = {
  env: Env;
  setEnv: (e: Env) => void;
  user: User;
  setUser: (u: User) => void;
  loading: boolean;
  logout: () => Promise<void>;
};

const Ctx = createContext<PortalCtx | null>(null);

function getCookie(name: string) {
  const value = "; " + document.cookie;
  const parts = value.split("; " + name + "=");
  if (parts.length === 2) return decodeURIComponent(parts.pop()?.split(";").shift() || "");
}

export const PortalProvider = ({ children }: { children: ReactNode }) => {
  const [env, setEnv] = useState<Env>("sandbox");
  const [user, setUser] = useState<User>({ name: "Loading...", email: "", company: "" });
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const res = await fetch("/portal/dashboard", {
        headers: { "Accept": "application/json" }
      });
      
      if (res.status === 401) {
         window.location.href = "/login";
         return;
      }
      
      const data = await res.json();
      if (data && data.user) {
        setUser(data.user);
      }
    } catch (err) {
      console.error("Portal context error:", err);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch("/portal/logout", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "X-XSRF-TOKEN": getCookie("XSRF-TOKEN") || "",
        }
      });
      window.location.href = "/login";
    } catch (err) {
      console.error("Logout failed:", err);
      // Fallback redirect
      window.location.href = "/login";
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <Ctx.Provider
      value={{
        env,
        setEnv,
        user,
        setUser,
        loading,
        logout,
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
