use sqlx::sqlite::{SqlitePool, SqlitePoolOptions, SqliteConnectOptions};
use std::sync::Arc;
use std::str::FromStr;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailySales {
    pub fecha: String,
    pub total: f64,
    pub cantidad: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZoneSales {
    pub zona: String,
    pub total: f64,
    pub cantidad: i32,
}

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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Cliente {
    pub id: i32,
    pub nombre: String,
    pub telefono: String,
    pub direccion: String,
    pub zona: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Item {
    pub id: i32,
    pub nombre: String,
    pub precio: f64,
    pub descripcion: String,
}

impl AppState {
    pub async fn new() -> Self {
        let database_url = "sqlite:panchis.db?mode=rwc";

        let connect_options = SqliteConnectOptions::from_str(database_url)
            .expect("Failed to create connect options")
            .create_if_missing(true);

        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect_with(connect_options)
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

        // Crear usuario admin por defecto
        let user_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM users")
            .fetch_one(&pool)
            .await
            .unwrap_or(0);

        if user_count == 0 {
            // Generar hash para la contraseña "panchis" (contraseña por defecto)
            use crate::auth::hash_password;
            if let Ok(admin_hash) = hash_password("panchis") {
                let _ = sqlx::query(
                    "INSERT INTO users (username, password_hash) VALUES (?, ?)"
                )
                .bind("admin")
                .bind(&admin_hash)
                .execute(&pool)
                .await;
            }
        }

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

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS clientes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                telefono TEXT,
                direccion TEXT,
                zona TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            "#,
        )
        .execute(&pool)
        .await
        .expect("Failed to create clientes table");

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                precio REAL NOT NULL,
                descripcion TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            "#,
        )
        .execute(&pool)
        .await
        .expect("Failed to create items table");

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

    pub async fn create_cliente(
        &self,
        nombre: &str,
        telefono: &str,
        direccion: &str,
        zona: &str,
    ) -> Result<i32, String> {
        let result = sqlx::query(
            "INSERT INTO clientes (nombre, telefono, direccion, zona) VALUES (?, ?, ?, ?)"
        )
        .bind(nombre)
        .bind(telefono)
        .bind(direccion)
        .bind(zona)
        .execute(self.db.as_ref())
        .await
        .map_err(|e| format!("Error creating cliente: {}", e))?;

        Ok(result.last_insert_rowid() as i32)
    }

    pub async fn get_clientes(&self) -> Result<Vec<Cliente>, String> {
        let clientes = sqlx::query_as::<_, (i32, String, String, String, String)>(
            "SELECT id, nombre, telefono, direccion, zona FROM clientes ORDER BY nombre"
        )
        .fetch_all(self.db.as_ref())
        .await
        .map_err(|e| format!("Database error: {}", e))?;

        Ok(clientes.into_iter().map(|(id, nombre, telefono, direccion, zona)| Cliente {
            id,
            nombre,
            telefono,
            direccion,
            zona,
        }).collect())
    }

    pub async fn get_cliente(&self, id: i32) -> Result<Option<Cliente>, String> {
        let cliente = sqlx::query_as::<_, (i32, String, String, String, String)>(
            "SELECT id, nombre, telefono, direccion, zona FROM clientes WHERE id = ?"
        )
        .bind(id)
        .fetch_optional(self.db.as_ref())
        .await
        .map_err(|e| format!("Database error: {}", e))?;

        Ok(cliente.map(|(id, nombre, telefono, direccion, zona)| Cliente {
            id,
            nombre,
            telefono,
            direccion,
            zona,
        }))
    }

    pub async fn update_cliente(
        &self,
        id: i32,
        nombre: &str,
        telefono: &str,
        direccion: &str,
        zona: &str,
    ) -> Result<(), String> {
        sqlx::query(
            "UPDATE clientes SET nombre = ?, telefono = ?, direccion = ?, zona = ? WHERE id = ?"
        )
        .bind(nombre)
        .bind(telefono)
        .bind(direccion)
        .bind(zona)
        .bind(id)
        .execute(self.db.as_ref())
        .await
        .map_err(|e| format!("Error updating cliente: {}", e))?;

        Ok(())
    }

    pub async fn delete_cliente(&self, id: i32) -> Result<(), String> {
        sqlx::query("DELETE FROM clientes WHERE id = ?")
            .bind(id)
            .execute(self.db.as_ref())
            .await
            .map_err(|e| format!("Error deleting cliente: {}", e))?;

        Ok(())
    }

    pub async fn create_item(
        &self,
        nombre: &str,
        precio: f64,
        descripcion: &str,
    ) -> Result<i32, String> {
        let result = sqlx::query(
            "INSERT INTO items (nombre, precio, descripcion) VALUES (?, ?, ?)"
        )
        .bind(nombre)
        .bind(precio)
        .bind(descripcion)
        .execute(self.db.as_ref())
        .await
        .map_err(|e| format!("Error creating item: {}", e))?;

        Ok(result.last_insert_rowid() as i32)
    }

    pub async fn get_items(&self) -> Result<Vec<Item>, String> {
        let items = sqlx::query_as::<_, (i32, String, f64, String)>(
            "SELECT id, nombre, precio, descripcion FROM items ORDER BY nombre"
        )
        .fetch_all(self.db.as_ref())
        .await
        .map_err(|e| format!("Database error: {}", e))?;

        Ok(items.into_iter().map(|(id, nombre, precio, descripcion)| Item {
            id,
            nombre,
            precio,
            descripcion,
        }).collect())
    }

    pub async fn get_item(&self, id: i32) -> Result<Option<Item>, String> {
        let item = sqlx::query_as::<_, (i32, String, f64, String)>(
            "SELECT id, nombre, precio, descripcion FROM items WHERE id = ?"
        )
        .bind(id)
        .fetch_optional(self.db.as_ref())
        .await
        .map_err(|e| format!("Database error: {}", e))?;

        Ok(item.map(|(id, nombre, precio, descripcion)| Item {
            id,
            nombre,
            precio,
            descripcion,
        }))
    }

    pub async fn update_item(
        &self,
        id: i32,
        nombre: &str,
        precio: f64,
        descripcion: &str,
    ) -> Result<(), String> {
        sqlx::query(
            "UPDATE items SET nombre = ?, precio = ?, descripcion = ? WHERE id = ?"
        )
        .bind(nombre)
        .bind(precio)
        .bind(descripcion)
        .bind(id)
        .execute(self.db.as_ref())
        .await
        .map_err(|e| format!("Error updating item: {}", e))?;

        Ok(())
    }

    pub async fn delete_item(&self, id: i32) -> Result<(), String> {
        sqlx::query("DELETE FROM items WHERE id = ?")
            .bind(id)
            .execute(self.db.as_ref())
            .await
            .map_err(|e| format!("Error deleting item: {}", e))?;

        Ok(())
    }

    pub async fn get_daily_sales(&self) -> Result<Vec<DailySales>, String> {
        let results = sqlx::query_as::<_, (String, f64, i64)>(
            "SELECT fecha, SUM(precio) as total, COUNT(*) as cantidad FROM orders GROUP BY fecha ORDER BY fecha DESC"
        )
        .fetch_all(self.db.as_ref())
        .await
        .map_err(|e| format!("Database error: {}", e))?;

        Ok(results.into_iter().map(|(fecha, total, cantidad)| DailySales {
            fecha,
            total,
            cantidad: cantidad as i32,
        }).collect())
    }

    pub async fn get_sales_by_zone(&self) -> Result<Vec<ZoneSales>, String> {
        let results = sqlx::query_as::<_, (String, f64, i64)>(
            "SELECT zona, SUM(precio) as total, COUNT(*) as cantidad FROM orders GROUP BY zona ORDER BY total DESC"
        )
        .fetch_all(self.db.as_ref())
        .await
        .map_err(|e| format!("Database error: {}", e))?;

        Ok(results.into_iter().map(|(zona, total, cantidad)| ZoneSales {
            zona,
            total,
            cantidad: cantidad as i32,
        }).collect())
    }

    pub async fn get_total_sales(&self) -> Result<f64, String> {
        let result = sqlx::query_scalar::<_, f64>(
            "SELECT COALESCE(SUM(precio), 0.0) FROM orders"
        )
        .fetch_one(self.db.as_ref())
        .await
        .map_err(|e| format!("Database error: {}", e))?;

        Ok(result)
    }

    pub async fn search_orders(
        &self,
        search: Option<&str>,
        fecha_from: Option<&str>,
        fecha_to: Option<&str>,
        zona: Option<&str>,
    ) -> Result<Vec<Order>, String> {
        let mut query = "SELECT id, cliente, items, precio, fecha, hora, zona FROM orders WHERE 1=1".to_string();

        if let Some(s) = search {
            query.push_str(&format!(" AND (cliente LIKE '%{}%' OR items LIKE '%{}%')", s, s));
        }

        if let Some(f) = fecha_from {
            query.push_str(&format!(" AND fecha >= '{}'", f));
        }

        if let Some(f) = fecha_to {
            query.push_str(&format!(" AND fecha <= '{}'", f));
        }

        if let Some(z) = zona {
            query.push_str(&format!(" AND zona = '{}'", z));
        }

        query.push_str(" ORDER BY created_at DESC");

        let orders = sqlx::query_as::<_, (i32, String, String, f64, String, String, String)>(
            &query
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
}
