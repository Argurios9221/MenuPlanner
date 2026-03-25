// Centralized error handling and logging
import { showToast } from '../modules/ui.js';

const ErrorType = {
  NETWORK: 'NETWORK_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  STORAGE: 'STORAGE_ERROR',
  API: 'API_ERROR',
  PARSE: 'PARSE_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR',
};

const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

class AppError extends Error {
  constructor(message, type = ErrorType.UNKNOWN, severity = ErrorSeverity.MEDIUM) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.severity = severity;
    this.timestamp = new Date();
  }
}

// Error logger
const errorLog = {
  errors: [],
  maxSize: 100,

  add(error) {
    const entry = {
      message: error.message,
      type: error.type || ErrorType.UNKNOWN,
      severity: error.severity || ErrorSeverity.MEDIUM,
      timestamp: error.timestamp || new Date(),
      stack: error.stack,
    };

    this.errors.push(entry);

    // Keep only latest errors
    if (this.errors.length > this.maxSize) {
      this.errors = this.errors.slice(-this.maxSize);
    }

    // Log to console in dev
    if (import.meta.env.DEV) {
      console.error(entry);
    }
  },

  getAll() {
    return this.errors;
  },

  clear() {
    this.errors = [];
  },

  export() {
    return JSON.stringify(this.errors, null, 2);
  },
};

// Global error handler
export function handleError(error, userMessage = null) {
  let appError;

  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof TypeError) {
    appError = new AppError(error.message, ErrorType.PARSE, ErrorSeverity.HIGH);
  } else if (error instanceof SyntaxError) {
    appError = new AppError(error.message, ErrorType.PARSE, ErrorSeverity.HIGH);
  } else if (error instanceof ReferenceError) {
    appError = new AppError(error.message, ErrorType.UNKNOWN, ErrorSeverity.MEDIUM);
  } else {
    appError = new AppError(
      error?.message || 'An unexpected error occurred',
      ErrorType.UNKNOWN,
      ErrorSeverity.MEDIUM
    );
  }

  errorLog.add(appError);

  // Show user toast
  const displayMessage = userMessage || getErrorMessage(error);
  showToast(`Error: ${displayMessage}`, 5000);

  return appError;
}

// Network error handler
export async function handleNetworkError(error, retryFn = null, maxRetries = 3) {
  const appError = new AppError(
    error?.message || 'Network request failed',
    ErrorType.NETWORK,
    ErrorSeverity.HIGH
  );

  errorLog.add(appError);

  if (retryFn && maxRetries > 0) {
    showToast(`Network error. Retrying... (${maxRetries} attempts left)`, 3000);

    for (let i = 0; i < maxRetries; i++) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
        return await retryFn();
      } catch {
        if (i === maxRetries - 1) {
          throw appError;
        }
      }
    }
  }

  showToast('Failed to connect. Please check your internet connection.', 5000);
  throw appError;
}

// Validation error handler
export function handleValidationError(fieldName, message) {
  const appError = new AppError(
    `Validation failed for ${fieldName}: ${message}`,
    ErrorType.VALIDATION,
    ErrorSeverity.MEDIUM
  );

  errorLog.add(appError);
  showToast(`Invalid input: ${message}`, 3000);
  throw appError;
}

// Storage error handler
export function handleStorageError(operation, error) {
  const appError = new AppError(
    `Storage operation failed (${operation}): ${error?.message}`,
    ErrorType.STORAGE,
    ErrorSeverity.HIGH
  );

  errorLog.add(appError);
  showToast('Failed to save data. Try clearing some data from your cache.', 5000);
  throw appError;
}

// Get user-friendly error message
function getErrorMessage(error) {
  if (!error) {
    return 'An unexpected error occurred';
  }

  if (error.type === ErrorType.NETWORK) {
    return 'Network connection failed. Please check your internet.';
  }

  if (error.type === ErrorType.VALIDATION) {
    return 'Please check your input and try again.';
  }

  if (error.type === ErrorType.STORAGE) {
    return 'Failed to save data. Please try again.';
  }

  if (error.type === ErrorType.API) {
    return 'Server error. Please try again later.';
  }

  if (error.type === ErrorType.PARSE) {
    return 'Data format error. Please refresh the page.';
  }

  return error?.message || 'An error occurred';
}

// Validation helpers
export const validators = {
  notEmpty: (value) => {
    if (typeof value === 'string' && value.trim().length === 0) {
      throw new AppError('This field is required', ErrorType.VALIDATION);
    }
    if (Array.isArray(value) && value.length === 0) {
      throw new AppError('Please select at least one item', ErrorType.VALIDATION);
    }
  },

  minLength: (value, min) => {
    if (typeof value === 'string' && value.length < min) {
      throw new AppError(`At least ${min} characters required`, ErrorType.VALIDATION);
    }
  },

  maxLength: (value, max) => {
    if (typeof value === 'string' && value.length > max) {
      throw new AppError(`Maximum ${max} characters allowed`, ErrorType.VALIDATION);
    }
  },

  isNumber: (value) => {
    if (isNaN(value) || value === '') {
      throw new AppError('Please enter a valid number', ErrorType.VALIDATION);
    }
  },

  isEmail: (value) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(value)) {
      throw new AppError('Please enter a valid email', ErrorType.VALIDATION);
    }
  },

  isURL: (value) => {
    try {
      new URL(value);
    } catch {
      throw new AppError('Please enter a valid URL', ErrorType.VALIDATION);
    }
  },
};

// Safe async wrapper
export function wrapAsync(fn) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error);
      throw error;
    }
  };
}

// Boundary component for React-like error boundaries
export class ErrorBoundary {
  constructor(fn) {
    this.fn = fn;
    this.error = null;
  }

  async execute(...args) {
    try {
      this.error = null;
      return await this.fn(...args);
    } catch (error) {
      this.error = handleError(error);
      throw this.error;
    }
  }

  getError() {
    return this.error;
  }

  clearError() {
    this.error = null;
  }
}

export default {
  ErrorType,
  ErrorSeverity,
  AppError,
  errorLog,
  handleError,
  handleNetworkError,
  handleValidationError,
  handleStorageError,
  validators,
  wrapAsync,
  ErrorBoundary,
};
