"use client";

// Route guard for the authenticated ClipCraft workspace.
// Redirects signed-out visitors to the login screen and remembers where they
// were heading so they land there after signing in.

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const AUTH_ROUTES = ["/login", "/signup", "/forgot-password"];

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const redirected = useRef(false);

  useEffect(() => {
    if (!ready || user || redirected.current) return;
    // Guard against re-running while the redirect is in flight: the pathname
    // becomes /login mid-navigation, which used to overwrite the saved target.
    redirected.current = true;
    const target = AUTH_ROUTES.includes(pathname) ? "/workspace" : pathname;
    router.replace(`/login?redirect=${encodeURIComponent(target)}`);
  }, [ready, user, router, pathname]);

  if (!ready || !user) {
    return (
      <div className="auth-gate" role="status" aria-live="polite">
        <span className="auth-gate-spinner" aria-hidden="true"></span>
        <p>Checking your session…</p>
      </div>
    );
  }

  return <>{children}</>;
}
