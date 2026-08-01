#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env, Symbol};

#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct GroupPool {
    pub token: Address,
    pub total_balance: i128,
    pub member_count: u32,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum DataKey {
    Pool(u64),
    Admin,
}

#[contract]
pub struct GroupEscrowContract;

#[contractimpl]
impl GroupEscrowContract {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    pub fn deposit_pool(
        env: Env,
        user: Address,
        group_id: u64,
        token_address: Address,
        amount: i128,
    ) {
        user.require_auth();
        if amount <= 0 {
            panic!("amount must be positive");
        }
        let key = DataKey::Pool(group_id);
        let mut pool: GroupPool = env.storage().persistent().get(&key).unwrap_or(GroupPool {
            token: token_address.clone(),
            total_balance: 0,
            member_count: 0,
        });

        // A pool is denominated in a single token — reject deposits in another.
        if pool.token != token_address {
            panic!("token mismatch");
        }

        let token_client = token::Client::new(&env, &token_address);
        token_client.transfer(&user, &env.current_contract_address(), &amount);

        pool.total_balance += amount;
        pool.member_count += 1;
        env.storage().persistent().set(&key, &pool);

        env.events()
            .publish((Symbol::new(&env, "pool_deposit"), group_id), amount);
    }

    pub fn distribute_prize(
        env: Env,
        admin: Address,
        group_id: u64,
        winner: Address,
        amount: i128,
    ) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        if admin != stored_admin {
            panic!("unauthorized admin");
        }

        let key = DataKey::Pool(group_id);
        let mut pool: GroupPool = env.storage().persistent().get(&key).unwrap();
        if pool.total_balance < amount {
            panic!("insufficient pool balance");
        }

        pool.total_balance -= amount;
        env.storage().persistent().set(&key, &pool);

        let token_client = token::Client::new(&env, &pool.token);
        token_client.transfer(&env.current_contract_address(), &winner, &amount);

        env.events()
            .publish((Symbol::new(&env, "prize_distributed"), group_id), amount);
    }

    pub fn get_pool(env: Env, group_id: u64) -> GroupPool {
        let key = DataKey::Pool(group_id);
        env.storage().persistent().get(&key).unwrap()
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, Events},
        token, Symbol, TryFromVal,
    };

    /// Returns (env, contract_id, admin, member_a, member_b, winner, token).
    /// Clients are constructed per-test because the generated client borrows
    /// `Env` (SDK 22).
    fn setup() -> (Env, Address, Address, Address, Address, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let member_a = Address::generate(&env);
        let member_b = Address::generate(&env);
        let winner = Address::generate(&env);
        let token = env.register_stellar_asset_contract_v2(admin.clone()).address();
        let contract_id = env.register(GroupEscrowContract, ());
        GroupEscrowContractClient::new(&env, &contract_id).initialize(&admin);
        (env, contract_id, admin, member_a, member_b, winner, token)
    }

    fn mint(env: &Env, token: &Address, to: &Address, amount: i128) {
        token::StellarAssetClient::new(env, token).mint(to, &amount);
    }

    fn balance(env: &Env, token: &Address, who: &Address) -> i128 {
        token::Client::new(env, token).balance(who)
    }

    /// NOTE: call immediately after the emitting contract call — the test env
    /// clears the event buffer on subsequent invocations (including reads).
    fn assert_event_emitted(env: &Env, contract_id: &Address, topic: &str) {
        let events = env.events().all();
        assert!(
            events.iter().any(|(addr, topics, _)| {
                addr == *contract_id
                    && topics.get(0).is_some_and(|t| {
                        Symbol::try_from_val(env, &t) == Ok(Symbol::new(env, topic))
                    })
            }),
            "expected event {topic} to be emitted, got {} events",
            events.len()
        );
    }

    #[test]
    fn test_deposit_creates_pool_and_transfers() {
        let (env, contract_id, _admin, member_a, _member_b, _winner, token) = setup();
        let client = GroupEscrowContractClient::new(&env, &contract_id);
        mint(&env, &token, &member_a, 1000);

        client.deposit_pool(&member_a, &7, &token, &1000);
        assert_event_emitted(&env, &contract_id, "pool_deposit");

        assert_eq!(balance(&env, &token, &member_a), 0);
        assert_eq!(balance(&env, &token, &contract_id), 1000);
        let pool = client.get_pool(&7);
        assert_eq!(
            pool,
            GroupPool {
                token: token.clone(),
                total_balance: 1000,
                member_count: 1,
            }
        );
    }

    #[test]
    fn test_deposit_multiple_members_accumulates() {
        let (env, contract_id, _admin, member_a, member_b, _winner, token) = setup();
        let client = GroupEscrowContractClient::new(&env, &contract_id);
        mint(&env, &token, &member_a, 500);
        mint(&env, &token, &member_b, 1500);

        client.deposit_pool(&member_a, &7, &token, &500);
        client.deposit_pool(&member_b, &7, &token, &1500);

        let pool = client.get_pool(&7);
        assert_eq!(pool.total_balance, 2000);
        assert_eq!(pool.member_count, 2);
    }

    #[test]
    fn test_deposit_rejects_non_positive_amount() {
        let (env, contract_id, _admin, member_a, _member_b, _winner, token) = setup();
        let client = GroupEscrowContractClient::new(&env, &contract_id);
        mint(&env, &token, &member_a, 100);

        assert!(client.try_deposit_pool(&member_a, &7, &token, &0).is_err());
        assert!(client.try_deposit_pool(&member_a, &7, &token, &(-10)).is_err());
    }

    #[test]
    fn test_deposit_rejects_token_mismatch() {
        let (env, contract_id, _admin, member_a, _member_b, _winner, token) = setup();
        let client = GroupEscrowContractClient::new(&env, &contract_id);
        mint(&env, &token, &member_a, 1000);
        client.deposit_pool(&member_a, &7, &token, &500);

        // A different token must not be accepted into the same pool.
        let other_token = env
            .register_stellar_asset_contract_v2(Address::generate(&env))
            .address();
        mint(&env, &other_token, &member_a, 500);
        assert!(client.try_deposit_pool(&member_a, &7, &other_token, &100).is_err());
    }

    #[test]
    fn test_distribute_prize_pays_winner() {
        let (env, contract_id, admin, member_a, _member_b, winner, token) = setup();
        let client = GroupEscrowContractClient::new(&env, &contract_id);
        mint(&env, &token, &member_a, 1000);
        client.deposit_pool(&member_a, &7, &token, &1000);

        client.distribute_prize(&admin, &7, &winner, &1000);
        assert_event_emitted(&env, &contract_id, "prize_distributed");

        assert_eq!(balance(&env, &token, &winner), 1000);
        let pool = client.get_pool(&7);
        assert_eq!(pool.total_balance, 0);
    }

    #[test]
    fn test_distribute_insufficient_pool() {
        let (env, contract_id, admin, member_a, _member_b, winner, token) = setup();
        let client = GroupEscrowContractClient::new(&env, &contract_id);
        mint(&env, &token, &member_a, 1000);
        client.deposit_pool(&member_a, &7, &token, &1000);

        assert!(client.try_distribute_prize(&admin, &7, &winner, &2000).is_err());
    }

    #[test]
    fn test_distribute_rejects_non_admin() {
        let (env, contract_id, _admin, member_a, _member_b, winner, token) = setup();
        let client = GroupEscrowContractClient::new(&env, &contract_id);
        mint(&env, &token, &member_a, 1000);
        client.deposit_pool(&member_a, &7, &token, &1000);

        // `member_a` is not the stored admin.
        assert!(client.try_distribute_prize(&member_a, &7, &winner, &500).is_err());
    }

    #[test]
    fn test_get_pool_panics_when_missing() {
        let (env, contract_id, _admin, _member_a, _member_b, _winner, _token) = setup();
        let client = GroupEscrowContractClient::new(&env, &contract_id);
        assert!(client.try_get_pool(&999).is_err());
    }

    #[test]
    fn test_initialize_rejects_twice() {
        let (env, _contract_id, admin, _member_a, _member_b, _winner, _token) = setup();
        let cid = env.register(GroupEscrowContract, ());
        let client = GroupEscrowContractClient::new(&env, &cid);
        client.initialize(&admin);

        assert!(client.try_initialize(&admin).is_err());
    }
}
