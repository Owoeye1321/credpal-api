import { faker } from '@faker-js/faker';
import { UserEntity } from '../../../../src/modules/auth/internal/domain/entities/user.entity';
import { UserProps } from '../../../../src/modules/auth/internal/domain/types/user-props.type';

function createUserProps(overrides: Partial<UserProps> = {}): UserProps {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email().toLowerCase(),
    passwordHash: faker.string.alphanumeric(60),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    role: 'USER',
    isEmailVerified: true,
    isActive: true,
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  };
}

describe('UserEntity', () => {
  describe('create', () => {
    it('should create a UserEntity from valid props', () => {
      const props = createUserProps();
      const user = UserEntity.create(props);
      expect(user).toBeInstanceOf(UserEntity);
    });
  });

  describe('properties', () => {
    it('should return the correct id', () => {
      const props = createUserProps();
      const user = UserEntity.create(props);
      expect(user.id).toBe(props.id);
    });

    it('should return the correct email', () => {
      const props = createUserProps({ email: 'test@example.com' });
      const user = UserEntity.create(props);
      expect(user.email).toBe('test@example.com');
    });

    it('should return the correct passwordHash', () => {
      const props = createUserProps({ passwordHash: 'hash123' });
      const user = UserEntity.create(props);
      expect(user.passwordHash).toBe('hash123');
    });

    it('should return the correct firstName', () => {
      const props = createUserProps({ firstName: 'John' });
      const user = UserEntity.create(props);
      expect(user.firstName).toBe('John');
    });

    it('should return the correct lastName', () => {
      const props = createUserProps({ lastName: 'Doe' });
      const user = UserEntity.create(props);
      expect(user.lastName).toBe('Doe');
    });

    it('should return the correct role', () => {
      const props = createUserProps({ role: 'ADMIN' });
      const user = UserEntity.create(props);
      expect(user.role).toBe('ADMIN');
    });

    it('should return the correct isEmailVerified', () => {
      const props = createUserProps({ isEmailVerified: false });
      const user = UserEntity.create(props);
      expect(user.isEmailVerified).toBe(false);
    });

    it('should return the correct isActive', () => {
      const props = createUserProps({ isActive: false });
      const user = UserEntity.create(props);
      expect(user.isActive).toBe(false);
    });

    it('should return the correct createdAt', () => {
      const date = new Date('2024-01-15T10:00:00Z');
      const props = createUserProps({ createdAt: date });
      const user = UserEntity.create(props);
      expect(user.createdAt).toEqual(date);
    });

    it('should return the correct updatedAt', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const props = createUserProps({ updatedAt: date });
      const user = UserEntity.create(props);
      expect(user.updatedAt).toEqual(date);
    });
  });
});
