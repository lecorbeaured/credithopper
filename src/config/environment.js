// ===========================================
// CREDITHOPPER - ENVIRONMENT CONFIGURATION
// ===========================================
// Controls environment-specific behavior with strict mock data safeguards

const ENVIRONMENTS = {
  PRODUCTION: 'production',
  STAGING: 'staging',
  DEVELOPMENT: 'development',
  TEST: 'test',
};

class EnvironmentConfig {
  constructor() {
    this.env = process.env.NODE_ENV || ENVIRONMENTS.DEVELOPMENT;
    this.isProduction = this.env === ENVIRONMENTS.PRODUCTION;
    this.isStaging = this.env === ENVIRONMENTS.STAGING;
    this.isDevelopment = this.env === ENVIRONMENTS.DEVELOPMENT;
    this.isTest = this.env === ENVIRONMENTS.TEST;
    
    // CRITICAL: Mock data controls
    this.mockDataAllowed = this.isDevelopment || this.isTest;
    this.requireExplicitMockFlag = true;
  }

  /**
   * Check if mock data can be returned
   * NEVER returns true in production, even if somehow called
   */
  canUseMockData(explicitRequest = false) {
    // Production: NEVER allow mock data, regardless of any flag
    if (this.isProduction) {
      return false;
    }
    
    // Staging: NEVER allow mock data (should behave like production)
    if (this.isStaging) {
      return false;
    }
    
    // Development/Test: Only if explicitly requested
    if (this.mockDataAllowed && this.requireExplicitMockFlag) {
      return explicitRequest === true;
    }
    
    return false;
  }

  /**
   * Get environment info for logging
   */
  getInfo() {
    return {
      environment: this.env,
      isProduction: this.isProduction,
      mockDataAllowed: this.mockDataAllowed,
    };
  }
}

const envConfig = new EnvironmentConfig();

module.exports = { envConfig, ENVIRONMENTS };
