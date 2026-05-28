import { IsInt, IsOptional, IsString, Length, Min } from "class-validator";

export class DepositFundsDto {
  @IsInt()
  @Min(1)
  amountMinorUnits: number;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  description?: string;
}
