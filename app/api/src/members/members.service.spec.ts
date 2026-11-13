import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { createPrismaMock } from '../../test/prisma-mock.js';
import { MembersService } from './members.service.js';

const admin = { id: 't1', role: 'ADMIN' } as const;
const member = { id: 't1', role: 'MEMBER' } as const;

describe('MembersService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: MembersService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new MembersService(prisma);
  });

  describe('list', () => {
    it("returns only the active tenant's members with name, email, role and status", async () => {
      prisma.tenantUser.findMany.mockResolvedValue([
        {
          role: 'ADMIN',
          user: { id: 'u1', name: 'Alice', email: 'a@x.io', status: 'ACTIVE' },
        },
      ]);

      await expect(service.list(admin)).resolves.toEqual([
        {
          id: 'u1',
          name: 'Alice',
          email: 'a@x.io',
          status: 'ACTIVE',
          role: 'ADMIN',
        },
      ]);
      expect(prisma.tenantUser.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: 't1' } }),
      );
    });
  });

  describe('updateRole', () => {
    function stubMemberships(roles: Record<string, 'ADMIN' | 'MEMBER'>) {
      prisma.tenantUser.findUnique.mockImplementation(
        ({ where }: { where: { tenantId_userId: { userId: string } } }) => {
          const role = roles[where.tenantId_userId.userId];
          return Promise.resolve(role ? { role } : null);
        },
      );
    }

    it('lets an admin change another member’s role', async () => {
      stubMemberships({ actor: 'ADMIN', target: 'MEMBER' });
      prisma.tenantUser.update.mockResolvedValue({
        role: 'ADMIN',
        user: { id: 'target', name: 'T', email: 't@x.io', status: 'ACTIVE' },
      });

      const result = await service.updateRole(
        admin,
        'target',
        'ADMIN',
        'actor',
      );

      expect(result).toMatchObject({ id: 'target', role: 'ADMIN' });
      expect(prisma.tenantUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId_userId: { tenantId: 't1', userId: 'target' } },
          data: { role: 'ADMIN' },
        }),
      );
      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
        isolationLevel: 'Serializable',
      });
    });

    it('rejects non-admins without touching the database', async () => {
      await expect(
        service.updateRole(member, 'target', 'ADMIN', 'actor'),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.tenantUser.update).not.toHaveBeenCalled();
    });

    it('stops an admin from removing their own admin access', async () => {
      await expect(
        service.updateRole(admin, 'actor', 'MEMBER', 'actor'),
      ).rejects.toThrow(ConflictException);
      expect(prisma.tenantUser.update).not.toHaveBeenCalled();
    });

    it('allows an admin to "set" themselves to admin (no-op)', async () => {
      stubMemberships({ actor: 'ADMIN' });
      prisma.tenantUser.update.mockResolvedValue({
        role: 'ADMIN',
        user: { id: 'actor', name: 'A', email: 'a@x.io', status: 'ACTIVE' },
      });
      await expect(
        service.updateRole(admin, 'actor', 'ADMIN', 'actor'),
      ).resolves.toMatchObject({ role: 'ADMIN' });
    });

    it('returns 404 for a user who is not in this tenant', async () => {
      stubMemberships({ actor: 'ADMIN' });
      await expect(
        service.updateRole(admin, 'stranger', 'ADMIN', 'actor'),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.tenantUser.update).not.toHaveBeenCalled();
    });

    it('rechecks the actor inside the transaction in case they were just demoted', async () => {
      stubMemberships({ actor: 'MEMBER', target: 'MEMBER' });
      await expect(
        service.updateRole(admin, 'target', 'ADMIN', 'actor'),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.tenantUser.update).not.toHaveBeenCalled();
    });
  });
});
