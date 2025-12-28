"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fc = __importStar(require("fast-check"));
const validation_1 = require("../../src/utils/validation");
describe('Property 1: Input Validation Consistency', () => {
    test('inputs under 2000 characters should be accepted', () => {
        fc.assert(fc.property(fc.string({ minLength: 1, maxLength: 1999 }), (input) => {
            const result = (0, validation_1.validateQueryInput)(input);
            expect(result.isValid).toBe(true);
            expect(result.error).toBeUndefined();
        }), { numRuns: 100 });
    });
    test('inputs over 2000 characters should be rejected', () => {
        fc.assert(fc.property(fc.string({ minLength: 2001, maxLength: 5000 }), (input) => {
            const result = (0, validation_1.validateQueryInput)(input);
            expect(result.isValid).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('2000');
        }), { numRuns: 100 });
    });
    test('empty strings should be rejected', () => {
        const result = (0, validation_1.validateQueryInput)('');
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
    });
    test('whitespace-only strings should be rejected', () => {
        fc.assert(fc.property(fc.string().filter(s => s.trim().length === 0 && s.length > 0), (input) => {
            const result = (0, validation_1.validateQueryInput)(input);
            expect(result.isValid).toBe(false);
            expect(result.error).toBeDefined();
        }), { numRuns: 50 });
    });
    test('exactly 2000 characters should be accepted', () => {
        const input = 'a'.repeat(2000);
        const result = (0, validation_1.validateQueryInput)(input);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
    });
});
//# sourceMappingURL=input-validation.properties.test.js.map