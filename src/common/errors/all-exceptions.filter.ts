import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Response } from "express";
import { ApiErrorResponse } from "./error-response";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      response
        .status(statusCode)
        .json(this.fromHttpException(exception, statusCode));
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred.",
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      },
    } satisfies ApiErrorResponse);
  }

  private fromHttpException(
    exception: HttpException,
    statusCode: number,
  ): ApiErrorResponse {
    const payload = exception.getResponse();

    if (typeof payload === "object" && payload !== null && "error" in payload) {
      return payload as ApiErrorResponse;
    }

    return {
      error: {
        code:
          statusCode === HttpStatus.BAD_REQUEST
            ? "VALIDATION_ERROR"
            : "HTTP_ERROR",
        message:
          typeof payload === "string"
            ? payload
            : exception.message || "Request failed.",
        statusCode,
      },
    };
  }
}
