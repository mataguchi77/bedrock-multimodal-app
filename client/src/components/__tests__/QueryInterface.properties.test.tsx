// Feature: multimodal-content-viewer, Property 1: Input Validation Consistency
// Feature: multimodal-content-viewer, Property 3: UI State Management
// Property-based tests for QueryInterface component

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fc from 'fast-check';
import QueryInterface from '../QueryInterface';

// Mock the validation module
jest.mock('../../utils/validation', () => ({
  validateQueryInput: jest.fn((input: string) => {
    if (!input || input.trim().length === 0) {
      return { isValid: false, error: 'Query cannot be empty' };
    }
    if (input.length > 2000) {
      return { isValid: false, error: `Query cannot exceed 2000 characters (current: ${input.length})` };
    }
    return { isValid: true };
  }),
  getCharacterCountStatus: jest.fn((length: number) => {
    if (length > 2000) {
      return { status: 'error', message: `${length}/2000 - Exceeds limit` };
    } else if (length > 1800) {
      return { status: 'warning', message: `${length}/2000 - Approaching limit` };
    } else {
      return { status: 'normal', message: `${length}/2000` };
    }
  })
}));

describe('QueryInterface Properties', () => {
  const mockOnSubmit = jest.fn();
  const mockOnClear = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Property 1: Input Validation Consistency
  describe('Property 1: Input Validation Consistency', () => {
    test('inputs under 2000 characters should be accepted', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 1999 }).filter(s => s.trim().length > 0),
          async (input) => {
            render(
              <QueryInterface 
                onSubmit={mockOnSubmit} 
                loading={false}
                onClear={mockOnClear}
              />
            );

            const textarea = screen.getByRole('textbox');
            const submitButton = screen.getByRole('button', { name: /submit query/i });

            await userEvent.type(textarea, input);
            await userEvent.click(submitButton);

            expect(mockOnSubmit).toHaveBeenCalledWith(input.trim());
          }
        ),
        { numRuns: 20 } // Reduced for UI tests
      );
    });

    test('inputs over 2000 characters should be rejected', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 2001, maxLength: 2500 }),
          async (input) => {
            render(
              <QueryInterface 
                onSubmit={mockOnSubmit} 
                loading={false}
                onClear={mockOnClear}
              />
            );

            const textarea = screen.getByRole('textbox');
            const submitButton = screen.getByRole('button', { name: /submit query/i });

            await userEvent.type(textarea, input);
            await userEvent.click(submitButton);

            // Should show validation error and not call onSubmit
            expect(screen.getByText(/cannot exceed 2000 characters/i)).toBeInTheDocument();
            expect(mockOnSubmit).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 10 } // Reduced for UI tests
      );
    });
  });

  // Property 3: UI State Management
  describe('Property 3: UI State Management', () => {
    test('loading indicator should be displayed during processing', () => {
      render(
        <QueryInterface 
          onSubmit={mockOnSubmit} 
          loading={true}
          onClear={mockOnClear}
        />
      );

      expect(screen.getByText(/processing/i)).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeDisabled();
      expect(screen.getByRole('button', { name: /processing query/i })).toBeDisabled();
    });

    test('input field should be cleared after successful submission', async () => {
      const { rerender } = render(
        <QueryInterface 
          onSubmit={mockOnSubmit} 
          loading={false}
          onClear={mockOnClear}
        />
      );

      const textarea = screen.getByRole('textbox');
      const submitButton = screen.getByRole('button', { name: /submit query/i });

      // Type input and submit
      await userEvent.type(textarea, 'test query');
      await userEvent.click(submitButton);

      // Simulate successful submission by re-rendering with loading=false
      rerender(
        <QueryInterface 
          onSubmit={mockOnSubmit} 
          loading={false}
          onClear={mockOnClear}
        />
      );

      // Input should be cleared (this happens in the component after successful submission)
      expect(textarea).toHaveValue('');
    });

    test('keyboard shortcuts should work correctly', async () => {
      render(
        <QueryInterface 
          onSubmit={mockOnSubmit} 
          loading={false}
          onClear={mockOnClear}
        />
      );

      const textarea = screen.getByRole('textbox');

      // Test Ctrl+Enter submission
      await userEvent.type(textarea, 'test query');
      await userEvent.keyboard('{Control>}{Enter}{/Control}');

      expect(mockOnSubmit).toHaveBeenCalledWith('test query');

      // Test Escape to clear
      await userEvent.type(textarea, 'another query');
      await userEvent.keyboard('{Escape}');

      expect(mockOnClear).toHaveBeenCalled();
    });

    test('character count should update in real-time', async () => {
      render(
        <QueryInterface 
          onSubmit={mockOnSubmit} 
          loading={false}
          onClear={mockOnClear}
        />
      );

      const textarea = screen.getByRole('textbox');
      
      await userEvent.type(textarea, 'Hello');
      
      // Character count should be visible
      expect(screen.getByText(/5\/2000/)).toBeInTheDocument();
    });

    test('clear button should appear when input has content', async () => {
      render(
        <QueryInterface 
          onSubmit={mockOnSubmit} 
          loading={false}
          onClear={mockOnClear}
        />
      );

      const textarea = screen.getByRole('textbox');

      // Initially no clear button
      expect(screen.queryByRole('button', { name: /clear input/i })).not.toBeInTheDocument();

      // Type something
      await userEvent.type(textarea, 'test');

      // Clear button should appear
      expect(screen.getByRole('button', { name: /clear input/i })).toBeInTheDocument();

      // Click clear button
      await userEvent.click(screen.getByRole('button', { name: /clear input/i }));

      expect(mockOnClear).toHaveBeenCalled();
    });
  });

  describe('Accessibility Properties', () => {
    test('component should be accessible', () => {
      render(
        <QueryInterface 
          onSubmit={mockOnSubmit} 
          loading={false}
          onClear={mockOnClear}
        />
      );

      const textarea = screen.getByRole('textbox');
      const submitButton = screen.getByRole('button', { name: /submit query/i });

      // Check ARIA attributes
      expect(textarea).toHaveAttribute('aria-label');
      expect(textarea).toHaveAttribute('aria-describedby');
      expect(submitButton).toHaveAttribute('aria-label');

      // Check keyboard navigation
      expect(textarea).toHaveAttribute('tabIndex');
    });

    test('validation errors should be announced to screen readers', async () => {
      render(
        <QueryInterface 
          onSubmit={mockOnSubmit} 
          loading={false}
          onClear={mockOnClear}
        />
      );

      const textarea = screen.getByRole('textbox');
      const submitButton = screen.getByRole('button', { name: /submit query/i });

      // Submit empty form to trigger validation
      await userEvent.click(submitButton);

      const errorElement = screen.getByRole('alert');
      expect(errorElement).toHaveAttribute('aria-live', 'assertive');
    });
  });
});