import { UserEntity } from '../../domain/entities/user.entity';

export interface IUserRepository {
  findByEmail(email: string): Promise<UserEntity | null>;
  findById(id: string): Promise<UserEntity | null>;
  create(params: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    role: string;
    isEmailVerified?: boolean;
  }): Promise<UserEntity>;
  updateEmailVerified(id: string, isEmailVerified: boolean): Promise<void>;
}
