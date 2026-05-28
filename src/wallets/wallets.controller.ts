import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";
import { DepositFundsDto } from "./dto/deposit-funds.dto";
import { WalletsService } from "./wallets.service";

@Controller("wallets")
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Post(":id/deposits")
  deposit(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: DepositFundsDto,
  ) {
    return this.walletsService.deposit(id, dto);
  }

  @Get(":id/transactions")
  listTransactions(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.walletsService.listTransactions(id, query);
  }
}
