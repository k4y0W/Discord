"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    setError(null);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Logout failed");
      }
      // The cookie is cleared by the API route.
      // Refresh the current route and redirect.
      startTransition(() => {
        router.push("/login");
        router.refresh();
      });
    } catch (err: any) {
      console.error("Logout failed:", err);
      setError(err.message || "Could not log out.");
    }
  };

  return (
    <>
      <button
        onClick={handleLogout}
        disabled={isPending}
        className="w-full bg-red-600 text-white p-2 rounded hover:bg-red-700 transition disabled:opacity-50"
      >
        {isPending ? "Logging out..." : "Logout"}
      </button>
      {error && (
        <p className="text-red-400 text-xs mt-1 text-center">{error}</p>
      )}
    </>
  );
}
