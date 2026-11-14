import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SetDepartmentBudgetDto } from './dto/set-department-budget.dto.js';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.department.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { users: true } } },
    });
  }

  async findOne(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: { users: { orderBy: { fullName: 'asc' } } },
    });

    if (!department) {
      throw new NotFoundException(`Department ${id} not found`);
    }

    return department;
  }

  async setBudget(departmentId: string, dto: SetDepartmentBudgetDto) {
    if (!dto.userId?.trim()) throw new BadRequestException('userId is required');
    if (!Number.isInteger(dto.fiscalYear) || dto.fiscalYear < 2000 || dto.fiscalYear > 2200) {
      throw new BadRequestException('fiscalYear must be a valid year');
    }
    if (!Number.isFinite(Number(dto.budgetLimit)) || Number(dto.budgetLimit) < 0) {
      throw new BadRequestException('budgetLimit must be a non-negative number');
    }
    const actor = await this.prisma.user.findUnique({
      where: { id: dto.userId }, select: { id: true, role: true },
    });
    if (!actor) throw new NotFoundException(`User ${dto.userId} not found`);
    if (actor.role !== Role.ADMIN) throw new ForbiddenException('Only ADMIN can manage budgets');
    const department = await this.prisma.department.findUnique({
      where: { id: departmentId }, select: { id: true },
    });
    if (!department) throw new NotFoundException(`Department ${departmentId} not found`);
    return this.prisma.departmentBudget.upsert({
      where: { departmentId_fiscalYear: { departmentId, fiscalYear: dto.fiscalYear } },
      update: { budgetLimit: String(dto.budgetLimit) },
      create: { departmentId, fiscalYear: dto.fiscalYear, budgetLimit: String(dto.budgetLimit) },
    });
  }
}
