import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createHttpApp } from '../../test/http-app.js';
import { ProjectsModule } from './projects.module.js';

describe('Projects HTTP API', () => {
  let app: INestApplication<App>;
  let ctx: Awaited<ReturnType<typeof createHttpApp>>;

  beforeEach(async () => {
    ctx = await createHttpApp([ProjectsModule]);
    app = ctx.app;
    ctx.useMemberships([
      { tenantId: 'acme', userId: 'alice', role: 'ADMIN' },
      { tenantId: 'acme', userId: 'bob', role: 'MEMBER' },
    ]);
  });

  afterEach(() => app.close());

  async function as(userId: string, tenantId = 'acme') {
    const token = await ctx.tokenFor(userId);
    return <T extends request.Test>(req: T) =>
      req.set('Authorization', `Bearer ${token}`).set('x-tenant-id', tenantId);
  }

  it('lets members read', async () => {
    ctx.prisma.project.findMany.mockResolvedValue([{ id: 'p1' }]);
    const auth = await as('bob');
    const res = await auth(
      request(app.getHttpServer()).get('/projects'),
    ).expect(200);
    expect(res.body).toEqual([{ id: 'p1' }]);
  });

  it("refuses another tenant's projects", async () => {
    const auth = await as('alice', 'globex');
    await auth(request(app.getHttpServer()).get('/projects')).expect(403);
    expect(ctx.prisma.project.findMany).not.toHaveBeenCalled();
  });

  it('creates with 201 for admins', async () => {
    ctx.prisma.project.create.mockResolvedValue({ id: 'p1', name: 'New' });
    const auth = await as('alice');
    await auth(
      request(app.getHttpServer())
        .post('/projects')
        .send({ name: 'New', progress: 10 }),
    ).expect(201);
  });

  it('forbids members from creating', async () => {
    const auth = await as('bob');
    await auth(
      request(app.getHttpServer()).post('/projects').send({ name: 'New' }),
    ).expect(403);
  });

  it.each([
    ['missing name', {}],
    ['blank name', { name: '   ' }],
    ['bad status', { name: 'x', status: 'LATE' }],
    ['progress over 100', { name: 'x', progress: 101 }],
    ['fractional progress', { name: 'x', progress: 1.5 }],
    ['tenantId in body', { name: 'x', tenantId: 'globex' }],
  ])('rejects %s with 400', async (_label, body) => {
    const auth = await as('alice');
    await auth(
      request(app.getHttpServer()).post('/projects').send(body),
    ).expect(400);
    expect(ctx.prisma.project.create).not.toHaveBeenCalled();
  });

  it('returns 404 for a missing project and 204 on delete', async () => {
    ctx.prisma.project.findFirst.mockResolvedValue(null);
    ctx.prisma.project.delete.mockResolvedValue({});
    const auth = await as('alice');
    await auth(request(app.getHttpServer()).get('/projects/nope')).expect(404);
    await auth(request(app.getHttpServer()).delete('/projects/p1')).expect(204);
  });
});
