/*
 * One error shape for the whole frontend, whatever the server sent.
 * (Spring sends {status, error, message, fieldErrors: {field: msg}}; FastAPI sends {detail}.)
 */
export interface FieldError {
  field: string;
  message: string;
}

export interface AppError {
  status: number; // HTTP status, or 0 when the server couldn't be reached
  code: string; // machine-readable: NETWORK, CONFLICT, VALIDATION_FAILED ...
  message: string; // human-readable, from the server when it gave one
  fieldErrors: FieldError[];
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: FieldError[];

  constructor(status: number, code: string, message: string, fieldErrors: FieldError[] = []) {
    super(message);
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}
