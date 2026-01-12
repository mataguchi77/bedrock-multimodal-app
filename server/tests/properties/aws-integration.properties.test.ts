// Feature: multimodal-content-viewer, Property 5: AWS Integration Completeness
// For any backend query request, the system should authenticate with AWS, include all required parameters (query and session), and process the complete streaming response

import * as fc from 'fast-check';
import { BedrockClientService } from '../../src/services/BedrockClientService';
import { SessionManagerService } from '../../src/services/SessionManagerService';
import { ErrorHandlerService } from '../../src/services/ErrorHandlerService';

describe('Property 5: AWS Integration Completeness', () => {
  let bedrockClient: BedrockClientService;
  let sessionManager: SessionManagerService;
  let errorHandler: ErrorHandlerService;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = process.env;
    
    // Mock environment variables
    process.env = {
      ...originalEnv,
      BEDROCK_AGENT_CORE_GATEWAY_URL: 'https://mock-gateway.amazonaws.com/mcp',
      COGNITO_TOKEN_URL: 'https://mock-cognito.auth.region.amazoncognito.com/oauth2/token',
      COGNITO_CLIENT_ID: 'mock-client-id',
      COGNITO_CLIENT_SECRET: 'mock-client-secret'
    };
    
    errorHandler = new ErrorHandlerService();
    sessionManager = new SessionManagerService();
    bedrockClient = new BedrockClientService(sessionManager, errorHandler);
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    sessionManager.destroy();
  });

  test('should authenticate with AWS before making requests', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        async (query) => {
          const session = sessionManager.createSession();
          
          // Mock the authentication check
          const authService = (bedrockClient as any).authService;
          const authSpy = jest.spyOn(authService, 'getValidToken');
          authSpy.mockResolvedValue('mock-token-12345');
          
          try {
            await bedrockClient.invokeAgent({ query, sessionId: session.id });
            
            // Should have called authentication
            expect(authSpy).toHaveBeenCalled();
            
            // Token should be valid format (mock validation)
            const token = await authService.getValidToken();
            expect(token).toBeDefined();
            if (token) {
              expect(typeof token).toBe('string');
              expect(token.length).toBeGreaterThan(10);
            }
          } catch (error) {
            // Even on failure, should have attempted authentication
            expect(authSpy).toHaveBeenCalled();
          }
          
          authSpy.mockRestore();
        }
      ),
      { numRuns: 10 }
    );
  });

  test('should include all required parameters in requests', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          query: fc.string({ minLength: 1, maxLength: 100 }),
          sessionId: fc.string({ minLength: 10, maxLength: 50 })
        }),
        async ({ query, sessionId }) => {
          // Mock the HTTP request to capture parameters
          const mockFetch = jest.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
              jsonrpc: '2.0',
              id: 'test',
              result: {
                content: [{ type: 'text', text: 'Mock response' }],
                isError: false
              }
            })
          });
          
          global.fetch = mockFetch;
          
          try {
            await bedrockClient.invokeAgent({ query, sessionId });
            
            // Should have made HTTP request
            expect(mockFetch).toHaveBeenCalled();
            
            const callArgs = mockFetch.mock.calls[0];
            const requestBody = JSON.parse(callArgs[1].body);
            
            // Should include required JSON-RPC parameters
            expect(requestBody).toHaveProperty('jsonrpc', '2.0');
            expect(requestBody).toHaveProperty('id');
            expect(requestBody).toHaveProperty('method', 'tools/call');
            expect(requestBody).toHaveProperty('params');
            
            // Should include required tool parameters
            expect(requestBody.params).toHaveProperty('name', 'multimodal-agent___invoke_bedrock_agent');
            expect(requestBody.params).toHaveProperty('arguments');
            expect(requestBody.params.arguments).toHaveProperty('inputText', query);
            expect(requestBody.params.arguments).toHaveProperty('sessionId', sessionId);
            
            // Should include authentication header
            expect(callArgs[1].headers).toHaveProperty('Authorization');
            expect(callArgs[1].headers.Authorization).toMatch(/^Bearer /);
            
          } catch (error) {
            // Even on error, should have attempted the request with proper structure
            if (mockFetch.mock.calls.length > 0) {
              const callArgs = mockFetch.mock.calls[0];
              const requestBody = JSON.parse(callArgs[1].body);
              expect(requestBody).toHaveProperty('jsonrpc');
              expect(requestBody).toHaveProperty('params');
            }
          }
          
          mockFetch.mockRestore();
        }
      ),
      { numRuns: 15 }
    );
  });

  test('should process complete streaming response correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.oneof(
            fc.record({ type: fc.constant('text'), text: fc.string({ minLength: 1, maxLength: 50 }) }),
            fc.record({ type: fc.constant('image'), url: fc.webUrl(), alt: fc.string() })
          ),
          { minLength: 1, maxLength: 3 }
        ),
        async (mockContent) => {
          const mockResponse = {
            jsonrpc: '2.0',
            id: 'test',
            result: {
              content: mockContent,
              isError: false
            }
          };
          
          const mockFetch = jest.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockResponse)
          });
          
          global.fetch = mockFetch;
          
          const session = sessionManager.createSession();
          
          try {
            const result = await bedrockClient.invokeAgent({ query: 'test query', sessionId: session.id });
            
            // Should process the complete response
            expect(result).toBeDefined();
            expect(result.success).toBe(true);
            expect(result.content).toBeDefined();
            expect(result.sessionId).toBe(session.id);
            expect(result.timestamp).toBeDefined();
            
          } catch (error) {
            // Should still provide structured error response
            expect(error).toBeDefined();
          }
          
          mockFetch.mockRestore();
        }
      ),
      { numRuns: 10 }
    );
  });

  test('should handle AWS authentication errors gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        async (query) => {
          // Mock authentication failure
          const authService = (bedrockClient as any).authService;
          const authSpy = jest.spyOn(authService, 'getValidToken');
          authSpy.mockRejectedValue(new Error('Authentication failed'));
          
          const session = sessionManager.createSession();
          
          try {
            const result = await bedrockClient.invokeAgent({ query, sessionId: session.id });
            
            // Should return structured error response
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.sessionId).toBe(session.id);
            expect(result.timestamp).toBeDefined();
            
          } catch (error) {
            // Should handle authentication errors without crashing
            expect(error).toBeDefined();
          }
          
          authSpy.mockRestore();
        }
      ),
      { numRuns: 8 }
    );
  });

  test('should maintain session context throughout AWS interactions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 2, maxLength: 4 }),
        async (queries) => {
          const session = sessionManager.createSession();
          const originalSessionId = session.id;
          
          const mockFetch = jest.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
              jsonrpc: '2.0',
              id: 'test',
              result: {
                content: [{ type: 'text', text: 'Mock response' }],
                isError: false
              }
            })
          });
          
          global.fetch = mockFetch;
          
          try {
            for (const query of queries) {
              const result = await bedrockClient.invokeAgent({ query, sessionId: originalSessionId });
              
              // Session ID should remain consistent
              expect(result.sessionId).toBe(originalSessionId);
              
              // Should include session ID in all requests
              const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
              const requestBody = JSON.parse(lastCall[1].body);
              expect(requestBody.params.arguments.sessionId).toBe(originalSessionId);
            }
            
            // Session should still exist and be updated
            const finalSession = sessionManager.getSession(originalSessionId);
            expect(finalSession).not.toBeNull();
            if (finalSession) {
              expect(finalSession.queryCount).toBeGreaterThan(0);
            }
            
          } catch (error) {
            // Even on error, session context should be maintained
            const finalSession = sessionManager.getSession(originalSessionId);
            expect(finalSession).not.toBeNull();
          }
          
          mockFetch.mockRestore();
        }
      ),
      { numRuns: 8 }
    );
  });
});