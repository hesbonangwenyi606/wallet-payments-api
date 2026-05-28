import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { ApiException } from "../common/errors/api-exception";
import { ErrorCode } from "../common/errors/error-code";
import { Wallet } from "../wallets/entities/wallet.entity";
import { CreateTransferDto } from "./dto/create-transfer.dto";
import {
  WalletTransaction,
  WalletTransactionType,
} from "./entities/wallet-transaction.entity";

@Injectable()
export class TransfersService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Wallet)
    private readonly walletsRepository: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private readonly transactionsRepository: Repository<WalletTransaction>,
  ) {}

  async transfer(dto: CreateTransferDto): Promise<WalletTransaction> {
    if (dto.sourceWalletId === dto.destinationWalletId) {
      throw new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        ErrorCode.SELF_TRANSFER_NOT_ALLOWED,
        "Source and destination wallets must be different.",
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const [sourceWallet, destinationWallet] = await Promise.all([
        manager.findOne(Wallet, { where: { id: dto.sourceWalletId } }),
        manager.findOne(Wallet, { where: { id: dto.destinationWalletId } }),
      ]);

      if (!sourceWallet || !destinationWallet) {
        throw new ApiException(
          HttpStatus.NOT_FOUND,
          ErrorCode.WALLET_NOT_FOUND,
          "Source or destination wallet not found.",
        );
      }

      if (sourceWallet.currency !== destinationWallet.currency) {
        throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          ErrorCode.CURRENCY_MISMATCH,
          "Source and destination wallets must use the same currency.",
        );
      }

      const debitResult = await manager
        .createQueryBuilder()
        .update(Wallet)
        .set({
          balanceMinorUnits: () => "balanceMinorUnits - :amount",
        })
        .where("id = :sourceWalletId", { sourceWalletId: sourceWallet.id })
        .andWhere("balanceMinorUnits >= :amount", {
          amount: dto.amountMinorUnits,
        })
        .execute();

      if (debitResult.affected !== 1) {
        throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          ErrorCode.INSUFFICIENT_FUNDS,
          "Source wallet has insufficient funds.",
        );
      }

      await manager
        .createQueryBuilder()
        .update(Wallet)
        .set({
          balanceMinorUnits: () => "balanceMinorUnits + :amount",
        })
        .where("id = :destinationWalletId", {
          destinationWalletId: destinationWallet.id,
        })
        .setParameters({ amount: dto.amountMinorUnits })
        .execute();

      return manager.save(
        manager.create(WalletTransaction, {
          type: WalletTransactionType.Transfer,
          amountMinorUnits: dto.amountMinorUnits,
          currency: sourceWallet.currency,
          sourceWalletId: sourceWallet.id,
          destinationWalletId: destinationWallet.id,
          description: dto.description ?? null,
        }),
      );
    });
  }

  async findOne(id: string): Promise<WalletTransaction> {
    const transfer = await this.transactionsRepository.findOne({
      where: { id, type: WalletTransactionType.Transfer },
    });

    if (!transfer) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        ErrorCode.TRANSFER_NOT_FOUND,
        "Transfer not found.",
      );
    }

    return transfer;
  }
}
