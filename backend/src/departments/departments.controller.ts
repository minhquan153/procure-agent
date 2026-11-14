import { Body, Controller, Get, Param, Post } from '@nestjs/common';
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
  setBudget(@Param('id') id: string, @Body() dto: SetDepartmentBudgetDto) {
    return this.departmentsService.setBudget(id, dto);
  }
}
