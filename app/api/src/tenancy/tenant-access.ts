import type { TenantRole } from '../generated/prisma/client.js';

/** The active tenant, verified against the database by TenantGuard. */
export type TenantContext = { id: string; role: TenantRole };

/**
 * Whether the caller is an admin of the active tenant, using the role that
 * TenantGuard loaded from the database.
 */
export function isTenantAdmin(tenant: TenantContext): boolean {
  return tenant.role === 'ADMIN';
}
