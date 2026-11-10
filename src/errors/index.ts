class AuthenticationError extends Error {
  constructor(message?: string) {
    super(message);

    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly error?: string,
  ) {
    super(`API request failed [status="${status}", error="${error}"]`);

    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export { ApiError, AuthenticationError };
