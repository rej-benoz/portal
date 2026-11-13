import "server-only";
import { getCurrentUser, type CurrentUser, type Tenant } from "./api";

/**
 * The signed-in user and the tenant picked by the `?tenant=` slug, falling back
 * to their first tenant. Only tenants from `/auth/me` can be picked, and the
 * API checks membership again on every tenant-scoped request.
 */
export async function getActiveTenant(
  searchParams: Promise<{ tenant?: string | string[] }>,
): Promise<{ user: CurrentUser; tenant: Tenant | undefined }> {
  const [user, { tenant: slug }] = await Promise.all([
    getCurrentUser(),
    searchParams,
  ]);
  const tenant = user.tenants.find((t) => t.slug === slug) ?? user.tenants[0];
  return { user, tenant };
}
