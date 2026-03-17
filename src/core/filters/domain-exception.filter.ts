import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { DomainException } from '../exceptions/domain.exception';

@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: DomainException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.statusCode || HttpStatus.BAD_REQUEST;

    this.logger.warn(
      `Domain exception: ${exception.message} [${exception.errorCode || 'DOMAIN_ERROR'}]`,
    );

    response.status(status).json({
      statusCode: status,
      error: exception.errorCode || 'DOMAIN_ERROR',
      message: exception.message,
      timestamp: new Date().toISOString(),
    });
  }
}
