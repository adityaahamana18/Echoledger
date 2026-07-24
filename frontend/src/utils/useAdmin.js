import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

const ADMIN_EMAIL = "adityaahamana18@gmail.com";

export function useAdmin() {
  const [user, setUser] = useState(undefined);
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  const isAdmin = user?.email === ADMIN_EMAIL;
  return { user, isAdmin, loading: user === undefined };
}
