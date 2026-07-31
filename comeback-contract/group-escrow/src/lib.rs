#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, token};

#[derive(Clone)]
@contracttype
pub struct GroupPool {
    pub token: Address,
    pub total_balance: i128,
    pub member_count: u32,
}

#[derive(Clone)]
@contracttype
pub enum DataKey {
    Pool(u64),
    Admin,
}

@contract
pub struct GroupEscrowContract;

@contractimpl
impl GroupEscrowContract {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    pub fn deposit_pool(env: Env, user: Address, group_id: u64, token_address: Address, amount: i128) {
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

        let token_client = token::Client::new(&env, &token_address);
        token_client.transfer(&user, &env.current_contract_address(), &amount);

        pool.total_balance += amount;
        pool.member_count += 1;
        env.storage().persistent().set(&key, &pool);

        env.events().publish(("pool_deposit", group_id), amount);
    }

    pub fn distribute_prize(env: Env, admin: Address, group_id: u64, winner: Address, amount: i128) {
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

        env.events().publish(("prize_distributed", group_id), amount);
    }

    pub fn get_pool(env: Env, group_id: u64) -> GroupPool {
        let key = DataKey::Pool(group_id);
        env.storage().persistent().get(&key).unwrap()
    }
}
