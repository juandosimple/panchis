#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod auth;
mod db;
mod commands;

use tauri::Manager;
use db::AppState;
use commands::{
    register_user, login_user, verify_auth_token,
    create_order, get_orders, get_order, update_order, delete_order,
    create_cliente, get_clientes, get_cliente, update_cliente, delete_cliente,
    create_item, get_items, get_item, update_item, delete_item,
};

#[tokio::main]
async fn main() {
    let context = tauri::generate_context!();
    let app_state = AppState::new().await;

    tauri::Builder::default()
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            register_user,
            login_user,
            verify_auth_token,
            create_order,
            get_orders,
            get_order,
            update_order,
            delete_order,
            create_cliente,
            get_clientes,
            get_cliente,
            update_cliente,
            delete_cliente,
            create_item,
            get_items,
            get_item,
            update_item,
            delete_item,
        ])
        .run(context)
        .expect("error while running tauri application");
}
