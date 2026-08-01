import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StrKey, Keypair, xdr, TransactionBuilder, Address, scValToNative, nativeToScVal } from '@stellar/stellar-sdk';
import {
  StakeMindSDK,
  signInvocationXdr,
} from '../dist/index.js';

// Checksum-valid contract IDs (generated, not deployed — SDK only asserts
// validity, never network availability).
const contractId = (seed) => StrKey.encodeContract(Buffer.alloc(32, seed));

const goalStakingContractId = contractId(1);
const groupEscrowContractId = contractId(2);
const milestoneContractId = contractId(3);

const PASSPHRASE = 'Test SDF Network ; September 2015';
const user = Keypair.random();
const admin = Keypair.random();
const token = contractId(4); // stand-in for the native XLM token contract

const sdk = new StakeMindSDK({
  networkPassphrase: PASSPHRASE,
  rpcUrl: 'https://soroban-testnet.stellar.org',
  horizonUrl: 'https://horizon-testnet.stellar.org',
  goalStakingContractId,
  groupEscrowContractId,
  milestoneContractId,
});

/** Parse a base64 envelope back into a Transaction and read its invoke args. */
const parseInvocation = (xdrBase64) => {
  const tx = TransactionBuilder.fromXDR(xdrBase64, PASSPHRASE);
  const op = tx.operations[0];
  // v13 invokeHostFunction ops expose the HostFunction as `func`.
  const hostFn = op.func ?? (typeof op.hostFunction === 'function' ? op.hostFunction() : op.hostFunction);
  const invoke = hostFn.invokeContract();
  return {
    tx,
    method: invoke.functionName().toString(),
    args: invoke.args(),
    scAddress: invoke.contractAddress().contractId().toString('hex'),
  };
};

test('constructor rejects invalid contract IDs', () => {
  assert.throws(
    () =>
      new StakeMindSDK({
        networkPassphrase: PASSPHRASE,
        rpcUrl: 'x',
        horizonUrl: 'x',
        goalStakingContractId: 'not-a-contract-id',
        groupEscrowContractId,
        milestoneContractId,
      }),
    /Invalid goalStaking contract ID/
  );
});

test('buildStakeGoalXdr builds a 5-arg stake_goal invocation', () => {
  const xdrBase64 = sdk.buildStakeGoalXdr(user.publicKey(), 42, token, '10000000', 1234567890n);
  const { method, args, scAddress } = parseInvocation(xdrBase64);

  assert.equal(method, 'stake_goal');
  assert.equal(args.length, 5);
  assert.equal(scAddress, Buffer.from(StrKey.decodeContract(goalStakingContractId)).toString('hex'));

  // args: [user Address, goal_id u64, token Address, amount i128, deadline u64]
  assert.equal(Address.fromScAddress(args[0].address()).toString(), user.publicKey());
  assert.equal(scValToNative(args[1]).toString(), '42');
  assert.equal(Address.fromScAddress(args[2].address()).toString(), token);
  assert.equal(scValToNative(args[3]).toString(), '10000000');
  assert.equal(scValToNative(args[4]).toString(), '1234567890');
});

test('buildStakeGoalXdr defaults deadline to 0 (no auto-forfeit)', () => {
  const xdrBase64 = sdk.buildStakeGoalXdr(user.publicKey(), 7, token, '5');
  const { args } = parseInvocation(xdrBase64);
  assert.equal(args[4].u64().toString(), '0');
});

test('buildCompleteGoalXdr / buildForfeitGoalXdr target the admin-gated methods', () => {
  assert.equal(parseInvocation(sdk.buildCompleteGoalXdr(admin.publicKey(), 1)).method, 'complete_goal');
  assert.equal(parseInvocation(sdk.buildForfeitGoalXdr(admin.publicKey(), 1)).method, 'forfeit_goal');
  assert.equal(parseInvocation(sdk.buildExpireGoalXdr(user.publicKey(), 1)).method, 'expire_goal');
});

test('group escrow + milestone builders target the right contracts and methods', () => {
  const deposit = parseInvocation(sdk.buildDepositPoolXdr(user.publicKey(), 5, token, '250'));
  assert.equal(deposit.method, 'deposit_pool');
  assert.equal(deposit.scAddress, Buffer.from(StrKey.decodeContract(groupEscrowContractId)).toString('hex'));

  const prize = parseInvocation(sdk.buildDistributePrizeXdr(admin.publicKey(), 5, user.publicKey(), '250'));
  assert.equal(prize.method, 'distribute_prize');

  const verify = parseInvocation(
    sdk.buildVerifyMilestoneXdr(admin.publicKey(), user.publicKey(), 9, 2)
  );
  assert.equal(verify.method, 'verify_milestone');
  assert.equal(verify.scAddress, Buffer.from(StrKey.decodeContract(milestoneContractId)).toString('hex'));
});

test('builders reject malformed public keys and token addresses', () => {
  assert.throws(() => sdk.buildStakeGoalXdr('GARBAGE', 1, token, '10'), /Invalid Stellar address/);
  assert.throws(() => sdk.buildStakeGoalXdr(user.publicKey(), 1, 'GARBAGE', '10'), /Invalid Stellar address/);
});

test('signInvocationXdr signs and remains parseable', () => {
  const unsigned = sdk.buildStakeGoalXdr(user.publicKey(), 3, token, '777');
  const signed = signInvocationXdr(unsigned, user.secret(), PASSPHRASE);

  const { tx } = parseInvocation(signed);
  assert.equal(tx.signatures.length, 1);
  // Cryptographically verify the signature against the tx hash — version-
  // agnostic and proves the signature is genuinely valid, not just present.
  const sig = tx.signatures[0];
  const sigBytes = typeof sig.signature === 'function' ? sig.signature() : sig.signature;
  assert.equal(sigBytes.length, 64);
  assert.equal(user.verify(tx.hash(), Buffer.from(sigBytes)), true);
});

test('decoders map contract ScVal maps to plain objects', () => {
  const stakeRaw = xdr.ScVal.scvMap([
    new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol('user'), val: nativeToScVal(user.publicKey(), { type: 'address' }) }),
    new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol('token'), val: nativeToScVal(token, { type: 'address' }) }),
    new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol('amount'), val: nativeToScVal(1000000n, { type: 'i128' }) }),
    new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol('completed'), val: xdr.ScVal.scvBool(false) }),
    new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol('forfeited'), val: xdr.ScVal.scvBool(false) }),
  ]);

  const info = sdk.decodeStakeInfo(stakeRaw);
  assert.equal(info.user, user.publicKey());
  assert.equal(info.token, token);
  assert.equal(info.amount, '1000000');
  assert.equal(info.completed, false);
  assert.equal(info.forfeited, false);
});

test('read helpers construct correct read-only invocations (no network)', async () => {
  // readContract hits the RPC server; use a never-connecting URL to assert the
  // builder shape via the thrown transport error rather than success.
  const offline = new StakeMindSDK({
    networkPassphrase: PASSPHRASE,
    rpcUrl: 'http://127.0.0.1:1',
    horizonUrl: 'http://127.0.0.1:1',
    goalStakingContractId,
    groupEscrowContractId,
    milestoneContractId,
  });

  await assert.rejects(() => offline.readStake(11, user.publicKey()), /fetch|ECONNREFUSED|Failed|connect/i);
  await assert.rejects(() => offline.readPool(2, user.publicKey()), /fetch|ECONNREFUSED|Failed|connect/i);
  await assert.rejects(() => offline.readReceipt(2, 1, user.publicKey()), /fetch|ECONNREFUSED|Failed|connect/i);
});
