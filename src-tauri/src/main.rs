#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod auth;
mod db;
mod commands;

use tauri::Manager;
use db::AppState;
use commands::*;

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
        ])
        .run(context)
        .expect("error while running tauri application");
}
