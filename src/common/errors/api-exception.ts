import { HttpException, HttpStatus } from "@nestjs/common";
import { ApiErrorResponse } from "./error-response";
import { ErrorCode } from "./error-code";

export class ApiException extends HttpException {
  constructor(statusCode: HttpStatus, code: ErrorCode, message: string) {
    super(
      {
        error: {
          code,
          message,
          statusCode,
        },
      } satisfies ApiErrorResponse,
      statusCode,
    );
  }
}
