import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ValidationError } from "class-validator";
import "reflect-metadata";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/errors/all-exceptions.filter";
import { ApiErrorResponse } from "./common/errors/error-response";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new BadRequestException(validationErrorBody(errors)),
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

void bootstrap();

function validationErrorBody(errors: ValidationError[]): ApiErrorResponse {
  const fields = errors.reduce<Record<string, string[]>>((acc, error) => {
    acc[error.property] = Object.values(error.constraints ?? {});
    return acc;
  }, {});

  return {
    error: {
      code: "VALIDATION_ERROR",
      message: "Request validation failed.",
      statusCode: 400,
      fields,
    },
  };
}
