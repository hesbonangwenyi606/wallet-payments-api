import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { ApiException } from "../common/errors/api-exception";
import { ErrorCode } from "../common/errors/error-code";
import { Wallet } from "../wallets/entities/wallet.entity";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { Customer } from "./entities/customer.entity";

@Injectable()
export class CustomersService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
  ) {}

  async create(dto: CreateCustomerDto): Promise<Customer> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const customer = manager.create(Customer, {
          name: dto.name,
          email: dto.email.toLowerCase(),
        });
        const wallet = manager.create(Wallet, {
          currency: dto.currency ?? "USD",
          balanceMinorUnits: 0,
        });
        customer.wallet = wallet;

        return manager.save(Customer, customer);
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ApiException(
          HttpStatus.CONFLICT,
          ErrorCode.EMAIL_ALREADY_EXISTS,
          "A customer with this email already exists.",
        );
      }
      throw error;
    }
  }

  async findOne(id: string): Promise<Customer> {
    const customer = await this.customersRepository.findOne({
      where: { id },
      relations: { wallet: true },
    });

    if (!customer) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        ErrorCode.CUSTOMER_NOT_FOUND,
        "Customer not found.",
      );
    }

    return customer;
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "SQLITE_CONSTRAINT"
    );
  }
}
