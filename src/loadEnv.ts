/**
 * Load env before any module that reads process.env (e.g. config).
 * - `.env` first (shared secrets, e.g. Cloudinary)
 * - `.env.${NODE_ENV}` second with override (e.g. `.env.development` for PORT)
 *
 * Previously `.env.${NODE_ENV}` was loaded alone when present, so `.env` was skipped
 * and optional keys (Cloudinary only in `.env`) never applied.
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const nodeEnv = process.env.NODE_ENV || 'development';

const dotenvPathFromEnv = process.env.DOTENV_CONFIG_PATH;
if (dotenvPathFromEnv && fs.existsSync(dotenvPathFromEnv)) {
  dotenv.config({ path: dotenvPathFromEnv });
}

const envPath = path.join(root, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const envSpecificPath = path.join(root, `.env.${nodeEnv}`);
if (fs.existsSync(envSpecificPath)) {
  dotenv.config({ path: envSpecificPath, override: true });
}
