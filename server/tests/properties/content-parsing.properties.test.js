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
const ContentProcessorService_1 = require("../../src/services/ContentProcessorService");
const ErrorHandlerService_1 = require("../../src/services/ErrorHandlerService");
describe('Property 7: Content Parsing Completeness', () => {
    let contentProcessor;
    let errorHandler;
    beforeEach(() => {
        errorHandler = new ErrorHandlerService_1.ErrorHandlerService();
        contentProcessor = new ContentProcessorService_1.ContentProcessorService(errorHandler);
    });
    afterEach(() => {
        contentProcessor.clearCache();
    });
    test('should identify text content correctly', () => {
        fc.assert(fc.property(fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 10 }), async (textLines) => {
            const input = textLines.join('\n');
            const result = await contentProcessor.parseMultimodalResponse(input);
            expect(result.text.length).toBeGreaterThan(0);
            expect(result.metadata.totalElements).toBeGreaterThan(0);
            expect(result.metadata.confidence).toBeGreaterThan(0);
            const parsedText = result.text.map(t => t.content).join('\n');
            textLines.forEach(line => {
                if (line.trim()) {
                    expect(parsedText).toContain(line);
                }
            });
        }), { numRuns: 50 });
    });
    test('should identify image references correctly', () => {
        fc.assert(fc.property(fc.array(fc.oneof(fc.constant('image: https://example.com/image.jpg'), fc.constant('![Alt text](https://example.com/photo.png)'), fc.constant('https://example.com/picture.gif'), fc.string({ minLength: 1, maxLength: 50 })), { minLength: 1, maxLength: 5 }), async (lines) => {
            const input = lines.join('\n');
            const result = await contentProcessor.parseMultimodalResponse(input);
            const expectedImages = lines.filter(line => line.includes('image:') ||
                line.includes('![') ||
                /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg)/i.test(line)).length;
            expect(result.images.length).toBe(expectedImages);
            result.images.forEach(image => {
                expect(image.url).toBeDefined();
                expect(image.alt).toBeDefined();
                expect(typeof image.position).toBe('number');
            });
        }), { numRuns: 50 });
    });
    test('should handle parsing failures gracefully', () => {
        fc.assert(fc.property(fc.oneof(fc.constant(null), fc.constant(undefined), fc.constant(''), fc.string({ minLength: 1, maxLength: 1000 })), async (input) => {
            const result = await contentProcessor.parseMultimodalResponse(input || '');
            expect(result).toBeDefined();
            expect(result.metadata).toBeDefined();
            expect(result.metadata.totalElements).toBeGreaterThanOrEqual(0);
            expect(result.metadata.processingTime).toBeGreaterThanOrEqual(0);
            expect(result.text).toBeDefined();
            expect(result.images).toBeDefined();
            expect(result.videos).toBeDefined();
            expect(result.documents).toBeDefined();
            if (!input || input.trim().length === 0) {
                expect(result.text.length).toBeGreaterThanOrEqual(0);
            }
        }), { numRuns: 100 });
    });
    test('should maintain content positioning correctly', () => {
        fc.assert(fc.property(fc.array(fc.oneof(fc.string({ minLength: 1, maxLength: 50 }), fc.constant('image: https://example.com/test.jpg'), fc.constant('video: https://example.com/test.mp4')), { minLength: 2, maxLength: 10 }), async (lines) => {
            const input = lines.join('\n');
            const result = await contentProcessor.parseMultimodalResponse(input);
            const allContent = [
                ...result.text.map(t => ({ type: 'text', position: t.position })),
                ...result.images.map(i => ({ type: 'image', position: i.position })),
                ...result.videos.map(v => ({ type: 'video', position: v.position })),
                ...result.documents.map(d => ({ type: 'document', position: d.position }))
            ];
            allContent.sort((a, b) => a.position - b.position);
            allContent.forEach((content, index) => {
                expect(content.position).toBe(index);
            });
        }), { numRuns: 50 });
    });
    test('should handle mixed content types correctly', () => {
        const mixedContent = [
            'This is some text content.',
            'image: https://example.com/image.jpg',
            'More text here.',
            'video: https://example.com/video.mp4',
            'document: https://example.com/doc.pdf',
            'Final text content.'
        ].join('\n');
        return contentProcessor.parseMultimodalResponse(mixedContent).then(result => {
            expect(result.text.length).toBe(3);
            expect(result.images.length).toBe(1);
            expect(result.videos.length).toBe(1);
            expect(result.documents.length).toBe(1);
            expect(result.metadata.totalElements).toBe(6);
            expect(result.text[0]?.position).toBe(0);
            expect(result.images[0]?.position).toBe(1);
            expect(result.text[1]?.position).toBe(2);
            expect(result.videos[0]?.position).toBe(3);
            expect(result.documents[0]?.position).toBe(4);
            expect(result.text[2]?.position).toBe(5);
        });
    });
});
//# sourceMappingURL=content-parsing.properties.test.js.map