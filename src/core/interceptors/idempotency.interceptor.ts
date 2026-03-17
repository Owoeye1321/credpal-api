import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IdempotencyKeyOrmEntity } from '../database/typeorm/entities/idempotency-key.orm-entity';
import * as crypto from 'node:crypto';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);

  constructor(
    @InjectRepository(IdempotencyKeyOrmEntity)
    private readonly idempotencyRepo: Repository<IdempotencyKeyOrmEntity>,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest();
    const idempotencyKey = request.headers['idempotency-key'] as string;

    if (!idempotencyKey) {
      return next.handle();
    }

    const userId = request.user?.sub;
    const endpoint = `${request.method} ${request.route?.path || request.url}`;
    const requestHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(request.body))
      .digest('hex');

    const existing = await this.idempotencyRepo.findOne({
      where: { key: idempotencyKey, userId },
    });

    if (existing) {
      if (existing.status === 'COMPLETED' && existing.responseBody) {
        this.logger.log(
          `Idempotency hit for key: ${idempotencyKey}`,
        );
        const response = context.switchToHttp().getResponse();
        response.status(existing.responseStatus);
        return of(existing.responseBody);
      }

      if (existing.status === 'PROCESSING') {
        const response = context.switchToHttp().getResponse();
        response.status(HttpStatus.CONFLICT);
        return of({
          statusCode: HttpStatus.CONFLICT,
          message: 'Request is already being processed',
        });
      }
    }

    const record = this.idempotencyRepo.create({
      key: idempotencyKey,
      userId,
      endpoint,
      requestHash,
      status: 'PROCESSING',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    await this.idempotencyRepo.save(record);

    return next.handle().pipe(
      tap(async (responseBody) => {
        const response = context.switchToHttp().getResponse();
        await this.idempotencyRepo.update(
          { key: idempotencyKey, userId },
          {
            status: 'COMPLETED',
            responseStatus: response.statusCode,
            responseBody: responseBody as any,
          },
        );
      }),
    );
  }
}
