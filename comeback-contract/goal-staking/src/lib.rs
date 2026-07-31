#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, token};

#[derive(Clone)]
@contracttype
pub struct StakeInfo {
    pub user: Address,
    pub token: Address,
    pub amount: i128,
    pub completed: bool,
    pub forfeited: bool,
}

#[derive(Clone)]
@contracttype
pub enum DataKey {
    Stake(u64),
    Admin,
}

@contract
pub struct GoalStakingContract;

@contractimpl
impl GoalStakingContract {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    pub fn stake_goal(env: Env, user: Address, goal_id: u64, token_address: Address, amount: i128) {
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
            completed: false,
            forfeited: false,
        };

        env.storage().persistent().set(&key, &stake_info);
        env.events().publish(("goal_staked", goal_id), amount);
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

        env.events().publish(("goal_completed", goal_id), return_amount);
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

        env.events().publish(("goal_forfeited", goal_id), stake_info.amount);
    }

    pub fn get_stake(env: Env, goal_id: u64) -> StakeInfo {
        let key = DataKey::Stake(goal_id);
        env.storage().persistent().get(&key).unwrap()
    }
}
