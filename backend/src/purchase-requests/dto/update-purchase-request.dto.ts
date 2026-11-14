import { CreatePurchaseRequestItemDto } from './create-purchase-request.dto.js';

export class UpdatePurchaseRequestDto {
  title?: string;
  description?: string;
  items?: CreatePurchaseRequestItemDto[];
}
