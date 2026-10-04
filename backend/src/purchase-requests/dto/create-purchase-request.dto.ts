export class CreatePurchaseRequestItemDto {
  name!: string;
  description?: string;
  quantity!: number;
  estimatedUnitCost?: number | string;
}

export class CreatePurchaseRequestDto {
  requesterId!: string;
  title!: string;
  description?: string;
  items!: CreatePurchaseRequestItemDto[];
}
