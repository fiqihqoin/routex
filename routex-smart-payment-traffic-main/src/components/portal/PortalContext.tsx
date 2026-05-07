import { createContext, useContext, useState, ReactNode } from "react";

type Env = "sandbox" | "production";

type PortalCtx = {
  env: Env;
  setEnv: (e: Env) => void;
  user: { name: string; email: string; company: string };
};

const Ctx = createContext<PortalCtx | null>(null);

export const PortalProvider = ({ children }: { children: ReactNode }) => {
  const [env, setEnv] = useState<Env>("sandbox");
  return (
    <Ctx.Provider
      value={{
        env,
        setEnv,
        user: { name: "Andi Pratama", email: "andi@routex.id", company: "PT Routex Demo" },
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
