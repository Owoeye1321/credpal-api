import { UserProps } from '../types/user-props.type';

export class UserEntity {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly passwordHash: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly role: string,
    public readonly isEmailVerified: boolean,
    public readonly isActive: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static create(params: UserProps): UserEntity {
    return new UserEntity(
      params.id,
      params.email,
      params.passwordHash,
      params.firstName,
      params.lastName,
      params.role,
      params.isEmailVerified,
      params.isActive,
      params.createdAt,
      params.updatedAt,
    );
  }
}
