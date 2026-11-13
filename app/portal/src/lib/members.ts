import "server-only";
import { redirect } from "next/navigation";
import {
  apiErrorMessage,
  apiFetch,
  requireSessionToken,
  type TenantRole,
} from "./api";

export type AccountStatus = "ACTIVE" | "SUSPENDED";

export type Member = {
  id: string;
  name: string;
  email: string;
  role: TenantRole;
  status: AccountStatus;
};

export type MembersResult = { members: Member[] } | { error: string };

// Deliberately not cached: membership and roles decide who can see what, so
// they're read fresh on every render (a role change shows up immediately).
export async function getMembers(tenantId: string): Promise<MembersResult> {
  const token = await requireSessionToken();

  let response: Response;
  try {
    response = await apiFetch("/members", { token, tenantId });
  } catch {
    return { error: "Can't reach the API. Please try again." };
  }
  if (response.status === 401) {
    redirect("/login");
  }
  if (!response.ok) {
    return {
      error: await apiErrorMessage(response, "Couldn't load the members."),
    };
  }
  return { members: await response.json() };
}
