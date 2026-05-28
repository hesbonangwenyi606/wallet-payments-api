import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Customer } from "../../customers/entities/customer.entity";

@Check('"balanceMinorUnits" >= 0')
@Entity("wallets")
export class Wallet {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index({ unique: true })
  @Column()
  customerId: string;

  @OneToOne(() => Customer, (customer) => customer.wallet, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "customerId" })
  customer: Customer;

  @Column({ type: "integer", default: 0 })
  balanceMinorUnits: number;

  @Column({ length: 3, default: "USD" })
  currency: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
