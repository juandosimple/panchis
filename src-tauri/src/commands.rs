use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct LoginResponse {
    pub success: bool,
    pub message: String,
}

// Placeholder para implementar después
pub async fn handle_login(_request: LoginRequest) -> LoginResponse {
    LoginResponse {
        success: false,
        message: "Not implemented".to_string(),
    }
}
