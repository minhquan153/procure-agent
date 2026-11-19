import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/auth.decorators.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { DepartmentsService } from './departments.service.js';
import { SetDepartmentBudgetDto } from './dto/set-department-budget.dto.js';

@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  findAll() {
    return this.departmentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(id);
  }

  @Post(':id/budgets')
  setBudget(@Param('id') id: string, @Body() dto: SetDepartmentBudgetDto, @CurrentUser() user: AuthenticatedUser) {
    return this.departmentsService.setBudget(id, {
      userId: user.id,
      fiscalYear: dto.fiscalYear,
      budgetLimit: dto.budgetLimit,
    });
  }
}
