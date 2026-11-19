import {
  Body,
  Controller,
  Get,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser, Public } from './auth.decorators.js';
import {
  AuthService,
  SESSION_COOKIE,
  SESSION_MAX_AGE_MS,
} from './auth.service.js';
import type { AuthenticatedUser } from './auth.types.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    const credentials = typeof body === 'object' && body !== null ? body as Record<string, unknown> : {};
    const result = await this.authService.login(credentials.email, credentials.password);
    response.cookie(SESSION_COOKIE, result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_MS,
    });
    return { expiresAt: result.expiresAt };
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    const { sessionId: _sessionId, ...safeUser } = user;
    return safeUser;
  }

  @Post('logout')
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(user.sessionId);
    response.clearCookie(SESSION_COOKIE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return { success: true };
  }
}
