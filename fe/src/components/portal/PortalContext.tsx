import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";

type Env = "sandbox" | "production";

type User = {
  name: string;
  email: string;
  company: string;
  sandbox_api_key?: string;
  production_api_key?: string;
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
  const navigate = useNavigate();
  const [env, setEnv] = useState<Env>("sandbox");
  const [user, setUser] = useState<User>({ 
    name: "Loading...", 
    email: "", 
    company: "",
    sandbox_api_key: "",
    production_api_key: ""
  });
  const [loading, setLoading] = useState(true);

  // Sync theme with env state
  useEffect(() => {
    console.log("[PortalContext] Environment changed to:", env);
    if (env === "production") {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    }
    
    // Always fetch user info when env changes to ensure data is correct
    const fetchUser = async () => {
      try {
        const res = await fetch(`/portal/dashboard?env=${env}`, {
          headers: { 
            "Accept": "application/json",
            "X-Routex-Environment": env
          }
        });
        
        if (res.status === 401) {
           navigate("/login");
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

    fetchUser();
  }, [env]);

  const logout = async () => {
    try {
      await fetch("/portal/logout", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "X-XSRF-TOKEN": getCookie("XSRF-TOKEN") || "",
        }
      });
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      navigate("/login");
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
