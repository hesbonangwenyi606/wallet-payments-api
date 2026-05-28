import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

export enum WalletTransactionType {
  Deposit = "DEPOSIT",
  Transfer = "TRANSFER",
}

@Index(["sourceWalletId", "createdAt"])
@Index(["destinationWalletId", "createdAt"])
@Entity("wallet_transactions")
export class WalletTransaction {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 20 })
  type: WalletTransactionType;

  @Column({ type: "integer" })
  amountMinorUnits: number;

  @Column({ length: 3 })
  currency: string;

  @Column({ type: "varchar", nullable: true })
  sourceWalletId: string | null;

  @Column({ type: "varchar", nullable: true })
  destinationWalletId: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  description: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
