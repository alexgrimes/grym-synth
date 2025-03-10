type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  data?: Record<string, any>;
}

interface LoggerOptions {
  namespace: string;
}

export class Logger {
  private readonly component: string;

  constructor(componentOrOptions: string | LoggerOptions) {
    this.component =
      typeof componentOrOptions === "string"
        ? componentOrOptions
        : componentOrOptions.namespace;
  }

  debug(message: string, data?: Record<string, any>): void {
    this.log("debug", message, data);
  }

  info(message: string, data?: Record<string, any>): void {
    this.log("info", message, data);
  }

  warn(message: string, data?: Record<string, any>): void {
    this.log("warn", message, data);
  }

  error(message: string, data?: Record<string, any>): void {
    this.log("error", message, data);
  }

  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, any>
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component: this.component,
      message,
      data,
    };

    // Format the log entry
    let logMessage = `[${entry.timestamp}] ${entry.level.toUpperCase()} [${
      entry.component
    }] ${entry.message}`;

    if (entry.data) {
      try {
        const dataStr = JSON.stringify(entry.data, this.replacer);
        logMessage += `\n  Data: ${dataStr}`;
      } catch (err) {
        const error = err as Error;
        logMessage += `\n  Data: [Error serializing data: ${error.message}]`;
      }
    }

    // Output based on log level
    switch (level) {
      case "debug":
        console.debug(logMessage);
        break;
      case "info":
        console.info(logMessage);
        break;
      case "warn":
        console.warn(logMessage);
        break;
      case "error":
        console.error(logMessage);
        break;
    }

    // Here you could add additional logging destinations:
    // - File logging
    // - Log aggregation service
    // - Metrics collection
    // etc.
  }

  private replacer(key: string, value: any): any {
    // Handle circular references and complex objects
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack,
      };
    }

    if (value instanceof Map) {
      return {
        dataType: "Map",
        value: Array.from(value.entries()),
      };
    }

    if (value instanceof Set) {
      return {
        dataType: "Set",
        value: Array.from(value.values()),
      };
    }

    // Handle function references
    if (typeof value === "function") {
      return `[Function: ${value.name || "anonymous"}]`;
    }

    // Handle undefined
    if (typeof value === "undefined") {
      return "undefined";
    }

    return value;
  }
}

// Create singleton instance for global logging configuration
let globalLogLevel: LogLevel = "info";

export const setGlobalLogLevel = (level: LogLevel): void => {
  globalLogLevel = level;
};

export const getGlobalLogLevel = (): LogLevel => {
  return globalLogLevel;
};
