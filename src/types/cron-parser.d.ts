declare module 'cron-parser' {
  interface ParseOptions {
    currentDate?: Date;
    endDate?: Date;
    iterator?: boolean;
    utc?: boolean;
    tz?: string;
  }

  interface CronExpression {
    next(): { toDate(): Date; value: Date };
    prev(): { toDate(): Date; value: Date };
    hasNext(): boolean;
    hasPrev(): boolean;
    reset(): void;
  }

  function parseExpression(expression: string, options?: ParseOptions): CronExpression;

  export = {
    parseExpression
  };
} 