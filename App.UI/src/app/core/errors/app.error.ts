export class AppError extends Error {
  title?: string;
  type?: string;
  status: number;
  errors?: Record<string, string[]>;

  constructor(options: {
    message: string;
    status: number;
    title?: string;
    type?: string;
    errors?: Record<string, string[]>;
  }) {
    super(options.message);

    this.name = 'AppError';
    this.status = options.status;
    this.title = options.title;
    this.type = options.type;
    this.errors = options.errors;

    Object.setPrototypeOf(this, AppError.prototype);
  }
}
