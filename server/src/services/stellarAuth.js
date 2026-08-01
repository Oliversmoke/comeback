import { WebAuth, Keypair, Networks, StrKey } from '@stellar/stellar-sdk';
import User from '../models/User.js';

const CHALLENGE_TIMEOUT_SECONDS = 300; // 5 minutes

const getNetworkPassphrase = () =>
  process.env.STELLAR_NETWORK_PASSPHRASE || Networks.TESTNET;

const getAuthDomain = () =>
  process.env.STELLAR_AUTH_DOMAIN || 'localhost:5000';

export const isStellarAuthConfigured = () => Boolean(process.env.STELLAR_AUTH_SECRET);

export const isValidStellarPublicKey = (key) => {
  try {
    return typeof key === 'string' && StrKey.isValidEd25519PublicKey(key);
  } catch {
    return false;
  }
};

const getServerKeypair = () => {
  if (!process.env.STELLAR_AUTH_SECRET) {
    throw new Error('STELLAR_AUTH_SECRET is not configured');
  }
  return Keypair.fromSecret(process.env.STELLAR_AUTH_SECRET);
};

/**
 * Build a SEP-10 challenge transaction for the given Stellar public key.
 * Returns the unsigned challenge XDR (base64) plus the network passphrase
 * the client must use when signing.
 */
export const buildChallenge = (publicKey) => {
  const serverKP = getServerKeypair();
  const networkPassphrase = getNetworkPassphrase();
  const homeDomain = getAuthDomain();

  const challengeXdr = WebAuth.buildChallengeTx(
    serverKP,           // serverKeypair
    publicKey,          // clientAccountID
    homeDomain,         // homeDomain
    CHALLENGE_TIMEOUT_SECONDS,
    networkPassphrase,
    homeDomain          // webAuthDomain
  );

  return {
    challengeXdr,
    networkPassphrase,
    homeDomain,
    serverPublicKey: serverKP.publicKey(),
  };
};

/**
 * Verify a signed SEP-10 challenge.
 * Throws if the challenge is invalid, expired, or not signed by `publicKey`.
 * Returns the verified client account ID on success.
 */
export const verifyChallenge = (publicKey, signedXdr) => {
  const serverKP = getServerKeypair();
  const networkPassphrase = getNetworkPassphrase();
  const homeDomain = getAuthDomain();

  const signersFound = WebAuth.verifyChallengeTxSigners(
    signedXdr,
    serverKP.publicKey(),  // serverAccountID
    networkPassphrase,
    [publicKey],           // signers (the client's key)
    homeDomain,            // homeDomains
    homeDomain             // webAuthDomain
  );

  if (!signersFound.includes(publicKey)) {
    throw new Error('Challenge not signed by the provided public key');
  }
  return publicKey;
};

/**
 * Find an existing user for a Stellar public key, or create one.
 */
export const findOrCreateStellarUser = async (publicKey) => {
  const short = publicKey.slice(-8).toLowerCase();

  // Upsert with the unique stellarPublicKey to avoid the create-race when
  // two concurrent first-time verifies arrive for the same wallet.
  // (Cross-wallet username/email collisions from the deterministic suffix
  // are negligible at 32^8 possible values; the route sets isOnline/lastSeen.)
  const user = await User.findOneAndUpdate(
    { stellarPublicKey: publicKey },
    {
      $setOnInsert: {
        email: `stellar_${short}@stakemind.app`,
        username: `stellar_${short}`,
        displayName: `Stellar ${publicKey.slice(-6)}`,
        avatar: `https://ui-avatars.com/api/?background=6366f1&color=fff&name=${publicKey.slice(-6)}`,
        provider: 'stellar',
        providerId: publicKey,
        stellarPublicKey: publicKey,
      },
    },
    { upsert: true, new: true }
  );

  return user;
};
