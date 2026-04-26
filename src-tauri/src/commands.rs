use serde::{Deserialize, Serialize};
use tauri::State;
use crate::auth::{hash_password, verify_password, create_token, verify_token, Claims};
use crate::db::AppState;

#[derive(Serialize, Deserialize, Debug)]
pub struct AuthRequest {
    pub username: String,
    pub password: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AuthResponse {
    pub success: bool,
    pub message: String,
    pub token: Option<String>,
}

#[tauri::command]
pub async fn register_user(
    username: String,
    password: String,
    state: State<'_, AppState>,
) -> Result<AuthResponse, String> {
    // Validar input
    if username.len() < 3 {
        return Ok(AuthResponse {
            success: false,
            message: "Username debe tener al menos 3 caracteres".to_string(),
            token: None,
        });
    }

    if password.len() < 6 {
        return Ok(AuthResponse {
            success: false,
            message: "Password debe tener al menos 6 caracteres".to_string(),
            token: None,
        });
    }

    // Hash password
    let password_hash = hash_password(&password)?;

    // Crear usuario
    match state.create_user(&username, &password_hash).await {
        Ok(user_id) => {
            let token = create_token(user_id, &username)?;
            Ok(AuthResponse {
                success: true,
                message: "Usuario registrado correctamente".to_string(),
                token: Some(token),
            })
        }
        Err(e) => {
            if e.contains("UNIQUE constraint failed") {
                Ok(AuthResponse {
                    success: false,
                    message: "Usuario ya existe".to_string(),
                    token: None,
                })
            } else {
                Err(e)
            }
        }
    }
}

#[tauri::command]
pub async fn login_user(
    username: String,
    password: String,
    state: State<'_, AppState>,
) -> Result<AuthResponse, String> {
    // Buscar usuario
    let user = state.get_user_by_username(&username).await?;

    match user {
        Some(user) => {
            // Verificar password
            let password_valid = verify_password(&password, &user.password_hash)?;

            if password_valid {
                let token = create_token(user.id, &user.username)?;
                Ok(AuthResponse {
                    success: true,
                    message: "Login exitoso".to_string(),
                    token: Some(token),
                })
            } else {
                Ok(AuthResponse {
                    success: false,
                    message: "Usuario o contraseña incorrectos".to_string(),
                    token: None,
                })
            }
        }
        None => Ok(AuthResponse {
            success: false,
            message: "Usuario o contraseña incorrectos".to_string(),
            token: None,
        }),
    }
}

#[tauri::command]
pub fn verify_auth_token(token: String) -> Result<bool, String> {
    verify_token(&token)?;
    Ok(true)
}
