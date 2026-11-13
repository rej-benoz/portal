import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { createPrismaMock } from '../../test/prisma-mock.js';
import { Prisma } from '../generated/prisma/client.js';
import { ProjectsService } from './projects.service.js';

const admin = { id: 't1', role: 'ADMIN' } as const;
const member = { id: 't1', role: 'MEMBER' } as const;

function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError('boom', {
    code,
    clientVersion: 'test',
  });
}

describe('ProjectsService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: ProjectsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new ProjectsService(prisma);
  });

  it('lists only the active tenant’s projects', async () => {
    prisma.project.findMany.mockResolvedValue([]);
    await service.list(member);
    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: 't1' } }),
    );
  });

  it('scopes single reads to the tenant and 404s otherwise', async () => {
    prisma.project.findFirst.mockResolvedValue(null);
    await expect(service.get(member, 'p-other')).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.project.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'p-other', tenantId: 't1' } }),
    );
  });

  it('creates a project in the active tenant, trimming text', async () => {
    prisma.project.create.mockResolvedValue({ id: 'p1' });
    await service.create(admin, 'u1', {
      name: '  Launch  ',
      description: ' Go ',
    });
    expect(prisma.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 't1',
          createdById: 'u1',
          name: 'Launch',
          description: 'Go',
        }),
      }),
    );
  });

  it('maps duplicate names to 409', async () => {
    prisma.project.create.mockRejectedValue(prismaError('P2002'));
    await expect(service.create(admin, 'u1', { name: 'Dup' })).rejects.toThrow(
      ConflictException,
    );
  });

  it('updates and deletes only within the tenant', async () => {
    prisma.project.update.mockResolvedValue({ id: 'p1' });
    prisma.project.delete.mockResolvedValue({ id: 'p1' });
    await service.update(admin, 'p1', { progress: 50 });
    await service.remove(admin, 'p1');
    expect(prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'p1', tenantId: 't1' } }),
    );
    expect(prisma.project.delete).toHaveBeenCalledWith({
      where: { id: 'p1', tenantId: 't1' },
    });
  });

  it('404s when updating or deleting a missing (or foreign) project', async () => {
    prisma.project.update.mockRejectedValue(prismaError('P2025'));
    prisma.project.delete.mockRejectedValue(prismaError('P2025'));
    await expect(service.update(admin, 'p9', { name: 'x' })).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.remove(admin, 'p9')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('forbids members from writing', async () => {
    await expect(service.create(member, 'u1', { name: 'x' })).rejects.toThrow(
      ForbiddenException,
    );
    await expect(service.update(member, 'p1', { name: 'x' })).rejects.toThrow(
      ForbiddenException,
    );
    await expect(service.remove(member, 'p1')).rejects.toThrow(
      ForbiddenException,
    );
    expect(prisma.project.create).not.toHaveBeenCalled();
    expect(prisma.project.update).not.toHaveBeenCalled();
    expect(prisma.project.delete).not.toHaveBeenCalled();
  });
});
