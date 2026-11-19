import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '../generated/prisma/client.js';
import { hashPassword } from '../auth/password.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      orderBy: { fullName: 'asc' },
      select: { id: true, email: true, fullName: true, role: true, isActive: true, departmentId: true, department: true, createdAt: true },
    });
  }

  async create(input: { email?: unknown; fullName?: unknown; role?: unknown; departmentId?: unknown; password?: unknown }) {
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    const fullName = typeof input.fullName === 'string' ? input.fullName.trim() : '';
    const password = typeof input.password === 'string' ? input.password : '';
    if (!/^\S+@\S+\.\S+$/.test(email) || !fullName || fullName.length > 120) throw new BadRequestException('Tên và email hợp lệ là bắt buộc.');
    if (password.length < 12 || password.length > 128) throw new BadRequestException('Mật khẩu phải có từ 12 đến 128 ký tự.');
    if (!Object.values(Role).includes(input.role as Role)) throw new BadRequestException('Vai trò không hợp lệ.');
    if (typeof input.departmentId !== 'string' || !input.departmentId) throw new BadRequestException('Phòng ban là bắt buộc.');
    const department = await this.prisma.department.findUnique({ where: { id: input.departmentId }, select: { id: true } });
    if (!department) throw new NotFoundException('Không tìm thấy phòng ban.');
    const passwordHash = await hashPassword(password);
    return this.prisma.user.create({ data: { email, fullName, role: input.role as Role, departmentId: department.id, passwordHash }, select: { id: true, email: true, fullName: true, role: true, isActive: true, departmentId: true, department: true, createdAt: true } });
  }

  async setActive(id: string, isActive: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản.');
    if (!isActive) await this.prisma.userSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    return this.prisma.user.update({ where: { id }, data: { isActive }, select: { id: true, email: true, fullName: true, role: true, isActive: true, departmentId: true, department: true, createdAt: true } });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { department: true },
    });

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return user;
  }
}
