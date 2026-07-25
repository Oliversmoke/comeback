import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { generateTokens, generateResetToken } from '../src/middleware/auth.js';
import User from '../src/models/User.js';

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.JWT_SECRET = 'test-secret-key';
  process.env.JWT_EXPIRES_IN = '7d';
  process.env.NODE_ENV = 'test';

  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod?.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
});

describe('User Model', () => {
  const validUser = {
    email: 'test@example.com',
    username: 'testuser',
    password: 'Test1234!',
    displayName: 'Test User',
  };

  test('creates and hashes password', async () => {
    const user = await User.create(validUser);
    expect(user.password).toBeDefined();
    expect(user.password).not.toBe('Test1234!');

    const fetched = await User.findById(user._id).select('+password');
    expect(fetched.password).toBeDefined();
    expect(fetched.password).not.toBe('Test1234!');
  });

  test('rejects duplicate email', async () => {
    await User.create(validUser);
    await expect(
      User.create({ email: 'test@example.com', username: 'other', password: 'Test1234!' })
    ).rejects.toThrow();
  });

  test('rejects duplicate username', async () => {
    await User.create(validUser);
    await expect(
      User.create({ email: 'other@example.com', username: 'testuser', password: 'Test1234!' })
    ).rejects.toThrow();
  });

  test('toPublicJSON excludes sensitive fields', async () => {
    const user = await User.create(validUser);
    const json = user.toPublicJSON();
    expect(json.password).toBeUndefined();
    expect(json.refreshToken).toBeUndefined();
    expect(json.email).toBe('test@example.com');
    expect(json.id).toBeDefined();
  });

  test('comparePassword works correctly', async () => {
    const user = await User.create(validUser);
    const fetched = await User.findById(user._id).select('+password');
    const isMatch = await fetched.comparePassword('Test1234!');
    expect(isMatch).toBe(true);

    const isNotMatch = await fetched.comparePassword('WrongPassword1');
    expect(isNotMatch).toBe(false);
  });
});

describe('Auth Middleware', () => {
  test('generateTokens returns access and refresh tokens', () => {
    const tokens = generateTokens({ id: '123', email: 'test@test.com', role: 'user' });
    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();

    const decoded = jwt.verify(tokens.accessToken, process.env.JWT_SECRET);
    expect(decoded.id).toBe('123');
    expect(decoded.email).toBe('test@test.com');
  });

  test('refresh token has type field', () => {
    const tokens = generateTokens({ id: '123', email: 'test@test.com', role: 'user' });
    const decoded = jwt.verify(tokens.refreshToken, process.env.JWT_SECRET);
    expect(decoded.type).toBe('refresh');
    expect(decoded.id).toBe('123');
  });

  test('generateResetToken creates 1-hour token', () => {
    const token = generateResetToken('user123');
    expect(token).toBeDefined();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded.id).toBe('user123');
    expect(decoded.type).toBe('reset');
  });
});

describe('Database Connection', () => {
  test('mongoose is connected', () => {
    expect(mongoose.connection.readyState).toBe(1);
  });

  test('can create and query users', async () => {
    await User.create({
      email: 'query@example.com',
      username: 'querytest',
      password: 'Test1234!',
    });

    const count = await User.countDocuments({});
    expect(count).toBe(1);

    const found = await User.findOne({ email: 'query@example.com' });
    expect(found.username).toBe('querytest');
  });
});
