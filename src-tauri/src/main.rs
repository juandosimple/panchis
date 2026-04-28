#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod auth;
mod db;
mod commands;
mod printer;

use db::AppState;
use commands::{
    register_user, login_user, verify_auth_token,
    create_order, get_orders, get_order, update_order, delete_order,
    create_cliente, get_clientes, get_cliente, update_cliente, delete_cliente,
    create_item, get_items, get_item, update_item, delete_item,
    get_daily_sales, get_sales_by_zone, get_total_sales,
    search_orders, print_order, get_printer_ports,
    create_stock_item, get_stock_items, update_stock_item, delete_stock_item,
    get_item_ingredientes, set_item_ingredientes,
    export_backup, import_backup,
};

#[tokio::main]
async fn main() {
    let context = tauri::generate_context!();
    let app_state = AppState::new().await;

    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
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
            get_daily_sales,
            get_sales_by_zone,
            get_total_sales,
            search_orders,
            print_order,
            get_printer_ports,
            create_stock_item,
            get_stock_items,
            update_stock_item,
            delete_stock_item,
            get_item_ingredientes,
            set_item_ingredientes,
            export_backup,
            import_backup,
        ])
        .run(context)
        .expect("error while running tauri application");
}
