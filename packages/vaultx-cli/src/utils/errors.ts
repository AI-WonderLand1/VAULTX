export class CLIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CLIError';
  }
}

export function handleError(error: unknown) {
  if (error instanceof CLIError) {
    console.error(`\nError: ${error.message}\n`);
  } else if (error instanceof Error) {
    // Avoid exposing sensitive details like URLs or stack traces in generic messages if possible,
    // but for debugging, we might just print the message.
    console.error(`\nAn unexpected error occurred: ${error.message}\n`);
  } else {
    console.error(`\nAn unknown error occurred.\n`);
  }
  process.exit(1);
}
