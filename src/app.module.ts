import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CustomersModule } from "./customers/customers.module";
import { TransfersModule } from "./transfers/transfers.module";
import { WalletsModule } from "./wallets/wallets.module";

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "sqlite",
      database: process.env.DATABASE_PATH ?? "wallet.sqlite",
      autoLoadEntities: true,
      synchronize: true,
    }),
    CustomersModule,
    WalletsModule,
    TransfersModule,
  ],
})
export class AppModule {}
