import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { TenantGuard } from '../tenancy/tenant.guard.js';
import { ProjectsController } from './projects.controller.js';
import { ProjectsService } from './projects.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, TenantGuard],
})
export class ProjectsModule {}
