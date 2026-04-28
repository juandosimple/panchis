use sqlx::sqlite::{SqlitePool, SqlitePoolOptions, SqliteConnectOptions};
use std::sync::Arc;
use std::str::FromStr;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

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
    pub categoria: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StockItem {
    pub id: i32,
    pub nombre: String,
    pub cantidad: f64,
    pub unidad: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemIngrediente {
    pub stock_item_id: i32,
    pub nombre: String,
    pub cantidad: f64,
    pub unidad: String,
}

impl AppState {
    fn get_db_path() -> PathBuf {
        let data_dir = dirs::data_dir()
            .unwrap_or_else(|| PathBuf::from("."));
        data_dir.join("panchis").join("panchis.db")
    }

    pub async fn new() -> Self {
        let db_path = Self::get_db_path();
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent).expect("Failed to create app data directory");
        }
        let database_url = format!("sqlite:{}?mode=rwc", db_path.display());

        let connect_options = SqliteConnectOptions::from_str(&database_url)
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
                categoria TEXT NOT NULL DEFAULT 'General',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            "#,
        )
        .execute(&pool)
        .await
        .expect("Failed to create items table");

        let _ = sqlx::query("ALTER TABLE items ADD COLUMN categoria TEXT NOT NULL DEFAULT 'General'")
            .execute(&pool)
            .await;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS stock_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                cantidad REAL NOT NULL DEFAULT 0,
                unidad TEXT NOT NULL DEFAULT 'unidades'
            )
            "#,
        )
        .execute(&pool)
        .await
        .expect("Failed to create stock_items table");

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS item_ingredientes (
                item_id INTEGER NOT NULL,
                stock_item_id INTEGER NOT NULL,
                cantidad REAL NOT NULL DEFAULT 1,
                PRIMARY KEY (item_id, stock_item_id),
                FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
                FOREIGN KEY (stock_item_id) REFERENCES stock_items(id) ON DELETE CASCADE
            )
            "#,
        )
        .execute(&pool)
        .await
        .expect("Failed to create item_ingredientes table");

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
        items_vendidos: &[(i32, f64)],
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

        let order_id = result.last_insert_rowid() as i32;

        // Decrement stock — don't fail the order if stock update errors
        let _ = self.descontar_stock_por_venta(items_vendidos).await;

        Ok(order_id)
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
        categoria: &str,
    ) -> Result<i32, String> {
        let result = sqlx::query(
            "INSERT INTO items (nombre, precio, descripcion, categoria) VALUES (?, ?, ?, ?)"
        )
        .bind(nombre)
        .bind(precio)
        .bind(descripcion)
        .bind(categoria)
        .execute(self.db.as_ref())
        .await
        .map_err(|e| format!("Error creating item: {}", e))?;

        Ok(result.last_insert_rowid() as i32)
    }

    pub async fn get_items(&self) -> Result<Vec<Item>, String> {
        let items = sqlx::query_as::<_, (i32, String, f64, String, String)>(
            "SELECT id, nombre, precio, descripcion, categoria FROM items ORDER BY nombre"
        )
        .fetch_all(self.db.as_ref())
        .await
        .map_err(|e| format!("Database error: {}", e))?;

        Ok(items.into_iter().map(|(id, nombre, precio, descripcion, categoria)| Item {
            id,
            nombre,
            precio,
            descripcion,
            categoria,
        }).collect())
    }

    pub async fn get_item(&self, id: i32) -> Result<Option<Item>, String> {
        let item = sqlx::query_as::<_, (i32, String, f64, String, String)>(
            "SELECT id, nombre, precio, descripcion, categoria FROM items WHERE id = ?"
        )
        .bind(id)
        .fetch_optional(self.db.as_ref())
        .await
        .map_err(|e| format!("Database error: {}", e))?;

        Ok(item.map(|(id, nombre, precio, descripcion, categoria)| Item {
            id,
            nombre,
            precio,
            descripcion,
            categoria,
        }))
    }

    pub async fn update_item(
        &self,
        id: i32,
        nombre: &str,
        precio: f64,
        descripcion: &str,
        categoria: &str,
    ) -> Result<(), String> {
        sqlx::query(
            "UPDATE items SET nombre = ?, precio = ?, descripcion = ?, categoria = ? WHERE id = ?"
        )
        .bind(nombre)
        .bind(precio)
        .bind(descripcion)
        .bind(categoria)
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

    pub async fn create_stock_item(&self, nombre: &str, cantidad: f64, unidad: &str) -> Result<i32, String> {
        let result = sqlx::query(
            "INSERT INTO stock_items (nombre, cantidad, unidad) VALUES (?, ?, ?)"
        )
        .bind(nombre)
        .bind(cantidad)
        .bind(unidad)
        .execute(self.db.as_ref())
        .await
        .map_err(|e| format!("Error creating stock item: {}", e))?;
        Ok(result.last_insert_rowid() as i32)
    }

    pub async fn get_stock_items(&self) -> Result<Vec<StockItem>, String> {
        let rows = sqlx::query_as::<_, (i32, String, f64, String)>(
            "SELECT id, nombre, cantidad, unidad FROM stock_items ORDER BY nombre"
        )
        .fetch_all(self.db.as_ref())
        .await
        .map_err(|e| format!("Database error: {}", e))?;

        Ok(rows.into_iter().map(|(id, nombre, cantidad, unidad)| StockItem {
            id, nombre, cantidad, unidad,
        }).collect())
    }

    pub async fn update_stock_item(&self, id: i32, nombre: &str, cantidad: f64, unidad: &str) -> Result<(), String> {
        sqlx::query("UPDATE stock_items SET nombre = ?, cantidad = ?, unidad = ? WHERE id = ?")
            .bind(nombre)
            .bind(cantidad)
            .bind(unidad)
            .bind(id)
            .execute(self.db.as_ref())
            .await
            .map_err(|e| format!("Error updating stock item: {}", e))?;
        Ok(())
    }

    pub async fn delete_stock_item(&self, id: i32) -> Result<(), String> {
        sqlx::query("DELETE FROM stock_items WHERE id = ?")
            .bind(id)
            .execute(self.db.as_ref())
            .await
            .map_err(|e| format!("Error deleting stock item: {}", e))?;
        Ok(())
    }

    pub async fn get_item_ingredientes(&self, item_id: i32) -> Result<Vec<ItemIngrediente>, String> {
        let rows = sqlx::query_as::<_, (i32, String, f64, String)>(
            "SELECT s.id, s.nombre, ii.cantidad, s.unidad
             FROM item_ingredientes ii
             JOIN stock_items s ON ii.stock_item_id = s.id
             WHERE ii.item_id = ?
             ORDER BY s.nombre"
        )
        .bind(item_id)
        .fetch_all(self.db.as_ref())
        .await
        .map_err(|e| format!("Database error: {}", e))?;

        Ok(rows.into_iter().map(|(stock_item_id, nombre, cantidad, unidad)| ItemIngrediente {
            stock_item_id, nombre, cantidad, unidad,
        }).collect())
    }

    pub async fn set_item_ingredientes(&self, item_id: i32, ingredientes: &[(i32, f64)]) -> Result<(), String> {
        sqlx::query("DELETE FROM item_ingredientes WHERE item_id = ?")
            .bind(item_id)
            .execute(self.db.as_ref())
            .await
            .map_err(|e| format!("Error clearing ingredientes: {}", e))?;

        for &(stock_item_id, cantidad) in ingredientes {
            sqlx::query(
                "INSERT INTO item_ingredientes (item_id, stock_item_id, cantidad) VALUES (?, ?, ?)"
            )
            .bind(item_id)
            .bind(stock_item_id)
            .bind(cantidad)
            .execute(self.db.as_ref())
            .await
            .map_err(|e| format!("Error inserting ingrediente: {}", e))?;
        }
        Ok(())
    }

    pub async fn descontar_stock_por_venta(&self, items_vendidos: &[(i32, f64)]) -> Result<(), String> {
        for &(item_id, qty_vendida) in items_vendidos {
            let ingredientes = self.get_item_ingredientes(item_id).await?;
            for ing in ingredientes {
                sqlx::query(
                    "UPDATE stock_items SET cantidad = cantidad - ? WHERE id = ?"
                )
                .bind(qty_vendida * ing.cantidad)
                .bind(ing.stock_item_id)
                .execute(self.db.as_ref())
                .await
                .map_err(|e| format!("Error decrementing stock: {}", e))?;
            }
        }
        Ok(())
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

    pub async fn export_backup(&self) -> Result<serde_json::Value, String> {
        let orders = self.get_orders().await?;
        let clientes = self.get_clientes().await?;
        let items = self.get_items().await?;
        let stock = self.get_stock_items().await?;

        let ingredientes_rows: Vec<(i32, i32, f64)> = sqlx::query_as(
            "SELECT item_id, stock_item_id, cantidad FROM item_ingredientes"
        )
        .fetch_all(self.db.as_ref())
        .await
        .map_err(|e| format!("Database error: {}", e))?;

        let ingredientes: Vec<serde_json::Value> = ingredientes_rows
            .into_iter()
            .map(|(item_id, stock_item_id, cantidad)| serde_json::json!({
                "item_id": item_id,
                "stock_item_id": stock_item_id,
                "cantidad": cantidad,
            }))
            .collect();

        Ok(serde_json::json!({
            "orders": orders,
            "clientes": clientes,
            "items": items,
            "stock_items": stock,
            "item_ingredientes": ingredientes,
        }))
    }

    pub async fn import_backup(&self, data: &serde_json::Value) -> Result<(), String> {
        let mut tx = self.db.begin().await.map_err(|e| format!("tx begin: {}", e))?;

        // Wipe tables (preserve users so admin login still works)
        for table in &["item_ingredientes", "stock_items", "items", "clientes", "orders"] {
            sqlx::query(&format!("DELETE FROM {}", table))
                .execute(&mut *tx)
                .await
                .map_err(|e| format!("clear {}: {}", table, e))?;
            sqlx::query("DELETE FROM sqlite_sequence WHERE name = ?")
                .bind(*table)
                .execute(&mut *tx)
                .await
                .ok();
        }

        if let Some(arr) = data.get("orders").and_then(|v| v.as_array()) {
            for o in arr {
                sqlx::query(
                    "INSERT INTO orders (id, cliente, items, precio, fecha, hora, zona) VALUES (?, ?, ?, ?, ?, ?, ?)"
                )
                .bind(o.get("id").and_then(|v| v.as_i64()).unwrap_or(0) as i32)
                .bind(o.get("cliente").and_then(|v| v.as_str()).unwrap_or(""))
                .bind(o.get("items").and_then(|v| v.as_str()).unwrap_or(""))
                .bind(o.get("precio").and_then(|v| v.as_f64()).unwrap_or(0.0))
                .bind(o.get("fecha").and_then(|v| v.as_str()).unwrap_or(""))
                .bind(o.get("hora").and_then(|v| v.as_str()).unwrap_or(""))
                .bind(o.get("zona").and_then(|v| v.as_str()).unwrap_or(""))
                .execute(&mut *tx)
                .await
                .map_err(|e| format!("insert order: {}", e))?;
            }
        }

        if let Some(arr) = data.get("clientes").and_then(|v| v.as_array()) {
            for c in arr {
                sqlx::query(
                    "INSERT INTO clientes (id, nombre, telefono, direccion, zona) VALUES (?, ?, ?, ?, ?)"
                )
                .bind(c.get("id").and_then(|v| v.as_i64()).unwrap_or(0) as i32)
                .bind(c.get("nombre").and_then(|v| v.as_str()).unwrap_or(""))
                .bind(c.get("telefono").and_then(|v| v.as_str()).unwrap_or(""))
                .bind(c.get("direccion").and_then(|v| v.as_str()).unwrap_or(""))
                .bind(c.get("zona").and_then(|v| v.as_str()).unwrap_or(""))
                .execute(&mut *tx)
                .await
                .map_err(|e| format!("insert cliente: {}", e))?;
            }
        }

        if let Some(arr) = data.get("items").and_then(|v| v.as_array()) {
            for i in arr {
                sqlx::query(
                    "INSERT INTO items (id, nombre, precio, descripcion, categoria) VALUES (?, ?, ?, ?, ?)"
                )
                .bind(i.get("id").and_then(|v| v.as_i64()).unwrap_or(0) as i32)
                .bind(i.get("nombre").and_then(|v| v.as_str()).unwrap_or(""))
                .bind(i.get("precio").and_then(|v| v.as_f64()).unwrap_or(0.0))
                .bind(i.get("descripcion").and_then(|v| v.as_str()).unwrap_or(""))
                .bind(i.get("categoria").and_then(|v| v.as_str()).unwrap_or("General"))
                .execute(&mut *tx)
                .await
                .map_err(|e| format!("insert item: {}", e))?;
            }
        }

        if let Some(arr) = data.get("stock_items").and_then(|v| v.as_array()) {
            for s in arr {
                sqlx::query(
                    "INSERT INTO stock_items (id, nombre, cantidad, unidad) VALUES (?, ?, ?, ?)"
                )
                .bind(s.get("id").and_then(|v| v.as_i64()).unwrap_or(0) as i32)
                .bind(s.get("nombre").and_then(|v| v.as_str()).unwrap_or(""))
                .bind(s.get("cantidad").and_then(|v| v.as_f64()).unwrap_or(0.0))
                .bind(s.get("unidad").and_then(|v| v.as_str()).unwrap_or("unidades"))
                .execute(&mut *tx)
                .await
                .map_err(|e| format!("insert stock: {}", e))?;
            }
        }

        if let Some(arr) = data.get("item_ingredientes").and_then(|v| v.as_array()) {
            for ing in arr {
                sqlx::query(
                    "INSERT INTO item_ingredientes (item_id, stock_item_id, cantidad) VALUES (?, ?, ?)"
                )
                .bind(ing.get("item_id").and_then(|v| v.as_i64()).unwrap_or(0) as i32)
                .bind(ing.get("stock_item_id").and_then(|v| v.as_i64()).unwrap_or(0) as i32)
                .bind(ing.get("cantidad").and_then(|v| v.as_f64()).unwrap_or(1.0))
                .execute(&mut *tx)
                .await
                .map_err(|e| format!("insert ingrediente: {}", e))?;
            }
        }

        tx.commit().await.map_err(|e| format!("commit: {}", e))?;
        Ok(())
    }
}
