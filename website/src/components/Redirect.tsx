"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BASE } from "@/lib/site";

/** Static-hosting redirect for moved pages: meta refresh + client navigation + a visible link. */
export default function Redirect({ to, label }: { to: string; label: string }) {
  const router = useRouter();
  useEffect(() => router.replace(to), [router, to]);
  return (
    <div className="mx-auto max-w-page px-5 py-24 sm:px-8">
      <meta httpEquiv="refresh" content={`0; url=${BASE}${to}`} />
      <p className="kicker">Page moved</p>
      <p className="mt-3 text-lg text-fog-300">This page has moved to <Link className="text-accent-600 underline" href={to}>{label}</Link>.</p>
    </div>
  );
}
