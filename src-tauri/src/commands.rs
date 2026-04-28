use serde::{Deserialize, Serialize};
use tauri::State;
use crate::auth::{hash_password, verify_password, create_token, verify_token};
use crate::db::{AppState, Order, Cliente, Item, DailySales, ZoneSales, StockItem, ItemIngrediente};

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
    // Para desarrollo: aceptar admin/admin
    if username == "admin" && password == "admin" {
        let token = create_token(1, "admin")?;
        return Ok(AuthResponse {
            success: true,
            message: "Login exitoso".to_string(),
            token: Some(token),
        });
    }

    // Buscar usuario en BD
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
#[serde(rename_all = "camelCase")]
pub struct ItemVendido {
    pub item_id: i32,
    pub cantidad: f64,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CreateOrderRequest {
    pub cliente: String,
    pub items: String,
    pub precio: f64,
    pub fecha: String,
    pub hora: String,
    pub zona: String,
    pub items_vendidos: Option<Vec<ItemVendido>>,
}

#[tauri::command]
pub async fn create_order(
    request: CreateOrderRequest,
    state: State<'_, AppState>,
) -> Result<i32, String> {
    let items_vendidos: Vec<(i32, f64)> = request.items_vendidos
        .unwrap_or_default()
        .iter()
        .map(|iv| (iv.item_id, iv.cantidad))
        .collect();

    state.create_order(
        &request.cliente,
        &request.items,
        request.precio,
        &request.fecha,
        &request.hora,
        &request.zona,
        &items_vendidos,
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
    pub categoria: String,
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
        &request.categoria,
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
        &request.categoria,
    ).await
}

#[tauri::command]
pub async fn delete_item(id: i32, state: State<'_, AppState>) -> Result<(), String> {
    state.delete_item(id).await
}

#[tauri::command]
pub async fn get_daily_sales(state: State<'_, AppState>) -> Result<Vec<DailySales>, String> {
    state.get_daily_sales().await
}

#[tauri::command]
pub async fn get_sales_by_zone(state: State<'_, AppState>) -> Result<Vec<ZoneSales>, String> {
    state.get_sales_by_zone().await
}

#[tauri::command]
pub async fn get_total_sales(state: State<'_, AppState>) -> Result<f64, String> {
    state.get_total_sales().await
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SearchOrdersRequest {
    pub search: Option<String>,
    pub fecha_from: Option<String>,
    pub fecha_to: Option<String>,
    pub zona: Option<String>,
}

#[tauri::command]
pub async fn search_orders(
    request: SearchOrdersRequest,
    state: State<'_, AppState>,
) -> Result<Vec<Order>, String> {
    state.search_orders(
        request.search.as_deref(),
        request.fecha_from.as_deref(),
        request.fecha_to.as_deref(),
        request.zona.as_deref(),
    ).await
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CreateStockItemRequest {
    pub nombre: String,
    pub cantidad: f64,
    pub unidad: String,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct IngredienteInput {
    pub stock_item_id: i32,
    pub cantidad: f64,
}

#[tauri::command]
pub async fn create_stock_item(
    request: CreateStockItemRequest,
    state: State<'_, AppState>,
) -> Result<i32, String> {
    state.create_stock_item(&request.nombre, request.cantidad, &request.unidad).await
}

#[tauri::command]
pub async fn get_stock_items(state: State<'_, AppState>) -> Result<Vec<StockItem>, String> {
    state.get_stock_items().await
}

#[tauri::command]
pub async fn update_stock_item(
    id: i32,
    request: CreateStockItemRequest,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.update_stock_item(id, &request.nombre, request.cantidad, &request.unidad).await
}

#[tauri::command]
pub async fn delete_stock_item(id: i32, state: State<'_, AppState>) -> Result<(), String> {
    state.delete_stock_item(id).await
}

#[tauri::command]
pub async fn get_item_ingredientes(
    item_id: i32,
    state: State<'_, AppState>,
) -> Result<Vec<ItemIngrediente>, String> {
    state.get_item_ingredientes(item_id).await
}

#[tauri::command]
pub async fn set_item_ingredientes(
    item_id: i32,
    ingredientes: Vec<IngredienteInput>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let pairs: Vec<(i32, f64)> = ingredientes.iter().map(|i| (i.stock_item_id, i.cantidad)).collect();
    state.set_item_ingredientes(item_id, &pairs).await
}

#[tauri::command]
pub fn print_order(
    numero: i32,
    items: String,
    total: f64,
    zona: String,
    hora: String,
    metodo_pago: String,
    port: String,
) -> Result<String, String> {
    let order = crate::printer::OrderReceipt {
        numero,
        items,
        total,
        zona,
        hora,
        metodo_pago,
    };

    crate::printer::print_order(order, &port)?;
    Ok("Orden impresa exitosamente".to_string())
}

#[tauri::command]
pub fn get_printer_ports() -> Result<Vec<String>, String> {
    crate::printer::get_available_ports()
}

#[tauri::command]
pub async fn export_backup(
    path: String,
    settings: serde_json::Value,
    app_version: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let data = state.export_backup().await?;
    let payload = serde_json::json!({
        "version": "1",
        "app_version": app_version,
        "exported_at": chrono::Utc::now().to_rfc3339(),
        "data": data,
        "settings": settings,
    });
    let json = serde_json::to_string_pretty(&payload).map_err(|e| format!("serialize: {}", e))?;
    std::fs::write(&path, json).map_err(|e| format!("write file: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn import_backup(
    path: String,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let content = std::fs::read_to_string(&path).map_err(|e| format!("read file: {}", e))?;
    let parsed: serde_json::Value = serde_json::from_str(&content).map_err(|e| format!("invalid JSON: {}", e))?;

    let data = parsed.get("data").ok_or_else(|| "Backup inválido: falta 'data'".to_string())?;
    state.import_backup(data).await?;

    Ok(parsed.get("settings").cloned().unwrap_or(serde_json::json!({})))
}
