import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { TenantRequest } from './tenant.guard.js';
import type { TenantContext } from './tenant-access.js';

/**
 * The active tenant and the caller's role in it, as verified by TenantGuard.
 * Only use it on routes guarded by `AuthGuard, TenantGuard`.
 */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, context: ExecutionContext): TenantContext => {
    const request = context.switchToHttp().getRequest<TenantRequest>();
    if (!request.tenant) {
      throw new Error('CurrentTenant used on a route without TenantGuard');
    }
    return request.tenant;
  },
);
