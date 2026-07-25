import { MongoMemoryServer } from 'mongodb-memory-server';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function start() {
  console.log('Starting in-memory MongoDB...');
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  process.env.MONGODB_URI = uri;
  console.log(`MongoDB URI: ${uri}`);

  const server = spawn('node', ['src/server.js'], {
    cwd: __dirname,
    stdio: 'inherit',
    env: { ...process.env, MONGODB_URI: uri },
  });

  server.on('close', async (code) => {
    console.log(`Server exited with code ${code}`);
    await mongod.stop();
    process.exit(code);
  });

  process.on('SIGINT', async () => {
    await mongod.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await mongod.stop();
    process.exit(0);
  });
}

start().catch(console.error);
