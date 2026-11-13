import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type TenantRole } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { isTenantAdmin, type TenantContext } from '../tenancy/tenant-access.js';

const memberSelect = {
  role: true,
  user: { select: { id: true, name: true, email: true, status: true } },
} satisfies Prisma.TenantUserSelect;

type MemberRow = Prisma.TenantUserGetPayload<{ select: typeof memberSelect }>;

function toMember({ role, user }: MemberRow) {
  return { ...user, role };
}

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenant: TenantContext) {
    const rows = await this.prisma.tenantUser.findMany({
      where: { tenantId: tenant.id },
      select: memberSelect,
      orderBy: { user: { name: 'asc' } },
    });
    return rows.map(toMember);
  }

  async updateRole(
    tenant: TenantContext,
    userId: string,
    role: TenantRole,
    actorId: string,
  ) {
    if (!isTenantAdmin(tenant)) {
      throw new ForbiddenException('Only tenant admins can change roles');
    }
    if (userId === actorId && role !== 'ADMIN') {
      throw new ConflictException("You can't remove your own admin access");
    }

    // Serializable so two admins demoting each other at once can't both
    // succeed and leave the tenant without an admin.
    return this.prisma.$transaction(
      async (tx) => {
        const [actor, target] = await Promise.all([
          tx.tenantUser.findUnique({
            where: {
              tenantId_userId: { tenantId: tenant.id, userId: actorId },
            },
            select: { role: true },
          }),
          tx.tenantUser.findUnique({
            where: { tenantId_userId: { tenantId: tenant.id, userId } },
            select: { role: true },
          }),
        ]);
        if (actor?.role !== 'ADMIN') {
          throw new ForbiddenException('Only tenant admins can change roles');
        }
        if (!target) {
          throw new NotFoundException('Member not found in this tenant');
        }

        const updated = await tx.tenantUser.update({
          where: { tenantId_userId: { tenantId: tenant.id, userId } },
          data: { role },
          select: memberSelect,
        });
        return toMember(updated);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}
