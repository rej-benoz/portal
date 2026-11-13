import type { INestApplication, Type } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types.js';
import { configureApp } from '../src/app.setup.js';
import type { TenantRole, UserStatus } from '../src/generated/prisma/client.js';
import { PrismaExceptionFilter } from '../src/prisma/prisma-exception.filter.js';
import { PrismaModule } from '../src/prisma/prisma.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createPrismaMock } from './prisma-mock.js';

export type Membership = {
  tenantId: string;
  userId: string;
  role: TenantRole;
  status?: UserStatus;
};

/**
 * Boots the given feature modules over HTTP with the real guards, pipes and
 * filters, but with Prisma mocked (no database, see AGENTS.md).
 */
export async function createHttpApp(modules: Type[]) {
  const prisma = createPrismaMock();
  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [() => ({ JWT_SECRET: 'test-secret' })],
      }),
      PrismaModule,
      ...modules,
    ],
    providers: [{ provide: APP_FILTER, useClass: PrismaExceptionFilter }],
  })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .compile();

  const app: INestApplication<App> = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();

  const jwt = moduleRef.get(JwtService);
  return {
    app,
    prisma,
    /** Signs an access token. `extraClaims` lets tests forge claims the API must ignore. */
    tokenFor: (userId: string, extraClaims: Record<string, unknown> = {}) =>
      jwt.signAsync({ sub: userId, username: userId, ...extraClaims }),
    /** Makes tenantUser.findUnique answer from an in-memory membership list. */
    useMemberships: (memberships: Membership[]) => {
      prisma.tenantUser.findUnique.mockImplementation(
        ({
          where,
        }: {
          where: { tenantId_userId: Omit<Membership, 'role'> };
        }) => {
          const { tenantId, userId } = where.tenantId_userId;
          const found = memberships.find(
            (m) => m.tenantId === tenantId && m.userId === userId,
          );
          return Promise.resolve(
            found && {
              role: found.role,
              user: { status: found.status ?? 'ACTIVE' },
            },
          );
        },
      );
    },
  };
}
