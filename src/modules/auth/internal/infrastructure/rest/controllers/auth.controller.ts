import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthService } from '../../../application/services/auth.service';
import { RegisterRequestDto } from '../dtos/register-request.dto';
import { VerifyRequestDto } from '../dtos/verify-request.dto';
import { LoginRequestDto } from '../dtos/login-request.dto';
import { ResendOtpRequestDto } from '../dtos/resend-otp-request.dto';
import {
  AuthResponseDto,
  VerificationResponseDto,
} from '../dtos/auth-response.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, type: VerificationResponseDto })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(
    @Body() dto: RegisterRequestDto,
  ): Promise<VerificationResponseDto> {
    return this.authService.register(dto);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email with OTP' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  async verify(@Body() dto: VerifyRequestDto): Promise<AuthResponseDto> {
    return this.authService.verifyEmail(dto.verificationToken, dto.otp);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Email not verified' })
  async login(@Body() dto: LoginRequestDto): Promise<AuthResponseDto> {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend OTP verification email' })
  @ApiResponse({ status: 200, type: VerificationResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid or expired verification token' })
  async resendOtp(
    @Body() dto: ResendOtpRequestDto,
  ): Promise<VerificationResponseDto> {
    return this.authService.resendOtp(dto.verificationToken);
  }
}
