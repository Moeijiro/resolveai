"use client";

import { createContext, useContext } from "react";
import type { User } from "@/lib/types";

export const SessionContext = createContext<User | null>(null);

export function useSession(): User {
  const user = useContext(SessionContext);
  if (!user) throw new Error("useSession must be used inside the dashboard shell");
  return user;
}
