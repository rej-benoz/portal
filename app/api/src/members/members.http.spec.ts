import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createHttpApp } from '../../test/http-app.js';
import { MembersModule } from './members.module.js';

// acme: alice (admin), bob (member). globex: carol (admin), dan (member).
const memberships = [
  { tenantId: 'acme', userId: 'alice', role: 'ADMIN' },
  { tenantId: 'acme', userId: 'bob', role: 'MEMBER' },
  { tenantId: 'globex', userId: 'carol', role: 'ADMIN' },
  { tenantId: 'globex', userId: 'dan', role: 'MEMBER' },
] as const;

describe('Members HTTP API', () => {
  let app: INestApplication<App>;
  let ctx: Awaited<ReturnType<typeof createHttpApp>>;

  beforeEach(async () => {
    ctx = await createHttpApp([MembersModule]);
    app = ctx.app;
    ctx.useMemberships([...memberships]);
    ctx.prisma.tenantUser.findMany.mockResolvedValue([]);
    ctx.prisma.tenantUser.update.mockImplementation(
      ({
        where,
        data,
      }: {
        where: { tenantId_userId: { userId: string } };
        data: { role: string };
      }) =>
        Promise.resolve({
          role: data.role,
          user: {
            id: where.tenantId_userId.userId,
            name: 'x',
            email: 'x',
            status: 'ACTIVE',
          },
        }),
    );
  });

  afterEach(() => app.close());

  const asUser = async (userId: string, tenantId?: string) => {
    const token = await ctx.tokenFor(userId);
    return (req: request.Test) => {
      req.set('Authorization', `Bearer ${token}`);
      return tenantId ? req.set('x-tenant-id', tenantId) : req;
    };
  };

  describe('authentication', () => {
    it('rejects requests without a token', async () => {
      await request(app.getHttpServer())
        .get('/members')
        .set('x-tenant-id', 'acme')
        .expect(401);
    });

    it('rejects requests without a tenant header', async () => {
      const auth = await asUser('alice');
      await auth(request(app.getHttpServer()).get('/members')).expect(400);
    });
  });

  describe('tenant isolation', () => {
    it("lists the caller's tenant", async () => {
      const auth = await asUser('bob', 'acme');
      await auth(request(app.getHttpServer()).get('/members')).expect(200);
      expect(ctx.prisma.tenantUser.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: 'acme' } }),
      );
    });

    it("refuses to list a tenant the caller doesn't belong to", async () => {
      const auth = await asUser('alice', 'globex');
      await auth(request(app.getHttpServer()).get('/members')).expect(403);
      expect(ctx.prisma.tenantUser.findMany).not.toHaveBeenCalled();
    });

    it('ignores forged tenant claims in the token', async () => {
      // Token claims admin of globex, but the database says alice isn't a member
      const token = await ctx.tokenFor('alice', {
        tenants: [{ id: 'globex', role: 'ADMIN' }],
      });
      await request(app.getHttpServer())
        .patch('/members/dan')
        .set('Authorization', `Bearer ${token}`)
        .set('x-tenant-id', 'globex')
        .send({ role: 'ADMIN' })
        .expect(403);
      expect(ctx.prisma.tenantUser.update).not.toHaveBeenCalled();
    });

    it("can't change a user from another tenant through your own tenant", async () => {
      const auth = await asUser('alice', 'acme');
      await auth(
        request(app.getHttpServer())
          .patch('/members/dan')
          .send({ role: 'ADMIN' }),
      ).expect(404);
      expect(ctx.prisma.tenantUser.update).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /members/:userId', () => {
    it('lets an admin promote a member', async () => {
      const auth = await asUser('alice', 'acme');
      const res = await auth(
        request(app.getHttpServer())
          .patch('/members/bob')
          .send({ role: 'ADMIN' }),
      ).expect(200);
      expect(res.body).toMatchObject({ id: 'bob', role: 'ADMIN' });
    });

    it('forbids members from changing roles', async () => {
      const auth = await asUser('bob', 'acme');
      await auth(
        request(app.getHttpServer())
          .patch('/members/bob')
          .send({ role: 'ADMIN' }),
      ).expect(403);
      expect(ctx.prisma.tenantUser.update).not.toHaveBeenCalled();
    });

    it('uses the role from the database, not a forged claim', async () => {
      const token = await ctx.tokenFor('bob', {
        tenants: [{ id: 'acme', role: 'ADMIN' }],
      });
      await request(app.getHttpServer())
        .patch('/members/alice')
        .set('Authorization', `Bearer ${token}`)
        .set('x-tenant-id', 'acme')
        .send({ role: 'MEMBER' })
        .expect(403);
      expect(ctx.prisma.tenantUser.update).not.toHaveBeenCalled();
    });

    it.each([
      ['an unknown role', { role: 'OWNER' }],
      ['a lowercase role', { role: 'admin' }],
      ['a missing role', {}],
      ['a non-string role', { role: 1 }],
      ['extra fields', { role: 'ADMIN', tenantId: 'globex' }],
    ])('rejects %s with 400', async (_label, body) => {
      const auth = await asUser('alice', 'acme');
      const res = await auth(
        request(app.getHttpServer()).patch('/members/bob').send(body),
      ).expect(400);
      expect(res.body.message).toBeDefined();
      expect(ctx.prisma.tenantUser.update).not.toHaveBeenCalled();
    });

    it('stops an admin from demoting themselves', async () => {
      const auth = await asUser('alice', 'acme');
      const res = await auth(
        request(app.getHttpServer())
          .patch('/members/alice')
          .send({ role: 'MEMBER' }),
      ).expect(409);
      expect(res.body.message).toMatch(/your own admin access/);
      expect(ctx.prisma.tenantUser.update).not.toHaveBeenCalled();
    });

    it('returns 404 for an unknown member', async () => {
      const auth = await asUser('alice', 'acme');
      await auth(
        request(app.getHttpServer())
          .patch('/members/nobody')
          .send({ role: 'MEMBER' }),
      ).expect(404);
    });
  });
});
