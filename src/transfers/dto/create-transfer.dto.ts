import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from "class-validator";

export class CreateTransferDto {
  @IsUUID()
  sourceWalletId: string;

  @IsUUID()
  destinationWalletId: string;

  @IsInt()
  @Min(1)
  amountMinorUnits: number;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  description?: string;
}
