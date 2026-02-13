"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

const LOGIN_PATH = "/login";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    // Boleh akses halaman login tanpa login
    if (pathname === LOGIN_PATH) return;
    // Belum login akses halaman lain -> redirect ke login
    if (!user) {
      router.replace(LOGIN_PATH);
    }
  }, [user, loading, pathname, router]);

  // Sedang loading: tampilkan children (akan redirect setelah loading selesai jika belum login)
  if (loading) {
    return <>{children}</>;
  }
  // Di halaman login: selalu tampilkan
  if (pathname === LOGIN_PATH) {
    return <>{children}</>;
  }
  // Belum login dan bukan halaman login: jangan tampilkan konten (redirect sudah di useEffect)
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50">
        <p className="text-sm text-zinc-500">Mengalihkan ke halaman login...</p>
      </div>
    );
  }

  return <>{children}</>;
}
