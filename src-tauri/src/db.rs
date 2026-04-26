use sqlx::sqlite::{SqlitePool, SqlitePoolOptions};
use sqlx::Row;
use std::sync::Arc;
use serde::{Deserialize, Serialize};

pub struct AppState {
    pub db: Arc<SqlitePool>,
}

#[derive(Debug)]
pub struct User {
    pub id: i32,
    pub username: String,
    pub password_hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Order {
    pub id: i32,
    pub cliente: String,
    pub items: String,
    pub precio: f64,
    pub fecha: String,
    pub hora: String,
    pub zona: String,
}

impl AppState {
    pub async fn new() -> Self {
        let database_url = "sqlite:panchis.db";

        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect(database_url)
            .await
            .expect("Failed to create pool");

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            "#,
        )
        .execute(&pool)
        .await
        .expect("Failed to create users table");

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cliente TEXT NOT NULL,
                items TEXT NOT NULL,
                precio REAL NOT NULL,
                fecha TEXT NOT NULL,
                hora TEXT NOT NULL,
                zona TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            "#,
        )
        .execute(&pool)
        .await
        .expect("Failed to create orders table");

        AppState {
            db: Arc::new(pool),
        }
    }

    pub async fn create_user(&self, username: &str, password_hash: &str) -> Result<i32, String> {
        let result = sqlx::query(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)"
        )
        .bind(username)
        .bind(password_hash)
        .execute(self.db.as_ref())
        .await
        .map_err(|e| format!("Error creating user: {}", e))?;

        Ok(result.last_insert_rowid() as i32)
    }

    pub async fn get_user_by_username(&self, username: &str) -> Result<Option<User>, String> {
        let user = sqlx::query_as::<_, (i32, String, String)>(
            "SELECT id, username, password_hash FROM users WHERE username = ?"
        )
        .bind(username)
        .fetch_optional(self.db.as_ref())
        .await
        .map_err(|e| format!("Database error: {}", e))?;

        Ok(user.map(|(id, username, password_hash)| User {
            id,
            username,
            password_hash,
        }))
    }

    pub async fn create_order(
        &self,
        cliente: &str,
        items: &str,
        precio: f64,
        fecha: &str,
        hora: &str,
        zona: &str,
    ) -> Result<i32, String> {
        let result = sqlx::query(
            "INSERT INTO orders (cliente, items, precio, fecha, hora, zona) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .bind(cliente)
        .bind(items)
        .bind(precio)
        .bind(fecha)
        .bind(hora)
        .bind(zona)
        .execute(self.db.as_ref())
        .await
        .map_err(|e| format!("Error creating order: {}", e))?;

        Ok(result.last_insert_rowid() as i32)
    }

    pub async fn get_orders(&self) -> Result<Vec<Order>, String> {
        let orders = sqlx::query_as::<_, (i32, String, String, f64, String, String, String)>(
            "SELECT id, cliente, items, precio, fecha, hora, zona FROM orders ORDER BY created_at DESC"
        )
        .fetch_all(self.db.as_ref())
        .await
        .map_err(|e| format!("Database error: {}", e))?;

        Ok(orders.into_iter().map(|(id, cliente, items, precio, fecha, hora, zona)| Order {
            id,
            cliente,
            items,
            precio,
            fecha,
            hora,
            zona,
        }).collect())
    }

    pub async fn get_order(&self, id: i32) -> Result<Option<Order>, String> {
        let order = sqlx::query_as::<_, (i32, String, String, f64, String, String, String)>(
            "SELECT id, cliente, items, precio, fecha, hora, zona FROM orders WHERE id = ?"
        )
        .bind(id)
        .fetch_optional(self.db.as_ref())
        .await
        .map_err(|e| format!("Database error: {}", e))?;

        Ok(order.map(|(id, cliente, items, precio, fecha, hora, zona)| Order {
            id,
            cliente,
            items,
            precio,
            fecha,
            hora,
            zona,
        }))
    }

    pub async fn update_order(
        &self,
        id: i32,
        cliente: &str,
        items: &str,
        precio: f64,
        fecha: &str,
        hora: &str,
        zona: &str,
    ) -> Result<(), String> {
        sqlx::query(
            "UPDATE orders SET cliente = ?, items = ?, precio = ?, fecha = ?, hora = ?, zona = ? WHERE id = ?"
        )
        .bind(cliente)
        .bind(items)
        .bind(precio)
        .bind(fecha)
        .bind(hora)
        .bind(zona)
        .bind(id)
        .execute(self.db.as_ref())
        .await
        .map_err(|e| format!("Error updating order: {}", e))?;

        Ok(())
    }

    pub async fn delete_order(&self, id: i32) -> Result<(), String> {
        sqlx::query("DELETE FROM orders WHERE id = ?")
            .bind(id)
            .execute(self.db.as_ref())
            .await
            .map_err(|e| format!("Error deleting order: {}", e))?;

        Ok(())
    }
}
