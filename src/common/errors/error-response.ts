export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    statusCode: number;
    fields?: Record<string, string[]>;
  };
}
