use serde::{Deserialize, Serialize};
use tauri::State;
use crate::auth::{hash_password, verify_password, create_token, verify_token, Claims};
use crate::db::{AppState, Order, Cliente, Item};

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

#[derive(Serialize, Deserialize, Debug)]
pub struct CreateOrderRequest {
    pub cliente: String,
    pub items: String,
    pub precio: f64,
    pub fecha: String,
    pub hora: String,
    pub zona: String,
}

#[tauri::command]
pub async fn create_order(
    request: CreateOrderRequest,
    state: State<'_, AppState>,
) -> Result<i32, String> {
    state.create_order(
        &request.cliente,
        &request.items,
        request.precio,
        &request.fecha,
        &request.hora,
        &request.zona,
    ).await
}

#[tauri::command]
pub async fn get_orders(state: State<'_, AppState>) -> Result<Vec<Order>, String> {
    state.get_orders().await
}

#[tauri::command]
pub async fn get_order(id: i32, state: State<'_, AppState>) -> Result<Option<Order>, String> {
    state.get_order(id).await
}

#[tauri::command]
pub async fn update_order(
    id: i32,
    request: CreateOrderRequest,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.update_order(
        id,
        &request.cliente,
        &request.items,
        request.precio,
        &request.fecha,
        &request.hora,
        &request.zona,
    ).await
}

#[tauri::command]
pub async fn delete_order(id: i32, state: State<'_, AppState>) -> Result<(), String> {
    state.delete_order(id).await
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CreateClienteRequest {
    pub nombre: String,
    pub telefono: String,
    pub direccion: String,
    pub zona: String,
}

#[tauri::command]
pub async fn create_cliente(
    request: CreateClienteRequest,
    state: State<'_, AppState>,
) -> Result<i32, String> {
    state.create_cliente(
        &request.nombre,
        &request.telefono,
        &request.direccion,
        &request.zona,
    ).await
}

#[tauri::command]
pub async fn get_clientes(state: State<'_, AppState>) -> Result<Vec<Cliente>, String> {
    state.get_clientes().await
}

#[tauri::command]
pub async fn get_cliente(id: i32, state: State<'_, AppState>) -> Result<Option<Cliente>, String> {
    state.get_cliente(id).await
}

#[tauri::command]
pub async fn update_cliente(
    id: i32,
    request: CreateClienteRequest,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.update_cliente(
        id,
        &request.nombre,
        &request.telefono,
        &request.direccion,
        &request.zona,
    ).await
}

#[tauri::command]
pub async fn delete_cliente(id: i32, state: State<'_, AppState>) -> Result<(), String> {
    state.delete_cliente(id).await
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CreateItemRequest {
    pub nombre: String,
    pub precio: f64,
    pub descripcion: String,
}

#[tauri::command]
pub async fn create_item(
    request: CreateItemRequest,
    state: State<'_, AppState>,
) -> Result<i32, String> {
    state.create_item(
        &request.nombre,
        request.precio,
        &request.descripcion,
    ).await
}

#[tauri::command]
pub async fn get_items(state: State<'_, AppState>) -> Result<Vec<Item>, String> {
    state.get_items().await
}

#[tauri::command]
pub async fn get_item(id: i32, state: State<'_, AppState>) -> Result<Option<Item>, String> {
    state.get_item(id).await
}

#[tauri::command]
pub async fn update_item(
    id: i32,
    request: CreateItemRequest,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.update_item(
        id,
        &request.nombre,
        request.precio,
        &request.descripcion,
    ).await
}

#[tauri::command]
pub async fn delete_item(id: i32, state: State<'_, AppState>) -> Result<(), String> {
    state.delete_item(id).await
}
