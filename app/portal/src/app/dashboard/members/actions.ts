"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import {
  apiErrorMessage,
  apiFetch,
  requireSessionToken,
  type TenantRole,
} from "@/lib/api";

export type RoleUpdateResult =
  | { ok: true; role: TenantRole }
  | { ok: false; error: string };

const ROLES: readonly TenantRole[] = ["ADMIN", "MEMBER"];

// The API authorizes the change; this only forwards it with the session token.
export async function updateMemberRole(
  tenantId: string,
  userId: string,
  role: TenantRole,
): Promise<RoleUpdateResult> {
  const token = await requireSessionToken();
  if (!ROLES.includes(role)) {
    return { ok: false, error: "Choose Admin or Member." };
  }

  let response: Response;
  try {
    response = await apiFetch(`/members/${encodeURIComponent(userId)}`, {
      token,
      tenantId,
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
  } catch {
    return { ok: false, error: "Can't reach the API. Please try again." };
  }
  if (response.status === 401) {
    redirect("/login");
  }
  if (!response.ok) {
    return {
      ok: false,
      error: await apiErrorMessage(response, "Couldn't update the role."),
    };
  }

  refresh();
  return { ok: true, role };
}
