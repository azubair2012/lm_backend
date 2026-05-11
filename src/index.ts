/**
 * Main Entry Point
 * Rentman API Client with REST endpoints
 */

import './loadEnv';
import { config } from './config';
import { RentmanServer } from './server/app';

// Validate required environment variables
const requiredEnvVars = ['RENTMAN_TOKEN'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingEnvVars.forEach(envVar => {
    console.error(`   - ${envVar}`);
  });
  console.error('\nPlease check your .env file and ensure all required variables are set.');
  process.exit(1);
}

// Start the server
async function startServer() {
  try {
    console.log('🚀 Starting Rentman API Client Server...');
    console.log('RENTMAN_BASE_URL:', process.env.RENTMAN_BASE_URL);
    console.log('Redis enabled:', config.redis.enabled, '| host:', config.redis.host, '| port:', config.redis.port);
    
    const server = new RentmanServer();
    await server.start();
    
    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down server...');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.log('\n🛑 Shutting down server...');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
if (require.main === module) {
  startServer();
}

export { RentmanServer } from './server/app';
export { RentmanApiClient } from './client/RentmanApiClient';
export * from './types';
