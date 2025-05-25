import { env } from '../../config/env.config';

/**
 * Log levels in order of severity (lowest to highest)
 * Used to control which messages are logged based on configuration
 */
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

/**
 * Represents a single log entry with all relevant metadata
 */
interface LogEntry {
  timestamp: string;
  level: string;
  service?: string;
  component?: string;
  message: string;
  data?: any;
  error?: Error;
  requestId?: string;
  userId?: string;
}

/**
 * Configuration options for the Logger instance
 */
interface LoggerConfig {
  level: LogLevel;
  service: string;
  enableConsole: boolean;
  enableFile: boolean;
  format: 'json' | 'text';
}

/**
 * Structured logging service with support for multiple log levels, 
 * colored console output, and component-specific loggers
 */
class Logger {
  private config: LoggerConfig;
  private readonly colors = {
    ERROR: '\x1b[31m',   // Red
    WARN: '\x1b[33m',    // Yellow
    INFO: '\x1b[36m',    // Cyan
    DEBUG: '\x1b[35m',   // Magenta
    TRACE: '\x1b[37m',   // White
    RESET: '\x1b[0m'     // Reset
  };

  /**
   * Creates a new Logger instance
   * @param config - Partial configuration options, defaults will be applied for missing values
   */
  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: this.parseLogLevel(env.LOG_LEVEL || 'INFO'),
      service: config.service || 'AgentTom',
      enableConsole: config.enableConsole ?? true,
      enableFile: config.enableFile ?? false,
      format: config.format || (env.NODE_ENV === 'production' ? 'json' : 'text')
    };
  }

  private parseLogLevel(level: string): LogLevel {
    switch (level.toUpperCase()) {
      case 'ERROR': return LogLevel.ERROR;
      case 'WARN': return LogLevel.WARN;
      case 'INFO': return LogLevel.INFO;
      case 'DEBUG': return LogLevel.DEBUG;
      case 'TRACE': return LogLevel.TRACE;
      default: return LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.config.level;
  }

  private formatMessage(entry: LogEntry): string {
    if (this.config.format === 'json') {
      return JSON.stringify(entry);
    }

    const color = this.colors[entry.level as keyof typeof this.colors] || '';
    const reset = this.colors.RESET;
    const timestamp = entry.timestamp;
    const level = entry.level.padEnd(5);
    const service = entry.service ? `[${entry.service}]` : '';
    const component = entry.component ? `[${entry.component}]` : '';
    
    let message = `${color}${timestamp} ${level}${reset} ${service}${component} ${entry.message}`;
    
    if (entry.data) {
      message += `\n  Data: ${JSON.stringify(entry.data, null, 2)}`;
    }
    
    if (entry.error) {
      message += `\n  Error: ${entry.error.message}`;
      if (entry.error.stack) {
        message += `\n  Stack: ${entry.error.stack}`;
      }
    }
    
    return message;
  }

  private createLogEntry(
    level: string,
    message: string,
    data?: any,
    error?: Error,
    component?: string
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      service: this.config.service,
      component,
      message,
      data,
      error,
      // These could be enhanced with request context middleware
      requestId: undefined,
      userId: undefined
    };
  }

  private log(level: LogLevel, levelName: string, message: string, data?: any, error?: Error, component?: string): void {
    if (!this.shouldLog(level)) return;

    const entry = this.createLogEntry(levelName, message, data, error, component);
    const formattedMessage = this.formatMessage(entry);

    if (this.config.enableConsole) {
      // Use appropriate console method based on level
      switch (level) {
        case LogLevel.ERROR:
          console.error(formattedMessage);
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage);
          break;
        case LogLevel.DEBUG:
        case LogLevel.TRACE:
          console.debug(formattedMessage);
          break;
        default:
          console.log(formattedMessage);
      }
    }

    // File logging could be added here
    if (this.config.enableFile) {
      // TODO: Implement file logging with rotation
    }
  }

  // Public logging methods
  
  /**
   * Logs an error message with optional error object and additional data
   * @param message - The error message to log
   * @param error - Optional Error object for stack trace
   * @param data - Optional additional data to include
   * @param component - Optional component name for context
   */
  error(message: string, error?: Error, data?: any, component?: string): void {
    this.log(LogLevel.ERROR, 'ERROR', message, data, error, component);
  }

  /**
   * Logs a warning message with optional additional data
   * @param message - The warning message to log
   * @param data - Optional additional data to include
   * @param component - Optional component name for context
   */
  warn(message: string, data?: any, component?: string): void {
    this.log(LogLevel.WARN, 'WARN', message, data, undefined, component);
  }

  /**
   * Logs an informational message with optional additional data
   * @param message - The info message to log
   * @param data - Optional additional data to include
   * @param component - Optional component name for context
   */
  info(message: string, data?: any, component?: string): void {
    this.log(LogLevel.INFO, 'INFO', message, data, undefined, component);
  }

  /**
   * Logs a debug message with optional additional data
   * @param message - The debug message to log
   * @param data - Optional additional data to include
   * @param component - Optional component name for context
   */
  debug(message: string, data?: any, component?: string): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, data, undefined, component);
  }

  /**
   * Logs a trace message with optional additional data
   * @param message - The trace message to log
   * @param data - Optional additional data to include
   * @param component - Optional component name for context
   */
  trace(message: string, data?: any, component?: string): void {
    this.log(LogLevel.TRACE, 'TRACE', message, data, undefined, component);
  }

  // Convenience methods for common use cases
  
  /**
   * Logs a startup-related message with rocket emoji
   * @param message - The startup message to log
   * @param data - Optional additional data to include
   */
  startup(message: string, data?: any): void {
    this.info(`🚀 ${message}`, data, 'STARTUP');
  }

  /**
   * Logs a database-related message with database emoji
   * @param message - The database message to log
   * @param data - Optional additional data to include
   */
  database(message: string, data?: any): void {
    this.info(`🗄️ ${message}`, data, 'DATABASE');
  }

  /**
   * Logs an API-related message with globe emoji
   * @param message - The API message to log
   * @param data - Optional additional data to include
   */
  api(message: string, data?: any): void {
    this.info(`🌐 ${message}`, data, 'API');
  }

  /**
   * Logs a tool-related message with wrench emoji
   * @param message - The tool message to log
   * @param data - Optional additional data to include
   */
  tool(message: string, data?: any): void {
    this.info(`🔧 ${message}`, data, 'TOOL');
  }

  /**
   * Logs a migration-related message with package emoji
   * @param message - The migration message to log
   * @param data - Optional additional data to include
   */
  migration(message: string, data?: any): void {
    this.info(`📦 ${message}`, data, 'MIGRATION');
  }

  /**
   * Creates a child logger with a specific component name
   * All logs from the child logger will include the component in the output
   * @param component - The component name to associate with this logger
   * @returns A new ComponentLogger instance
   */
  child(component: string): ComponentLogger {
    return new ComponentLogger(this, component);
  }
}

/**
 * Component-specific logger that automatically includes component name in all log entries
 * Created via the parent Logger's child() method
 */
class ComponentLogger {
  constructor(private parent: Logger, private component: string) {}

  /**
   * Logs an error message with the component context
   * @param message - The error message to log
   * @param error - Optional Error object for stack trace
   * @param data - Optional additional data to include
   */
  error(message: string, error?: Error, data?: any): void {
    this.parent.error(message, error, data, this.component);
  }

  /**
   * Logs a warning message with the component context
   * @param message - The warning message to log
   * @param data - Optional additional data to include
   */
  warn(message: string, data?: any): void {
    this.parent.warn(message, data, this.component);
  }

  /**
   * Logs an informational message with the component context
   * @param message - The info message to log
   * @param data - Optional additional data to include
   */
  info(message: string, data?: any): void {
    this.parent.info(message, data, this.component);
  }

  /**
   * Logs a debug message with the component context
   * @param message - The debug message to log
   * @param data - Optional additional data to include
   */
  debug(message: string, data?: any): void {
    this.parent.debug(message, data, this.component);
  }

  /**
   * Logs a trace message with the component context
   * @param message - The trace message to log
   * @param data - Optional additional data to include
   */
  trace(message: string, data?: any): void {
    this.parent.trace(message, data, this.component);
  }
}

/**
 * Default singleton logger instance for general application use
 * Configured with environment variables and default settings
 */
export const logger = new Logger();

/**
 * Creates a new Logger instance with a specific service name
 * Useful for creating service-specific loggers with different configurations
 * @param service - The service name to associate with this logger
 * @returns A new Logger instance configured for the specified service
 */
export const createLogger = (service: string): Logger => {
  return new Logger({ service });
};

export default logger; 