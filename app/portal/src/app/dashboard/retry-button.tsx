"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function RetryButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
      className={`rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800 ${className}`}
    >
      {pending ? "Retrying…" : "Try again"}
    </button>
  );
}
