import {
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { createPrismaMock } from '../../test/prisma-mock.js';
import { TenantGuard, type TenantRequest } from './tenant.guard.js';

function contextFor(request: Partial<TenantRequest>) {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function requestWith(tenantHeader: string | undefined) {
  return {
    user: { sub: 'u1', username: 'alice' },
    header: (name: string) =>
      name === 'x-tenant-id' ? tenantHeader : undefined,
  } as unknown as TenantRequest;
}

describe('TenantGuard', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let guard: TenantGuard;

  beforeEach(() => {
    prisma = createPrismaMock();
    guard = new TenantGuard(prisma);
  });

  it('rejects requests without a tenant header', async () => {
    await expect(
      guard.canActivate(contextFor(requestWith(undefined))),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.tenantUser.findUnique).not.toHaveBeenCalled();
  });

  it('rejects a tenant the user is not a member of', async () => {
    prisma.tenantUser.findUnique.mockResolvedValue(null);
    await expect(
      guard.canActivate(contextFor(requestWith('other-tenant'))),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.tenantUser.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId_userId: { tenantId: 'other-tenant', userId: 'u1' } },
      }),
    );
  });

  it('rejects suspended accounts', async () => {
    prisma.tenantUser.findUnique.mockResolvedValue({
      role: 'ADMIN',
      user: { status: 'SUSPENDED' },
    });
    await expect(
      guard.canActivate(contextFor(requestWith('t1'))),
    ).rejects.toThrow(ForbiddenException);
  });

  it('attaches the role from the database', async () => {
    const request = requestWith('t1');
    prisma.tenantUser.findUnique.mockResolvedValue({
      role: 'MEMBER',
      user: { status: 'ACTIVE' },
    });

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.tenant).toEqual({ id: 't1', role: 'MEMBER' });
  });
});
