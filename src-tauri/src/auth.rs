use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use argon2::password_hash::{SaltString, ParsingError};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use rand::Rng;
use serde::{Deserialize, Serialize};
use chrono::{Duration, Utc};

const JWT_SECRET: &str = "your-secret-key-change-in-production";
const JWT_EXPIRATION: i64 = 24 * 60 * 60; // 24 hours

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String,
    pub username: String,
    pub exp: i64,
}

pub fn hash_password(password: &str) -> Result<String, String> {
    let salt = SaltString::generate(rand::thread_rng());
    let argon2 = Argon2::default();

    let password_hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| format!("Error hashing password: {}", e))?
        .to_string();

    Ok(password_hash)
}

pub fn verify_password(password: &str, hash: &str) -> Result<bool, String> {
    let parsed_hash = PasswordHash::new(hash)
        .map_err(|e| format!("Error parsing hash: {}", e))?;

    let argon2 = Argon2::default();
    let is_valid = argon2.verify_password(password.as_bytes(), &parsed_hash).is_ok();

    Ok(is_valid)
}

pub fn create_token(user_id: i32, username: &str) -> Result<String, String> {
    let expiration = Utc::now() + Duration::seconds(JWT_EXPIRATION);

    let claims = Claims {
        sub: user_id.to_string(),
        username: username.to_string(),
        exp: expiration.timestamp(),
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(JWT_SECRET.as_ref()),
    )
    .map_err(|e| format!("Error creating token: {}", e))
}

pub fn verify_token(token: &str) -> Result<Claims, String> {
    decode::<Claims>(
        token,
        &DecodingKey::from_secret(JWT_SECRET.as_ref()),
        &Validation::default(),
    )
    .map(|data| data.claims)
    .map_err(|e| format!("Error verifying token: {}", e))
}
