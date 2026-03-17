import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ITokenService } from '../../application/ports/token-service.port';
import { AuthTokens } from '../../domain/types/auth-tokens.type';

@Injectable()
export class JwtTokenAdapter implements ITokenService {
  constructor(private readonly jwtService: JwtService) {}

  async generateTokens(payload: {
    sub: string;
    email: string;
    role: string;
  }): Promise<AuthTokens> {
    const accessToken = await this.jwtService.signAsync(payload);
    return {
      accessToken,
      expiresIn: '1h',
    };
  }
}
