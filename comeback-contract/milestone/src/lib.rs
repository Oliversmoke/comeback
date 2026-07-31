#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env};

#[derive(Clone)]
@contracttype
pub struct MilestoneReceipt {
    pub user: Address,
    pub goal_id: u64,
    pub milestone_id: u64,
    pub timestamp: u64,
}

#[derive(Clone)]
@contracttype
pub enum DataKey {
    Receipt(u64, u64), // (goal_id, milestone_id)
    Admin,
}

@contract
pub struct MilestoneContract;

@contractimpl
impl MilestoneContract {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    pub fn verify_milestone(env: Env, admin: Address, user: Address, goal_id: u64, milestone_id: u64) {
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
        env.events().publish(("milestone_verified", goal_id), milestone_id);
    }

    pub fn get_receipt(env: Env, goal_id: u64, milestone_id: u64) -> MilestoneReceipt {
        let key = DataKey::Receipt(goal_id, milestone_id);
        env.storage().persistent().get(&key).unwrap()
    }
}
