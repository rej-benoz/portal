import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { TenantContext } from './tenant-access.js';

export const TENANT_HEADER = 'x-tenant-id';

export type TenantRequest = AuthenticatedRequest & { tenant: TenantContext };

/**
 * Resolves the active tenant from the `x-tenant-id` header and checks it
 * against the database. Runs after AuthGuard. The header is only a hint: the
 * request is rejected unless the signed-in user is an active member of that
 * tenant, and the role comes from the database rather than the access token,
 * so role changes and removals take effect immediately.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<TenantRequest>();
    const tenantId = request.header(TENANT_HEADER);
    if (!tenantId) {
      throw new BadRequestException(`Missing ${TENANT_HEADER} header`);
    }

    const membership = await this.prisma.tenantUser.findUnique({
      where: { tenantId_userId: { tenantId, userId: request.user.sub } },
      select: { role: true, user: { select: { status: true } } },
    });
    if (!membership || membership.user.status !== 'ACTIVE') {
      throw new ForbiddenException("You don't have access to this tenant");
    }

    request.tenant = { id: tenantId, role: membership.role };
    return true;
  }
}
