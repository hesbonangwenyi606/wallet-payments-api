@Injectable()
export class WalletsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Wallet)
    private readonly walletsRepository: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private readonly transactionsRepository: Repository<WalletTransaction>,
  ) {}

  // Deposit money into a wallet (runs inside a DB transaction for safety)
  async deposit(walletId: string, dto: DepositFundsDto) {
    return this.dataSource.transaction(async (manager) => {
      // find wallet first
      const wallet = await manager.findOne(Wallet, { where: { id: walletId } });

      // stop if wallet doesn't exist
      if (!wallet) {
        throw new ApiException(
          HttpStatus.NOT_FOUND,
          ErrorCode.WALLET_NOT_FOUND,
          "Wallet not found.",
        );
      }

      // increase wallet balance
      await manager
        .createQueryBuilder()
        .update(Wallet)
        .set({
          balanceMinorUnits: () => "balanceMinorUnits + :amount",
        })
        .where("id = :walletId", { walletId, amount: dto.amountMinorUnits })
        .execute();

      // record deposit transaction
      const transaction = await manager.save(
        manager.create(WalletTransaction, {
          type: WalletTransactionType.Deposit,
          amountMinorUnits: dto.amountMinorUnits,
          currency: wallet.currency,
          sourceWalletId: null,
          destinationWalletId: wallet.id,
          description: dto.description ?? null,
        }),
      );

      // fetch updated wallet after deposit
      const updatedWallet = await manager.findOneByOrFail(Wallet, {
        id: walletId,
      });

      return { wallet: updatedWallet, transaction };
    });
  }

  // Get wallet transactions with pagination
  async listTransactions(walletId: string, query: PaginationQueryDto) {
    // check wallet exists first
    const walletExists = await this.walletsRepository.exists({
      where: { id: walletId },
    });

    if (!walletExists) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        ErrorCode.WALLET_NOT_FOUND,
        "Wallet not found.",
      );
    }

    const page = query.page;
    const limit = query.limit;

    // get transactions where wallet is either sender or receiver
    const [items, total] = await this.transactionsRepository
      .createQueryBuilder("transaction")
      .where("transaction.sourceWalletId = :walletId", { walletId })
      .orWhere("transaction.destinationWalletId = :walletId", { walletId })
      .orderBy("transaction.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // table structure (mainly for response formatting)
    const columns = [
      { key: "createdAt", title: "Date" },
      { key: "direction", title: "Direction" },
      { key: "type", title: "Type" },
      { key: "amountMinorUnits", title: "Amount" },
      { key: "balanceChangeMinorUnits", title: "Balance Change" },
      { key: "currency", title: "Currency" },
      { key: "counterpartyWalletId", title: "Counterparty Wallet" },
      { key: "description", title: "Description" },
    ];

    // convert DB rows into API-friendly format
    const rows = items.map((transaction) =>
      this.toTransactionRow(transaction, walletId),
    );

    return {
      tableTitle: "Wallet Transactions",
      columns,
      table: {
        title: "Wallet Transactions",
        headers: columns.map((column) => column.title),
        rows: rows.map((row) =>
          columns.map((column) => row[column.key] ?? null),
        ),
      },
      items,
      rows,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Convert a transaction into a readable row format
  private toTransactionRow(
    transaction: WalletTransaction,
    walletId: string,
  ): Record<string, string | number | Date | null> {

    // check if this transaction is money going out
    const isDebit = transaction.sourceWalletId === walletId;

    // figure out the other party in the transaction
    const counterpartyWalletId = isDebit
      ? transaction.destinationWalletId
      : transaction.sourceWalletId;

    return {
      id: transaction.id,
      direction: isDebit ? "OUT" : "IN",
      type: transaction.type,
      amountMinorUnits: transaction.amountMinorUnits,

      // negative for outgoing, positive for incoming
      balanceChangeMinorUnits: isDebit
        ? -transaction.amountMinorUnits
        : transaction.amountMinorUnits,

      currency: transaction.currency,
      counterpartyWalletId,
      description: transaction.description,
      createdAt: transaction.createdAt,
    };
  }
}