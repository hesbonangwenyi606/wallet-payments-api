import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { Customer } from "../src/customers/entities/customer.entity";
import {
  WalletTransaction,
  WalletTransactionType,
} from "../src/transfers/entities/wallet-transaction.entity";
import { Wallet } from "../src/wallets/entities/wallet.entity";
import { WalletsModule } from "../src/wallets/wallets.module";
import { WalletsService } from "../src/wallets/wallets.service";

describe("WalletsService", () => {
  let moduleRef: TestingModule;
  let dataSource: DataSource;
  let walletsService: WalletsService;

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
        WalletsModule,
      ],
    }).compile();

    dataSource = moduleRef.get(DataSource);
    walletsService = moduleRef.get(WalletsService);
  });

  afterEach(async () => {
    await dataSource.destroy();
    await moduleRef.close();
  });

  it("returns wallet transactions with table-ready rows", async () => {
    const wallet = await createWallet();
    const counterpartyWalletId = "ad649653-2c34-4efc-9740-6a3c772c2e25";

    await dataSource.getRepository(WalletTransaction).save([
      {
        type: WalletTransactionType.Deposit,
        amountMinorUnits: 5000,
        currency: "USD",
        sourceWalletId: null,
        destinationWalletId: wallet.id,
        description: "Initial deposit",
      },
      {
        type: WalletTransactionType.Transfer,
        amountMinorUnits: 1250,
        currency: "USD",
        sourceWalletId: wallet.id,
        destinationWalletId: counterpartyWalletId,
        description: "Test transfer",
      },
    ]);

    const result = await walletsService.listTransactions(wallet.id, {
      page: 1,
      limit: 20,
    });

    expect(result.tableTitle).toBe("Wallet Transactions");
    expect(result.columns).toEqual([
      { key: "createdAt", title: "Date" },
      { key: "direction", title: "Direction" },
      { key: "type", title: "Type" },
      { key: "amountMinorUnits", title: "Amount" },
      { key: "balanceChangeMinorUnits", title: "Balance Change" },
      { key: "currency", title: "Currency" },
      { key: "counterpartyWalletId", title: "Counterparty Wallet" },
      { key: "description", title: "Description" },
    ]);
    expect(result.table.title).toBe("Wallet Transactions");
    expect(result.table.headers).toEqual([
      "Date",
      "Direction",
      "Type",
      "Amount",
      "Balance Change",
      "Currency",
      "Counterparty Wallet",
      "Description",
    ]);
    expect(result.table.rows).toEqual([
      [
        expect.any(Date),
        "OUT",
        WalletTransactionType.Transfer,
        1250,
        -1250,
        "USD",
        counterpartyWalletId,
        "Test transfer",
      ],
      [
        expect.any(Date),
        "IN",
        WalletTransactionType.Deposit,
        5000,
        5000,
        "USD",
        null,
        "Initial deposit",
      ],
    ]);
    expect(result.rows).toEqual([
      expect.objectContaining({
        direction: "OUT",
        type: WalletTransactionType.Transfer,
        amountMinorUnits: 1250,
        balanceChangeMinorUnits: -1250,
        currency: "USD",
        counterpartyWalletId,
        description: "Test transfer",
      }),
      expect.objectContaining({
        direction: "IN",
        type: WalletTransactionType.Deposit,
        amountMinorUnits: 5000,
        balanceChangeMinorUnits: 5000,
        currency: "USD",
        counterpartyWalletId: null,
        description: "Initial deposit",
      }),
    ]);
    expect(result.meta).toEqual({
      page: 1,
      limit: 20,
      total: 2,
      totalPages: 1,
    });
  });

  async function createWallet(): Promise<Wallet> {
    const customer = await dataSource.getRepository(Customer).save({
      name: "Ada Lovelace",
      email: "ada@example.com",
    });

    return dataSource.getRepository(Wallet).save({
      customerId: customer.id,
      balanceMinorUnits: 5000,
      currency: "USD",
    });
  }
});
