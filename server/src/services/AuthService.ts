// Feature: multimodal-content-viewer
// Authentication Service for automatic token management

export class AuthService {
  private currentToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private refreshing = false;

  constructor() {
    this.currentToken = process.env.OAUTH_TOKEN !== 'your_oauth_token_here' ? process.env.OAUTH_TOKEN || null : null;
  }

  async getValidToken(): Promise<string | null> {
    // If we have a token and it's not expired, return it
    if (this.currentToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.currentToken;
    }

    // If we're already refreshing, wait for it
    if (this.refreshing) {
      await this.waitForRefresh();
      return this.currentToken;
    }

    // Refresh the token
    return await this.refreshToken();
  }

  private async refreshToken(): Promise<string | null> {
    if (!process.env.COGNITO_TOKEN_URL || !process.env.COGNITO_CLIENT_ID || !process.env.COGNITO_CLIENT_SECRET) {
      console.warn('Cognito configuration missing, skipping token refresh');
      return null;
    }

    this.refreshing = true;

    try {
      const response = await fetch(process.env.COGNITO_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: process.env.COGNITO_CLIENT_ID,
          client_secret: process.env.COGNITO_CLIENT_SECRET,
        }),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;
      
      this.currentToken = data.access_token;
      // Set expiry to 90% of actual expiry for safety margin
      const expiresInMs = (data.expires_in || 3600) * 1000 * 0.9;
      this.tokenExpiry = new Date(Date.now() + expiresInMs);

      console.log(`Token refreshed successfully, expires at: ${this.tokenExpiry.toISOString()}`);
      
      return this.currentToken;

    } catch (error) {
      console.error('Failed to refresh token:', error);
      this.currentToken = null;
      this.tokenExpiry = null;
      return null;
    } finally {
      this.refreshing = false;
    }
  }

  private async waitForRefresh(): Promise<void> {
    while (this.refreshing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Get token info for debugging
  getTokenInfo() {
    return {
      hasToken: !!this.currentToken,
      expiry: this.tokenExpiry?.toISOString(),
      isExpired: this.tokenExpiry ? this.tokenExpiry <= new Date() : true,
    };
  }
}