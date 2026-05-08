/**
 * Main Entry Point
 * Rentman API Client with REST endpoints
 */

import { RentmanServer } from './server/app';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
const dotenvPathFromEnv = process.env.DOTENV_CONFIG_PATH;
const nodeEnv = process.env.NODE_ENV || 'development';

const candidateEnvFiles = [
  dotenvPathFromEnv,
  path.join(process.cwd(), `.env.${nodeEnv}`),
  path.join(process.cwd(), '.env.development'),
  path.join(process.cwd(), '.env'),
].filter(Boolean) as string[];

const envFileToLoad = candidateEnvFiles.find((p) => fs.existsSync(p));
dotenv.config(envFileToLoad ? { path: envFileToLoad } : undefined);

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
