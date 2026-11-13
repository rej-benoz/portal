import { Prisma } from '../generated/prisma/client.js';

export function isPrismaError(
  error: unknown,
  code: string,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  );
}

/** Record required by the operation was not found. */
export const RECORD_NOT_FOUND = 'P2025';
/** Unique constraint violation. */
export const UNIQUE_VIOLATION = 'P2002';
/** Transaction conflict (e.g. a serializable transaction lost a race). */
export const TRANSACTION_CONFLICT = 'P2034';
