#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Symbol};

#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MilestoneReceipt {
    pub user: Address,
    pub goal_id: u64,
    pub milestone_id: u64,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum DataKey {
    Receipt(u64, u64), // (goal_id, milestone_id)
    Admin,
}

#[contract]
pub struct MilestoneContract;

#[contractimpl]
impl MilestoneContract {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    pub fn verify_milestone(
        env: Env,
        admin: Address,
        user: Address,
        goal_id: u64,
        milestone_id: u64,
    ) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        if admin != stored_admin {
            panic!("unauthorized admin");
        }

        let key = DataKey::Receipt(goal_id, milestone_id);
        if env.storage().persistent().has(&key) {
            panic!("milestone already verified");
        }

        let receipt = MilestoneReceipt {
            user: user.clone(),
            goal_id,
            milestone_id,
            timestamp: env.ledger().timestamp(),
        };

        env.storage().persistent().set(&key, &receipt);
        env.events()
            .publish((Symbol::new(&env, "milestone_verified"), goal_id), milestone_id);
    }

    pub fn get_receipt(env: Env, goal_id: u64, milestone_id: u64) -> MilestoneReceipt {
        let key = DataKey::Receipt(goal_id, milestone_id);
        env.storage().persistent().get(&key).unwrap()
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, Events, Ledger},
        Symbol, TryFromVal,
    };

    /// Returns (env, contract_id, admin, user). Clients are constructed
    /// per-test because the generated client borrows `Env` (SDK 22).
    fn setup() -> (Env, Address, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        let contract_id = env.register(MilestoneContract, ());
        MilestoneContractClient::new(&env, &contract_id).initialize(&admin);
        (env, contract_id, admin, user)
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
    fn test_verify_milestone_emits_receipt_with_ledger_timestamp() {
        let (env, contract_id, admin, user) = setup();
        let client = MilestoneContractClient::new(&env, &contract_id);
        set_timestamp(&env, 1_700_000_000);

        client.verify_milestone(&admin, &user, &7, &3);
        assert_event_emitted(&env, &contract_id, "milestone_verified");

        let expected = MilestoneReceipt {
            user: user.clone(),
            goal_id: 7,
            milestone_id: 3,
            timestamp: 1_700_000_000,
        };
        assert_eq!(client.get_receipt(&7, &3), expected);
    }

    #[test]
    fn test_verify_rejects_duplicate() {
        let (env, contract_id, admin, user) = setup();
        let client = MilestoneContractClient::new(&env, &contract_id);

        client.verify_milestone(&admin, &user, &7, &3);
        assert!(client.try_verify_milestone(&admin, &user, &7, &3).is_err());
    }

    #[test]
    fn test_verify_rejects_non_admin() {
        let (env, contract_id, _admin, user) = setup();
        let client = MilestoneContractClient::new(&env, &contract_id);

        // `user` is not the stored admin.
        assert!(client.try_verify_milestone(&user, &user, &7, &3).is_err());
    }

    #[test]
    fn test_get_receipt_panics_when_missing() {
        let (env, contract_id, _admin, _user) = setup();
        let client = MilestoneContractClient::new(&env, &contract_id);
        assert!(client.try_get_receipt(&1, &1).is_err());
    }

    #[test]
    fn test_initialize_rejects_twice() {
        let (env, _contract_id, admin, _user) = setup();
        let cid = env.register(MilestoneContract, ());
        let client = MilestoneContractClient::new(&env, &cid);
        client.initialize(&admin);

        assert!(client.try_initialize(&admin).is_err());
    }
}
