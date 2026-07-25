import mongoose from 'mongoose';

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

  let uri = process.env.MONGODB_URI;

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
