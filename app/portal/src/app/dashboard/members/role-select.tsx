"use client";

import { useState, useTransition } from "react";
import type { TenantRole } from "@/lib/api";
import { updateMemberRole } from "./actions";

export function RoleSelect({
  tenantId,
  memberId,
  memberName,
  initialRole,
}: {
  tenantId: string;
  memberId: string;
  memberName: string;
  initialRole: TenantRole;
}) {
  const [role, setRole] = useState(initialRole);
  // Follow the server's value when it changes (e.g. after a refresh)
  const [serverRole, setServerRole] = useState(initialRole);
  if (initialRole !== serverRole) {
    setServerRole(initialRole);
    setRole(initialRole);
  }
  const [status, setStatus] = useState<
    { kind: "idle" } | { kind: "saved" } | { kind: "error"; message: string }
  >({ kind: "idle" });
  const [pending, startTransition] = useTransition();

  function change(next: TenantRole) {
    const previous = role;
    setRole(next);
    setStatus({ kind: "idle" });
    startTransition(async () => {
      const result = await updateMemberRole(tenantId, memberId, next);
      if (result.ok) {
        setStatus({ kind: "saved" });
      } else {
        setRole(previous);
        setStatus({ kind: "error", message: result.error });
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <select
          aria-label={`Role for ${memberName}`}
          value={role}
          disabled={pending}
          onChange={(event) => change(event.target.value as TenantRole)}
          className="rounded-md border border-zinc-300 bg-white py-1 pl-2 pr-7 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="ADMIN">Admin</option>
          <option value="MEMBER">Member</option>
        </select>
        <span aria-live="polite" className="text-xs text-zinc-500">
          {pending ? "Saving…" : status.kind === "saved" ? "Saved" : null}
        </span>
      </div>
      {status.kind === "error" && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {status.message}
        </p>
      )}
    </div>
  );
}
