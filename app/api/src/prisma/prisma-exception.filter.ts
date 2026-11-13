import {
  ArgumentsHost,
  Catch,
  ConflictException,
  ExceptionFilter,
  HttpException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../generated/prisma/client.js';
import {
  RECORD_NOT_FOUND,
  TRANSACTION_CONFLICT,
  UNIQUE_VIOLATION,
} from './prisma-errors.js';

/**
 * Safety net for Prisma errors that services didn't translate themselves,
 * so they surface as 404/409 instead of a bare 500.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(error: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const http = this.toHttp(error);
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(http.getStatus())
      .json(http.getResponse());
  }

  private toHttp(error: Prisma.PrismaClientKnownRequestError): HttpException {
    switch (error.code) {
      case RECORD_NOT_FOUND:
        return new NotFoundException('Record not found');
      case UNIQUE_VIOLATION:
        return new ConflictException('Record already exists');
      case TRANSACTION_CONFLICT:
        return new ConflictException(
          'The record was changed by another request. Try again.',
        );
      default:
        this.logger.error(error);
        return new InternalServerErrorException();
    }
  }
}
