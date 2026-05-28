import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { Customer } from "../src/customers/entities/customer.entity";
import {
  WalletTransaction,
  WalletTransactionType,
} from "../src/transfers/entities/wallet-transaction.entity";
import { TransfersModule } from "../src/transfers/transfers.module";
import { TransfersService } from "../src/transfers/transfers.service";
import { Wallet } from "../src/wallets/entities/wallet.entity";

describe("TransfersService", () => {
  let moduleRef: TestingModule;
  let dataSource: DataSource;
  let transfersService: TransfersService;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: "sqlite",
          database: ":memory:",
          entities: [Customer, Wallet, WalletTransaction],
          synchronize: true,
          dropSchema: true,
        }),
        TransfersModule,
      ],
    }).compile();

    dataSource = moduleRef.get(DataSource);
    transfersService = moduleRef.get(TransfersService);
  });

  afterEach(async () => {
    await dataSource.destroy();
    await moduleRef.close();
  });

  it("atomically debits, credits, and records a transfer", async () => {
    const { sourceWallet, destinationWallet } = await createWalletPair(
      1000,
      250,
    );

    const transfer = await transfersService.transfer({
      sourceWalletId: sourceWallet.id,
      destinationWalletId: destinationWallet.id,
      amountMinorUnits: 400,
      description: "Dinner split",
    });

    await expect(balanceOf(sourceWallet.id)).resolves.toBe(600);
    await expect(balanceOf(destinationWallet.id)).resolves.toBe(650);
    expect(transfer.amountMinorUnits).toBe(400);
    expect(transfer.sourceWalletId).toBe(sourceWallet.id);
    expect(transfer.destinationWalletId).toBe(destinationWallet.id);
  });

  it("rejects insufficient funds without changing balances or recording a transfer", async () => {
    const { sourceWallet, destinationWallet } = await createWalletPair(
      100,
      250,
    );

    await expect(
      transfersService.transfer({
        sourceWalletId: sourceWallet.id,
        destinationWalletId: destinationWallet.id,
        amountMinorUnits: 400,
      }),
    ).rejects.toMatchObject({
      response: {
        error: {
          code: "INSUFFICIENT_FUNDS",
        },
      },
    });

    await expect(balanceOf(sourceWallet.id)).resolves.toBe(100);
    await expect(balanceOf(destinationWallet.id)).resolves.toBe(250);
    await expect(transactionCount()).resolves.toBe(0);
  });

  it("rejects transfers between wallets with different currencies", async () => {
    const { sourceWallet, destinationWallet } = await createWalletPair(
      1000,
      250,
      {
        destinationCurrency: "EUR",
      },
    );

    await expect(
      transfersService.transfer({
        sourceWalletId: sourceWallet.id,
        destinationWalletId: destinationWallet.id,
        amountMinorUnits: 100,
      }),
    ).rejects.toMatchObject({
      response: {
        error: {
          code: "CURRENCY_MISMATCH",
        },
      },
    });

    await expect(balanceOf(sourceWallet.id)).resolves.toBe(1000);
    await expect(balanceOf(destinationWallet.id)).resolves.toBe(250);
    await expect(transactionCount()).resolves.toBe(0);
  });

  it("rolls back balance changes and transaction rows when the transaction callback throws", async () => {
    const { sourceWallet, destinationWallet } = await createWalletPair(
      1000,
      250,
    );

    await expect(
      dataSource.transaction(async (manager) => {
        await manager.decrement(
          Wallet,
          { id: sourceWallet.id },
          "balanceMinorUnits",
          300,
        );
        await manager.increment(
          Wallet,
          { id: destinationWallet.id },
          "balanceMinorUnits",
          300,
        );
        await manager.save(
          manager.create(WalletTransaction, {
            type: WalletTransactionType.Transfer,
            amountMinorUnits: 300,
            currency: "USD",
            sourceWalletId: sourceWallet.id,
            destinationWalletId: destinationWallet.id,
            description: "Forced rollback",
          }),
        );

        throw new Error("force rollback");
      }),
    ).rejects.toThrow("force rollback");

    await expect(balanceOf(sourceWallet.id)).resolves.toBe(1000);
    await expect(balanceOf(destinationWallet.id)).resolves.toBe(250);
    await expect(transactionCount()).resolves.toBe(0);
  });

  async function createWalletPair(
    sourceBalance: number,
    destinationBalance: number,
    options: { sourceCurrency?: string; destinationCurrency?: string } = {},
  ) {
    const customersRepository = dataSource.getRepository(Customer);
    const walletsRepository = dataSource.getRepository(Wallet);

    const sourceCustomer = await customersRepository.save(
      customersRepository.create({
        name: "Ada Lovelace",
        email: "ada@example.com",
      }),
    );
    const destinationCustomer = await customersRepository.save(
      customersRepository.create({
        name: "Grace Hopper",
        email: "grace@example.com",
      }),
    );

    const sourceWallet = await walletsRepository.save(
      walletsRepository.create({
        customerId: sourceCustomer.id,
        balanceMinorUnits: sourceBalance,
        currency: options.sourceCurrency ?? "USD",
      }),
    );
    const destinationWallet = await walletsRepository.save(
      walletsRepository.create({
        customerId: destinationCustomer.id,
        balanceMinorUnits: destinationBalance,
        currency: options.destinationCurrency ?? "USD",
      }),
    );

    return { sourceWallet, destinationWallet };
  }

  async function balanceOf(walletId: string): Promise<number> {
    const wallet = await dataSource
      .getRepository(Wallet)
      .findOneByOrFail({ id: walletId });
    return wallet.balanceMinorUnits;
  }

  function transactionCount(): Promise<number> {
    return dataSource.getRepository(WalletTransaction).count();
  }
});
