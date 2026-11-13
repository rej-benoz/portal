import { IsEnum } from 'class-validator';
import { TenantRole } from '../../generated/prisma/client.js';

export class UpdateMemberRoleDto {
  @IsEnum(TenantRole, {
    message: `role must be one of: ${Object.values(TenantRole).join(', ')}`,
  })
  role: TenantRole;
}
