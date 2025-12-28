// Feature: multimodal-content-viewer
// Input validation utilities

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateQueryInput(input: string): ValidationResult {
  // Check for empty or undefined input
  if (!input) {
    return {
      isValid: false,
      error: 'Query input cannot be empty'
    };
  }

  // Check for whitespace-only input
  if (input.trim().length === 0) {
    return {
      isValid: false,
      error: 'Query input cannot be only whitespace'
    };
  }

  // Check character limit (2000 characters max)
  if (input.length > 2000) {
    return {
      isValid: false,
      error: `Query input cannot exceed 2000 characters (current: ${input.length})`
    };
  }

  return {
    isValid: true
  };
}

export function validateSessionId(sessionId: string): ValidationResult {
  if (!sessionId || sessionId.trim().length === 0) {
    return {
      isValid: false,
      error: 'Session ID cannot be empty'
    };
  }

  // Basic format validation for session ID (alphanumeric with hyphens)
  const sessionIdPattern = /^[a-zA-Z0-9-]+$/;
  if (!sessionIdPattern.test(sessionId)) {
    return {
      isValid: false,
      error: 'Session ID contains invalid characters'
    };
  }

  return {
    isValid: true
  };
}