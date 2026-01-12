// Feature: multimodal-content-viewer
// End-to-end system validation tests for Task V1

import request from 'supertest';
import { app } from '../../src/server';

describe('System Validation - End-to-End Tests', () => {
  describe('User Story 1: Query Submission and Processing', () => {
    it('should accept valid queries and return structured responses', async () => {
      const response = await request(app)
        .post('/api/invoke-agent')
        .send({
          query: 'Tell me about multimodal content',
          sessionId: 'e2e-test-session'
        })
        .timeout(10000);

      // Should return structured response
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('sessionId');
      expect(response.body).toHaveProperty('timestamp');
      
      if (response.body.success) {
        expect(response.body).toHaveProperty('content');
        expect(response.body).toHaveProperty('processingTime');
      } else {
        expect(response.body).toHaveProperty('error');
        expect(typeof response.body.error).toBe('string');
      }
    });

    it('should reject invalid queries with appropriate error messages', async () => {
      const response = await request(app)
        .post('/api/invoke-agent')
        .send({
          query: '', // Empty query
          sessionId: 'e2e-test-session'
        });

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(typeof response.body.error).toBe('string');
      expect(response.body.error.length).toBeGreaterThan(0);
    });

    it('should handle queries over character limit', async () => {
      const longQuery = 'a'.repeat(2001);
      
      const response = await request(app)
        .post('/api/invoke-agent')
        .send({
          query: longQuery,
          sessionId: 'e2e-test-session'
        });

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('2000');
    });
  });

  describe('User Story 2: Session Management', () => {
    it('should create and manage sessions properly', async () => {
      // Create new session
      const sessionResponse = await request(app)
        .post('/api/session/new');

      expect(sessionResponse.body).toHaveProperty('sessionId');
      expect(sessionResponse.body).toHaveProperty('createdAt');
      
      const sessionId = sessionResponse.body.sessionId;

      // Use session for query
      const queryResponse = await request(app)
        .post('/api/invoke-agent')
        .send({
          query: 'Test session query',
          sessionId: sessionId
        });

      expect(queryResponse.body.sessionId).toBe(sessionId);
    });

    it('should handle invalid session IDs gracefully', async () => {
      const response = await request(app)
        .post('/api/invoke-agent')
        .send({
          query: 'Test query',
          sessionId: 'invalid-session-id'
        });

      // Should either create new session or handle gracefully
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('sessionId');
    });
  });

  describe('User Story 3: Error Handling and Recovery', () => {
    it('should handle malformed requests gracefully', async () => {
      const response = await request(app)
        .post('/api/invoke-agent')
        .send({
          // Missing required fields
        });

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should provide consistent error response structure', async () => {
      const response = await request(app)
        .post('/api/invoke-agent')
        .send({
          query: null, // Invalid query type
          sessionId: 'test-session'
        });

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('timestamp');
      expect(typeof response.body.error).toBe('string');
    });
  });

  describe('User Story 4: Performance Requirements', () => {
    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/invoke-agent')
        .send({
          query: 'Performance test query',
          sessionId: 'perf-test-session'
        })
        .timeout(5000);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Should respond within 3 seconds for user feedback
      expect(responseTime).toBeLessThan(3000);
      
      // Response should be structured
      expect(response.body).toHaveProperty('success');
    });

    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 5;
      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        request(app)
          .post('/api/invoke-agent')
          .send({
            query: `Concurrent test query ${i}`,
            sessionId: `concurrent-session-${i}`
          })
          .timeout(10000)
      );

      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should complete within reasonable time
      expect(totalTime).toBeLessThan(15000); // 15 seconds for 5 concurrent requests

      // All responses should be valid
      responses.forEach(response => {
        expect(response.body).toHaveProperty('success');
        expect(response.body).toHaveProperty('sessionId');
      });
    });
  });

  describe('User Story 5: Content Processing and Display', () => {
    it('should process multimodal content correctly', async () => {
      const response = await request(app)
        .post('/api/invoke-agent')
        .send({
          query: 'Show me content with images and text',
          sessionId: 'content-test-session'
        })
        .timeout(10000);

      if (response.body.success && response.body.content) {
        const content = response.body.content;
        
        // Should have multimodal content structure
        expect(content).toHaveProperty('text');
        expect(content).toHaveProperty('images');
        expect(content).toHaveProperty('videos');
        expect(content).toHaveProperty('documents');
        expect(content).toHaveProperty('metadata');

        // Arrays should be defined
        expect(Array.isArray(content.text)).toBe(true);
        expect(Array.isArray(content.images)).toBe(true);
        expect(Array.isArray(content.videos)).toBe(true);
        expect(Array.isArray(content.documents)).toBe(true);

        // Metadata should have required fields
        expect(content.metadata).toHaveProperty('totalElements');
        expect(content.metadata).toHaveProperty('processingTime');
        expect(content.metadata).toHaveProperty('source');
      }
    });
  });

  describe('User Story 6: System Health and Monitoring', () => {
    it('should provide health check endpoint', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('services');
    });

    it('should provide token information for debugging', async () => {
      const response = await request(app)
        .get('/api/token-info');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('hasToken');
      expect(response.body).toHaveProperty('tokenStatus');
    });
  });

  describe('User Story 7: System Integration', () => {
    it('should maintain system stability under various conditions', async () => {
      const testScenarios = [
        { query: 'Simple text query', sessionId: 'stability-test-1' },
        { query: 'Query with special characters: !@#$%^&*()', sessionId: 'stability-test-2' },
        { query: 'Very long query: ' + 'word '.repeat(100), sessionId: 'stability-test-3' },
        { query: '123456789', sessionId: 'stability-test-4' },
        { query: 'Mixed content query with URLs https://example.com', sessionId: 'stability-test-5' }
      ];

      for (const scenario of testScenarios) {
        const response = await request(app)
          .post('/api/invoke-agent')
          .send(scenario)
          .timeout(5000);

        // System should remain stable and provide structured responses
        expect(response.body).toHaveProperty('success');
        expect(response.body).toHaveProperty('sessionId');
        expect(response.body).toHaveProperty('timestamp');

        if (!response.body.success) {
          expect(response.body).toHaveProperty('error');
          expect(typeof response.body.error).toBe('string');
        }
      }
    });
  });
});

describe('Performance Validation', () => {
  it('should meet performance requirements under normal load', async () => {
    const testQueries = Array.from({ length: 10 }, (_, i) => ({
      query: `Performance validation query ${i}`,
      sessionId: `perf-validation-${i}`
    }));

    const results = [];
    
    for (const testQuery of testQueries) {
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/invoke-agent')
        .send(testQuery)
        .timeout(5000);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      results.push({
        responseTime,
        success: response.body.success,
        hasContent: !!response.body.content
      });
    }

    // Calculate performance metrics
    const responseTimes = results.map(r => r.responseTime);
    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    const successRate = results.filter(r => r.success).length / results.length;

    // Validate performance requirements
    expect(averageResponseTime).toBeLessThan(2000); // Average under 2 seconds
    expect(maxResponseTime).toBeLessThan(5000); // Max under 5 seconds
    expect(successRate).toBeGreaterThan(0.8); // At least 80% success rate

    console.log('Performance Metrics:', {
      averageResponseTime: Math.round(averageResponseTime),
      maxResponseTime,
      successRate: Math.round(successRate * 100) + '%',
      totalRequests: results.length
    });
  });
});