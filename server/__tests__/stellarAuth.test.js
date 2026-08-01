import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { Keypair, Networks, TransactionBuilder } from '@stellar/stellar-sdk';
import {
  isStellarAuthConfigured,
  buildChallenge,
  verifyChallenge,
  findOrCreateStellarUser,
} from '../src/services/stellarAuth.js';
import User from '../src/models/User.js';

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.JWT_SECRET = 'test-secret-key';
  process.env.JWT_EXPIRES_IN = '7d';
  process.env.NODE_ENV = 'test';
  process.env.STELLAR_AUTH_SECRET = Keypair.random().secret();
  process.env.STELLAR_NETWORK_PASSPHRASE = Networks.TESTNET;
  process.env.STELLAR_AUTH_DOMAIN = 'localhost:5000';

  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod?.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
});

describe('SEP-10 Stellar Auth', () => {
  const clientKP = Keypair.random();

  test('isStellarAuthConfigured reflects env', () => {
    expect(isStellarAuthConfigured()).toBe(true);
  });

  test('buildChallenge returns XDR for the client account', () => {
    const challenge = buildChallenge(clientKP.publicKey());
    expect(challenge.challengeXdr).toBeDefined();
    expect(typeof challenge.challengeXdr).toBe('string');
    expect(challenge.networkPassphrase).toBe(Networks.TESTNET);
    expect(challenge.homeDomain).toBe('localhost:5000');
    expect(challenge.serverPublicKey).toBe(process.env.STELLAR_AUTH_SECRET
      ? Keypair.fromSecret(process.env.STELLAR_AUTH_SECRET).publicKey()
      : '');
  });

  test('verifyChallenge accepts a valid signed challenge', () => {
    const { challengeXdr } = buildChallenge(clientKP.publicKey());
    const tx = TransactionBuilder.fromXDR(challengeXdr, Networks.TESTNET);
    tx.sign(clientKP);
    const signedXdr = tx.toEnvelope().toXDR('base64');

    const verified = verifyChallenge(clientKP.publicKey(), signedXdr);
    expect(verified).toBe(clientKP.publicKey());
  });

  test('verifyChallenge rejects a challenge signed by the wrong key', () => {
    const { challengeXdr } = buildChallenge(clientKP.publicKey());
    const tx = TransactionBuilder.fromXDR(challengeXdr, Networks.TESTNET);
    tx.sign(Keypair.random()); // wrong signer
    const signedXdr = tx.toEnvelope().toXDR('base64');

    expect(() => verifyChallenge(clientKP.publicKey(), signedXdr)).toThrow();
  });

  test('verifyChallenge rejects garbage XDR', () => {
    expect(() => verifyChallenge(clientKP.publicKey(), 'not-an-xdr')).toThrow();
  });

  test('findOrCreateStellarUser creates then reuses a user', async () => {
    const user = await findOrCreateStellarUser(clientKP.publicKey());
    expect(user.stellarPublicKey).toBe(clientKP.publicKey());
    expect(user.provider).toBe('stellar');

    const again = await findOrCreateStellarUser(clientKP.publicKey());
    expect(again.id).toBe(user.id);
    expect(await User.countDocuments({})).toBe(1);
  });
});
