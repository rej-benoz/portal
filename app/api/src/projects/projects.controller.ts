import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js';
import { CurrentTenant } from '../tenancy/current-tenant.decorator.js';
import type { TenantContext } from '../tenancy/tenant-access.js';
import { TenantGuard } from '../tenancy/tenant.guard.js';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto.js';
import { ProjectsService } from './projects.service.js';

@Controller('projects')
@UseGuards(AuthGuard, TenantGuard)
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  list(@CurrentTenant() tenant: TenantContext) {
    return this.projects.list(tenant);
  }

  @Get(':id')
  get(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.projects.get(tenant, id);
  }

  @Post()
  create(
    @CurrentTenant() tenant: TenantContext,
    @Body() body: CreateProjectDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.projects.create(tenant, request.user.sub, body);
  }

  @Patch(':id')
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() body: UpdateProjectDto,
  ) {
    return this.projects.update(tenant, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.projects.remove(tenant, id);
  }
}
