import { ContentFundingCanonicalizationError } from '@commonality/sdk';

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function toErrorResponse(error: unknown): {
  status: number;
  body: Record<string, unknown>;
} {
  if (error instanceof HttpError) {
    return {
      status: error.status,
      body: buildErrorBody(error.code, error.message, error.details),
    };
  }

  if (error instanceof ContentFundingCanonicalizationError) {
    return {
      status: 400,
      body: buildErrorBody(error.code, error.message),
    };
  }

  if (error instanceof Error) {
    return {
      status: 500,
      body: buildErrorBody('internal_error', error.message),
    };
  }

  return {
    status: 500,
    body: buildErrorBody('internal_error', 'An unexpected error occurred'),
  };
}

function buildErrorBody(
  code: string,
  message: string,
  details?: unknown,
): Record<string, unknown> {
  if (details === undefined) {
    return { error: code, message };
  }

  return { error: code, message, details };
}
