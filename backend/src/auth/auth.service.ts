import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { verifyPassword } from './password.js';

export const SESSION_COOKIE = 'procure_session';
export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(emailInput: unknown, passwordInput: unknown) {
    const email = typeof emailInput === 'string' ? emailInput.trim().toLowerCase() : '';
    const password = typeof passwordInput === 'string' ? passwordInput : '';
    if (!email || !password || password.length > 1024) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng.');
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    const passwordValid = await verifyPassword(
      password,
      user?.passwordHash ?? '',
    );
    if (!user || !user.isActive || !passwordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng.');
    }

    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);
    const session = await this.prisma.userSession.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt },
      select: { id: true },
    });
    return { token, sessionId: session.id, expiresAt };
  }

  async authenticate(token: string) {
    const session = await this.prisma.userSession.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: { include: { department: true } } },
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      !session.user.isActive
    ) {
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
    }
    return {
      id: session.user.id,
      email: session.user.email,
      fullName: session.user.fullName,
      role: session.user.role,
      departmentId: session.user.departmentId,
      department: session.user.department,
      sessionId: session.id,
    };
  }

  async logout(sessionId: string) {
    await this.prisma.userSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async listSessionsForUser(userId: string) {
    return this.prisma.userSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
