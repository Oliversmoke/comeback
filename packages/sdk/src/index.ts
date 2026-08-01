import {
  Keypair,
  Account,
  TransactionBuilder,
  Operation,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
  xdr,
  rpc,
  Address,
  StrKey,
} from '@stellar/stellar-sdk';

export interface StakeMindSDKConfig {
  networkPassphrase: string;
  rpcUrl: string;
  horizonUrl: string;
  goalStakingContractId: string;
  groupEscrowContractId: string;
  milestoneContractId: string;
}

export interface StakeInfo {
  user: string;
  token: string;
  amount: string; // i128 as decimal string
  completed: boolean;
  forfeited: boolean;
}

export interface GroupPool {
  token: string;
  total_balance: string; // i128 as decimal string
  member_count: number;
}

export interface MilestoneReceipt {
  user: string;
  goal_id: number;
  milestone_id: number;
  timestamp: number;
}

const VALID_CONTRACT_ID = /^C[A-Z2-7]{55}$/;

const assertValidContractId = (id: string, name: string) => {
  if (!VALID_CONTRACT_ID.test(id) || !StrKey.isValidContract(id)) {
    throw new Error(`Invalid ${name} contract ID: ${id}`);
  }
};

const assertValidPublicKey = (key: string) => {
  if (!StrKey.isValidEd25519PublicKey(key)) {
    throw new Error(`Invalid Stellar public key: ${key}`);
  }
};

/** A contract Address can be a G-account or a C-contract. */
const assertValidAddress = (address: string) => {
  if (!(StrKey.isValidEd25519PublicKey(address) || StrKey.isValidContract(address))) {
    throw new Error(`Invalid Stellar address: ${address}`);
  }
};

/** Encode a Stellar address (G-account or C-contract) as a contract Address ScVal. */
const addressScVal = (address: string) => {
  assertValidAddress(address);
  return nativeToScVal(address, { type: 'address' });
};

/** Encode a u64 value as an ScVal. */
const u64ScVal = (value: number | bigint) => nativeToScVal(BigInt(value), { type: 'u64' });

/** Encode an i128 token amount as an ScVal (amount is a decimal string). */
const i128ScVal = (amount: string) => nativeToScVal(BigInt(amount), { type: 'i128' });

/**
 * Build an unsigned Soroban invocation transaction (XDR, base64) for a
 * contract call. The returned XDR is ready to be signed by Freighter (or
 * another wallet) after `prepareTransaction` simulation.
 */
const buildInvocationXdr = (
  source: string,
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  networkPassphrase: string
): string => {
  assertValidPublicKey(source);
  assertValidContractId(contractId, method.split('_')[0]);

  const sourceAccount = new Account(source, '0');
  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(
      Operation.invokeHostFunction({
        source,
        func: xdr.HostFunction.hostFunctionTypeInvokeContract(
          new xdr.InvokeContractArgs({
            contractAddress: Address.fromString(contractId).toScAddress(),
            functionName: method,
            args,
          })
        ),
        auth: [],
      })
    )
    .setTimeout(120)
    .build();

  return tx.toEnvelope().toXDR('base64').toString();
};

/** Sign an invocation XDR with the given keypair (tests / server-side). */
export const signInvocationXdr = (xdrBase64: string, secretKey: string, networkPassphrase: string): string => {
  const tx = TransactionBuilder.fromXDR(xdrBase64, networkPassphrase);
  tx.sign(Keypair.fromSecret(secretKey));
  return tx.toEnvelope().toXDR('base64').toString();
};

export class StakeMindSDK {
  constructor(public config: StakeMindSDKConfig) {
    assertValidContractId(config.goalStakingContractId, 'goalStaking');
    assertValidContractId(config.groupEscrowContractId, 'groupEscrow');
    assertValidContractId(config.milestoneContractId, 'milestone');
  }

  getNetworkPassphrase(): string {
    return this.config.networkPassphrase;
  }

  get rpc(): rpc.Server {
    return new rpc.Server(this.config.rpcUrl);
  }

  // -------------------------------------------------------------------------
  // Invocation XDR builders (unsigned, wallet-ready)
  // -------------------------------------------------------------------------

  /** stake_goal(user, goal_id, token_address, amount, deadline) — matches contract source. */
  buildStakeGoalXdr(
    userPublicKey: string,
    goalId: number,
    tokenAddress: string,
    amount: string,
    deadline = 0n
  ): string {
    return buildInvocationXdr(
      userPublicKey,
      this.config.goalStakingContractId,
      'stake_goal',
      [
        addressScVal(userPublicKey),
        u64ScVal(goalId),
        addressScVal(tokenAddress),
        i128ScVal(amount),
        u64ScVal(deadline),
      ],
      this.config.networkPassphrase
    );
  }

  /** expire_goal(goal_id) — anyone may call once the deadline has passed (auto-forfeit path). */
  buildExpireGoalXdr(userPublicKey: string, goalId: number): string {
    return buildInvocationXdr(
      userPublicKey,
      this.config.goalStakingContractId,
      'expire_goal',
      [u64ScVal(goalId)],
      this.config.networkPassphrase
    );
  }

  /** complete_goal(admin, goal_id) — admin-gated. */
  buildCompleteGoalXdr(adminPublicKey: string, goalId: number): string {
    return buildInvocationXdr(
      adminPublicKey,
      this.config.goalStakingContractId,
      'complete_goal',
      [addressScVal(adminPublicKey), u64ScVal(goalId)],
      this.config.networkPassphrase
    );
  }

  /** forfeit_goal(admin, goal_id) — admin-gated. */
  buildForfeitGoalXdr(adminPublicKey: string, goalId: number): string {
    return buildInvocationXdr(
      adminPublicKey,
      this.config.goalStakingContractId,
      'forfeit_goal',
      [addressScVal(adminPublicKey), u64ScVal(goalId)],
      this.config.networkPassphrase
    );
  }

  /** deposit_pool(user, group_id, token_address, amount). */
  buildDepositPoolXdr(
    userPublicKey: string,
    groupId: number,
    tokenAddress: string,
    amount: string
  ): string {
    return buildInvocationXdr(
      userPublicKey,
      this.config.groupEscrowContractId,
      'deposit_pool',
      [addressScVal(userPublicKey), u64ScVal(groupId), addressScVal(tokenAddress), i128ScVal(amount)],
      this.config.networkPassphrase
    );
  }

  /** distribute_prize(admin, group_id, winner, amount) — admin-gated. */
  buildDistributePrizeXdr(
    adminPublicKey: string,
    groupId: number,
    winner: string,
    amount: string
  ): string {
    return buildInvocationXdr(
      adminPublicKey,
      this.config.groupEscrowContractId,
      'distribute_prize',
      [addressScVal(adminPublicKey), u64ScVal(groupId), addressScVal(winner), i128ScVal(amount)],
      this.config.networkPassphrase
    );
  }

  /** verify_milestone(admin, user, goal_id, milestone_id) — admin-gated. */
  buildVerifyMilestoneXdr(
    adminPublicKey: string,
    userPublicKey: string,
    goalId: number,
    milestoneId: number
  ): string {
    return buildInvocationXdr(
      adminPublicKey,
      this.config.milestoneContractId,
      'verify_milestone',
      [addressScVal(adminPublicKey), addressScVal(userPublicKey), u64ScVal(goalId), u64ScVal(milestoneId)],
      this.config.networkPassphrase
    );
  }

  // -------------------------------------------------------------------------
  // ScVal decoders (contract read results)
  // -------------------------------------------------------------------------

  decodeStakeInfo(raw: xdr.ScVal): StakeInfo {
    const map = scValToNative(raw) as Record<string, unknown>;
    return {
      user: String(map.user ?? ''),
      token: String(map.token ?? ''),
      amount: String(map.amount ?? '0'),
      completed: Boolean(map.completed),
      forfeited: Boolean(map.forfeited),
    };
  }

  decodeGroupPool(raw: xdr.ScVal): GroupPool {
    const map = scValToNative(raw) as Record<string, unknown>;
    return {
      token: String(map.token ?? ''),
      total_balance: String(map.total_balance ?? '0'),
      member_count: Number(map.member_count ?? 0),
    };
  }

  decodeMilestoneReceipt(raw: xdr.ScVal): MilestoneReceipt {
    const map = scValToNative(raw) as Record<string, unknown>;
    return {
      user: String(map.user ?? ''),
      goal_id: Number(map.goal_id ?? 0),
      milestone_id: Number(map.milestone_id ?? 0),
      timestamp: Number(map.timestamp ?? 0),
    };
  }

  // -------------------------------------------------------------------------
  // RPC helpers (write + read)
  // -------------------------------------------------------------------------

  /**
   * Prepare (simulate) an invocation XDR, returning a fee/auth-ready XDR that
   * the wallet can sign. Throws if the contract call fails simulation.
   */
  async prepareInvocation(userPublicKey: string, xdrBase64: string): Promise<string> {
    assertValidPublicKey(userPublicKey);
    const server = this.rpc;
    const tx = TransactionBuilder.fromXDR(xdrBase64, this.config.networkPassphrase);
    // v13 API: the source is inferred from the transaction itself.
    const prepared = await server.prepareTransaction(tx);
    return prepared.toEnvelope().toXDR('base64').toString();
  }

  /**
   * Submit a signed transaction and poll until it settles.
   * Returns the tx hash, final status, and (for contract calls) the result.
   */
  async submitAndConfirm(
    signedXdrBase64: string,
    opts: { timeoutMs?: number; pollMs?: number } = {}
  ): Promise<{ hash: string; status: string; result?: unknown }> {
    const server = this.rpc;
    const tx = TransactionBuilder.fromXDR(signedXdrBase64, this.config.networkPassphrase);
    const sendResponse = await server.sendTransaction(tx);
    if (sendResponse.status === 'ERROR') {
      throw new Error(`Transaction failed to send: ${sendResponse.errorResult?.result?.toString() ?? 'unknown error'}`);
    }

    const hash = sendResponse.hash;
    const timeoutMs = opts.timeoutMs ?? 60_000;
    const pollMs = opts.pollMs ?? 2_000;
    const deadline = Date.now() + timeoutMs;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const result = await server.getTransaction(hash);
      if (result.status === 'SUCCESS') {
        const retval = (result as any).returnValue;
        return {
          hash,
          status: 'SUCCESS',
          result: retval ? scValToNative(retval) : undefined,
        };
      }
      if (result.status === 'FAILED') {
        throw new Error(`Transaction failed on chain (${hash})`);
      }
      if (Date.now() > deadline) {
        throw new Error(`Transaction ${hash} did not settle within ${timeoutMs}ms`);
      }
      await new Promise((resolve) => setTimeout(resolve, pollMs));
    }
  }

  /** Read-only contract call: simulate an invocation and return the decoded result. */
  async readContract(
    contractId: string,
    method: string,
    args: xdr.ScVal[],
    source: string
  ): Promise<unknown> {
    assertValidContractId(contractId, method.split('_')[0]);
    assertValidPublicKey(source);
    const server = this.rpc;
    const sourceAccount = new Account(source, '0');
    const tx = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: this.config.networkPassphrase,
    })
      .addOperation(
        Operation.invokeHostFunction({
          source,
          func: xdr.HostFunction.hostFunctionTypeInvokeContract(
            new xdr.InvokeContractArgs({
              contractAddress: Address.fromString(contractId).toScAddress(),
              functionName: method,
              args,
            })
          ),
          auth: [],
        })
      )
      .setTimeout(120)
      .build();

    const simulated = await server.simulateTransaction(tx);
    const retval = (simulated as any).result?.retval;
    if (retval === undefined) {
      throw new Error(`Contract call ${method} failed to simulate`);
    }
    return scValToNative(retval);
  }

  /** get_stake(goal_id). */
  async readStake(goalId: number, source: string): Promise<StakeInfo> {
    const raw = await this.readContract(
      this.config.goalStakingContractId,
      'get_stake',
      [u64ScVal(goalId)],
      source
    );
    return this.decodeStakeInfo(raw as xdr.ScVal);
  }

  /** get_pool(group_id). */
  async readPool(groupId: number, source: string): Promise<GroupPool> {
    const raw = await this.readContract(
      this.config.groupEscrowContractId,
      'get_pool',
      [u64ScVal(groupId)],
      source
    );
    return this.decodeGroupPool(raw as xdr.ScVal);
  }

  /** get_receipt(goal_id, milestone_id). */
  async readReceipt(goalId: number, milestoneId: number, source: string): Promise<MilestoneReceipt> {
    const raw = await this.readContract(
      this.config.milestoneContractId,
      'get_receipt',
      [u64ScVal(goalId), u64ScVal(milestoneId)],
      source
    );
    return this.decodeMilestoneReceipt(raw as xdr.ScVal);
  }
}


