import { AuthTokens } from '../../domain/types/auth-tokens.type';

export interface ITokenService {
  generateTokens(payload: {
    sub: string;
    email: string;
    role: string;
  }): Promise<AuthTokens>;
}
