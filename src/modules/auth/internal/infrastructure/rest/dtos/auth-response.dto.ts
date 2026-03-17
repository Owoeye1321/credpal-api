import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  expiresIn!: string;
}

export class MessageResponseDto {
  @ApiProperty()
  message!: string;
}

export class VerificationResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty()
  verificationToken!: string;
}
