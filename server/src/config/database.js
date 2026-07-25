import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '.env') });

let isConnected = false;

const tryConnect = async (uri) => {
  return mongoose.connect(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
};

const connectDB = async () => {
  if (isConnected) return;

  const uri = process.env.MONGODB_URI;

  // Supabase-backed deployments can run without MongoDB. Skip gracefully when
  // no URI is provided instead of falling back to an in-memory server.
  if (!uri) {
    console.log('MONGODB_URI not set — skipping MongoDB (Supabase-only mode).');
    return null;
  }

  try {
    const conn = await tryConnect(uri);
    isConnected = true;
    console.log(`MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
    console.log('Falling back to in-memory MongoDB...');
  }

  const { MongoMemoryServer } = await import('mongodb-memory-server');
  const mongod = await MongoMemoryServer.create();
  const conn = await tryConnect(mongod.getUri());
  isConnected = true;
  console.log(`MongoDB connected (in-memory): ${conn.connection.host}`);
  return conn;
};

mongoose.connection.on('disconnected', () => {
  isConnected = false;
});

export default connectDB;
