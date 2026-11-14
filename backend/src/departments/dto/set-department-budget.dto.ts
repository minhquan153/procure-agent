export class SetDepartmentBudgetDto {
  userId!: string;
  fiscalYear!: number;
  budgetLimit!: number | string;
}
