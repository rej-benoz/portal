import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import {
  isPrismaError,
  RECORD_NOT_FOUND,
  UNIQUE_VIOLATION,
} from '../prisma/prisma-errors.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { isTenantAdmin, type TenantContext } from '../tenancy/tenant-access.js';
import type { CreateProjectDto, UpdateProjectDto } from './dto/project.dto.js';

const projectSelect = {
  id: true,
  name: true,
  description: true,
  status: true,
  progress: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.ProjectSelect;

/**
 * Tenant-scoped projects. Every member can read them; only admins can create,
 * update or delete. Every query filters on the verified tenant id, so a
 * project id from another tenant behaves exactly like a missing one.
 */
@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenant: TenantContext) {
    return this.prisma.project.findMany({
      where: { tenantId: tenant.id },
      select: projectSelect,
      orderBy: [{ createdAt: 'desc' }, { name: 'asc' }],
    });
  }

  async get(tenant: TenantContext, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, tenantId: tenant.id },
      select: projectSelect,
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  async create(tenant: TenantContext, actorId: string, dto: CreateProjectDto) {
    this.assertAdmin(tenant);
    try {
      return await this.prisma.project.create({
        data: {
          tenantId: tenant.id,
          createdById: actorId,
          name: dto.name.trim(),
          description: dto.description?.trim() ?? '',
          status: dto.status,
          progress: dto.progress,
        },
        select: projectSelect,
      });
    } catch (error) {
      throw this.translate(error);
    }
  }

  async update(tenant: TenantContext, id: string, dto: UpdateProjectDto) {
    this.assertAdmin(tenant);
    try {
      return await this.prisma.project.update({
        where: { id, tenantId: tenant.id },
        data: {
          name: dto.name?.trim(),
          description: dto.description?.trim(),
          status: dto.status,
          progress: dto.progress,
        },
        select: projectSelect,
      });
    } catch (error) {
      throw this.translate(error);
    }
  }

  async remove(tenant: TenantContext, id: string) {
    this.assertAdmin(tenant);
    try {
      await this.prisma.project.delete({ where: { id, tenantId: tenant.id } });
    } catch (error) {
      throw this.translate(error);
    }
  }

  private assertAdmin(tenant: TenantContext) {
    if (!isTenantAdmin(tenant)) {
      throw new ForbiddenException('Only tenant admins can manage projects');
    }
  }

  private translate(error: unknown) {
    if (isPrismaError(error, RECORD_NOT_FOUND)) {
      return new NotFoundException('Project not found');
    }
    if (isPrismaError(error, UNIQUE_VIOLATION)) {
      return new ConflictException('A project with this name already exists');
    }
    return error;
  }
}
