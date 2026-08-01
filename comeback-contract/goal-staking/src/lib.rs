#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env, Symbol};

#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct StakeInfo {
    pub user: Address,
    pub token: Address,
    pub amount: i128,
    pub deadline: u64,
    pub completed: bool,
    pub forfeited: bool,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum DataKey {
    Stake(u64),
    Admin,
}

#[contract]
pub struct GoalStakingContract;

#[contractimpl]
impl GoalStakingContract {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    pub fn stake_goal(
        env: Env,
        user: Address,
        goal_id: u64,
        token_address: Address,
        amount: i128,
        deadline: u64,
    ) {
        user.require_auth();
        if amount <= 0 {
            panic!("amount must be positive");
        }
        let key = DataKey::Stake(goal_id);
        if env.storage().persistent().has(&key) {
            panic!("goal already staked");
        }

        // Transfer tokens from user to contract
        let token_client = token::Client::new(&env, &token_address);
        token_client.transfer(&user, &env.current_contract_address(), &amount);

        let stake_info = StakeInfo {
            user,
            token: token_address,
            amount,
            deadline,
            completed: false,
            forfeited: false,
        };

        env.storage().persistent().set(&key, &stake_info);
        env.events()
            .publish((Symbol::new(&env, "goal_staked"), goal_id), amount);
    }

    /// Auto-forfeit path: anyone may call once the deadline has passed. A
    /// deadline of 0 means the goal opted out of auto-forfeit.
    pub fn expire_goal(env: Env, goal_id: u64) {
        let key = DataKey::Stake(goal_id);
        let mut stake_info: StakeInfo = env.storage().persistent().get(&key).unwrap();
        if stake_info.completed || stake_info.forfeited {
            panic!("goal already finalized");
        }
        if stake_info.deadline == 0 {
            panic!("no deadline set");
        }
        if env.ledger().timestamp() <= stake_info.deadline {
            panic!("deadline not reached");
        }

        stake_info.forfeited = true;
        env.storage().persistent().set(&key, &stake_info);

        env.events()
            .publish((Symbol::new(&env, "goal_expired"), goal_id), stake_info.amount);
    }

    pub fn complete_goal(env: Env, admin: Address, goal_id: u64) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        if admin != stored_admin {
            panic!("unauthorized admin");
        }

        let key = DataKey::Stake(goal_id);
        let mut stake_info: StakeInfo = env.storage().persistent().get(&key).unwrap();
        if stake_info.completed || stake_info.forfeited {
            panic!("goal already finalized");
        }

        stake_info.completed = true;
        env.storage().persistent().set(&key, &stake_info);

        // Return staked amount + 10% reward bonus from contract balance
        let token_client = token::Client::new(&env, &stake_info.token);
        let return_amount = stake_info.amount + (stake_info.amount / 10);
        token_client.transfer(&env.current_contract_address(), &stake_info.user, &return_amount);

        env.events()
            .publish((Symbol::new(&env, "goal_completed"), goal_id), return_amount);
    }

    pub fn forfeit_goal(env: Env, admin: Address, goal_id: u64) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        if admin != stored_admin {
            panic!("unauthorized admin");
        }

        let key = DataKey::Stake(goal_id);
        let mut stake_info: StakeInfo = env.storage().persistent().get(&key).unwrap();
        if stake_info.completed || stake_info.forfeited {
            panic!("goal already finalized");
        }

        stake_info.forfeited = true;
        env.storage().persistent().set(&key, &stake_info);

        env.events()
            .publish((Symbol::new(&env, "goal_forfeited"), goal_id), stake_info.amount);
    }

    pub fn get_stake(env: Env, goal_id: u64) -> StakeInfo {
        let key = DataKey::Stake(goal_id);
        env.storage().persistent().get(&key).unwrap()
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, Events, Ledger},
        token, Symbol, TryFromVal,
    };

    const DEADLINE: u64 = 100;

    /// Returns (env, contract_id, admin, user, token). Clients are constructed
    /// per-test because the generated client borrows `Env` (SDK 22).
    fn setup() -> (Env, Address, Address, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        let token = env.register_stellar_asset_contract_v2(admin.clone()).address();
        let contract_id = env.register(GoalStakingContract, ());
        GoalStakingContractClient::new(&env, &contract_id).initialize(&admin);
        (env, contract_id, admin, user, token)
    }

    fn mint(env: &Env, token: &Address, to: &Address, amount: i128) {
        token::StellarAssetClient::new(env, token).mint(to, &amount);
    }

    fn balance(env: &Env, token: &Address, who: &Address) -> i128 {
        token::Client::new(env, token).balance(who)
    }

    fn set_timestamp(env: &Env, ts: u64) {
        env.ledger().set_timestamp(ts);
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
    fn test_stake_goal_transfers_and_stores() {
        let (env, contract_id, _admin, user, token) = setup();
        let client = GoalStakingContractClient::new(&env, &contract_id);
        mint(&env, &token, &user, 1000);

        client.stake_goal(&user, &1, &token, &1000, &DEADLINE);
        assert_event_emitted(&env, &contract_id, "goal_staked");

        assert_eq!(balance(&env, &token, &user), 0);
        assert_eq!(balance(&env, &token, &contract_id), 1000);
        let stake = client.get_stake(&1);
        assert_eq!(
            stake,
            StakeInfo {
                user: user.clone(),
                token: token.clone(),
                amount: 1000,
                deadline: DEADLINE,
                completed: false,
                forfeited: false,
            }
        );
    }

    #[test]
    fn test_stake_rejects_non_positive_amount() {
        let (env, contract_id, _admin, user, token) = setup();
        let client = GoalStakingContractClient::new(&env, &contract_id);

        assert!(client.try_stake_goal(&user, &1, &token, &0, &DEADLINE).is_err());
        assert!(client.try_stake_goal(&user, &2, &token, &(-5), &DEADLINE).is_err());
    }

    #[test]
    fn test_stake_rejects_duplicate_goal() {
        let (env, contract_id, _admin, user, token) = setup();
        let client = GoalStakingContractClient::new(&env, &contract_id);
        mint(&env, &token, &user, 1000);

        client.stake_goal(&user, &1, &token, &500, &DEADLINE);
        assert!(client.try_stake_goal(&user, &1, &token, &500, &DEADLINE).is_err());
    }

    #[test]
    fn test_complete_goal_pays_stake_plus_bonus() {
        let (env, contract_id, admin, user, token) = setup();
        let client = GoalStakingContractClient::new(&env, &contract_id);
        mint(&env, &token, &user, 1000);
        client.stake_goal(&user, &1, &token, &1000, &DEADLINE);
        // Fund the +10% bonus from the contract's own balance.
        mint(&env, &token, &contract_id, 100);

        client.complete_goal(&admin, &1);
        assert_event_emitted(&env, &contract_id, "goal_completed");

        assert_eq!(balance(&env, &token, &user), 1100);
        assert_eq!(balance(&env, &token, &contract_id), 0);
        let stake = client.get_stake(&1);
        assert!(stake.completed);
        assert!(!stake.forfeited);
    }

    #[test]
    fn test_complete_goal_rejects_non_admin() {
        let (env, contract_id, admin, user, token) = setup();
        let client = GoalStakingContractClient::new(&env, &contract_id);
        mint(&env, &token, &user, 1000);
        client.stake_goal(&user, &1, &token, &500, &DEADLINE);

        // `user` is not the stored admin.
        assert!(client.try_complete_goal(&user, &1).is_err());
        // The real admin succeeds — fund the +10% bonus first.
        mint(&env, &token, &contract_id, 50);
        client.complete_goal(&admin, &1);
    }

    #[test]
    fn test_forfeit_goal_keeps_stake_in_contract() {
        let (env, contract_id, admin, user, token) = setup();
        let client = GoalStakingContractClient::new(&env, &contract_id);
        mint(&env, &token, &user, 1000);
        client.stake_goal(&user, &1, &token, &1000, &DEADLINE);

        client.forfeit_goal(&admin, &1);
        assert_event_emitted(&env, &contract_id, "goal_forfeited");

        let stake = client.get_stake(&1);
        assert!(stake.forfeited);
        assert_eq!(balance(&env, &token, &user), 0);
        assert_eq!(balance(&env, &token, &contract_id), 1000);
    }

    #[test]
    fn test_finalized_goal_cannot_be_finalized_again() {
        let (env, contract_id, admin, user, token) = setup();
        let client = GoalStakingContractClient::new(&env, &contract_id);
        mint(&env, &token, &user, 1000);
        client.stake_goal(&user, &1, &token, &1000, &DEADLINE);

        client.forfeit_goal(&admin, &1);
        assert!(client.try_forfeit_goal(&admin, &1).is_err());
        assert!(client.try_complete_goal(&admin, &1).is_err());
    }

    #[test]
    fn test_expire_goal_after_deadline_forfeits() {
        let (env, contract_id, _admin, user, token) = setup();
        let client = GoalStakingContractClient::new(&env, &contract_id);
        mint(&env, &token, &user, 1000);
        client.stake_goal(&user, &1, &token, &1000, &DEADLINE);
        set_timestamp(&env, DEADLINE + 1);

        // Anyone can trigger the auto-forfeit — no auth required.
        client.expire_goal(&1);
        assert_event_emitted(&env, &contract_id, "goal_expired");

        let stake = client.get_stake(&1);
        assert!(stake.forfeited);
        assert!(!stake.completed);
    }

    #[test]
    fn test_expire_goal_rejected_before_deadline() {
        let (env, contract_id, _admin, user, token) = setup();
        let client = GoalStakingContractClient::new(&env, &contract_id);
        mint(&env, &token, &user, 1000);
        client.stake_goal(&user, &1, &token, &1000, &DEADLINE);

        set_timestamp(&env, DEADLINE - 1);
        assert!(client.try_expire_goal(&1).is_err());
        // Exactly at the deadline is still not past it.
        set_timestamp(&env, DEADLINE);
        assert!(client.try_expire_goal(&1).is_err());
    }

    #[test]
    fn test_expire_goal_rejected_when_no_deadline() {
        let (env, contract_id, _admin, user, token) = setup();
        let client = GoalStakingContractClient::new(&env, &contract_id);
        mint(&env, &token, &user, 1000);
        client.stake_goal(&user, &1, &token, &1000, &0);
        set_timestamp(&env, 10_000);

        assert!(client.try_expire_goal(&1).is_err());
    }

    #[test]
    fn test_expire_goal_rejected_when_already_finalized() {
        let (env, contract_id, admin, user, token) = setup();
        let client = GoalStakingContractClient::new(&env, &contract_id);
        mint(&env, &token, &user, 1000);
        client.stake_goal(&user, &1, &token, &1000, &DEADLINE);
        set_timestamp(&env, DEADLINE + 1);
        client.expire_goal(&1);

        assert!(client.try_expire_goal(&1).is_err());
        assert!(client.try_complete_goal(&admin, &1).is_err());
    }

    #[test]
    fn test_expire_goal_rejected_after_admin_forfeit() {
        let (env, contract_id, admin, user, token) = setup();
        let client = GoalStakingContractClient::new(&env, &contract_id);
        mint(&env, &token, &user, 1000);
        client.stake_goal(&user, &1, &token, &1000, &DEADLINE);
        set_timestamp(&env, DEADLINE + 1);
        client.forfeit_goal(&admin, &1);

        // Already finalized by the admin — the auto-forfeit path is a no-op.
        assert!(client.try_expire_goal(&1).is_err());
    }

    #[test]
    fn test_initialize_rejects_twice() {
        let (env, _contract_id, admin, _user, _token) = setup();
        let cid = env.register(GoalStakingContract, ());
        let client = GoalStakingContractClient::new(&env, &cid);
        client.initialize(&admin);

        assert!(client.try_initialize(&admin).is_err());
    }

    #[test]
    fn test_get_stake_panics_when_missing() {
        let (env, contract_id, _admin, _user, _token) = setup();
        let client = GoalStakingContractClient::new(&env, &contract_id);
        assert!(client.try_get_stake(&999).is_err());
    }
}
