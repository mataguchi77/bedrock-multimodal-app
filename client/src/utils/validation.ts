// Feature: multimodal-content-viewer
// Frontend validation utilities

import { ValidationResult } from '../types';

export function validateQueryInput(input: string): ValidationResult {
  // Check for empty or undefined input
  if (!input) {
    return {
      isValid: false,
      error: 'Query cannot be empty'
    };
  }

  // Check for whitespace-only input
  if (input.trim().length === 0) {
    return {
      isValid: false,
      error: 'Query cannot be only whitespace'
    };
  }

  // Check character limit (2000 characters max)
  if (input.length > 2000) {
    return {
      isValid: false,
      error: `Query cannot exceed 2000 characters (current: ${input.length})`
    };
  }

  return {
    isValid: true
  };
}

export function getCharacterCountStatus(length: number): {
  status: 'normal' | 'warning' | 'error';
  message: string;
} {
  if (length > 2000) {
    return {
      status: 'error',
      message: `${length}/2000 - Exceeds limit`
    };
  } else if (length > 1800) {
    return {
      status: 'warning',
      message: `${length}/2000 - Approaching limit`
    };
  } else {
    return {
      status: 'normal',
      message: `${length}/2000`
    };
  }
}