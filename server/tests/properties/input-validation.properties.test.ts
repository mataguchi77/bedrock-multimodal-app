// Feature: multimodal-content-viewer, Property 1: Input Validation Consistency
// For any text input to the query interface, inputs under 2000 characters should be accepted and inputs over 2000 characters should be rejected consistently

import * as fc from 'fast-check';
import { validateQueryInput } from '../../src/utils/validation';

describe('Property 1: Input Validation Consistency', () => {
  test('inputs under 2000 characters should be accepted', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 1999 }).filter(s => s.trim().length > 0),
        (input) => {
          const result = validateQueryInput(input);
          expect(result.isValid).toBe(true);
          expect(result.error).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  test('inputs over 2000 characters should be rejected', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 2001, maxLength: 5000 }),
        (input) => {
          const result = validateQueryInput(input);
          expect(result.isValid).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.error).toContain('2000');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('empty strings should be rejected', () => {
    const result = validateQueryInput('');
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('whitespace-only strings should be rejected', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => s.trim().length === 0 && s.length > 0),
        (input) => {
          const result = validateQueryInput(input);
          expect(result.isValid).toBe(false);
          expect(result.error).toBeDefined();
        }
      ),
      { numRuns: 50 }
    );
  });

  test('exactly 2000 characters should be accepted', () => {
    const input = 'a'.repeat(2000);
    const result = validateQueryInput(input);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});