import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
} from "class-validator";

export class CreateCustomerDto {
  @IsString()
  @Length(1, 120)
  name: string;

  @IsEmail()
  @Length(3, 255)
  email: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency?: string;
}
