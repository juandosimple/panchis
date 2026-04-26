use sqlx::sqlite::{SqlitePool, SqlitePoolOptions};
use std::sync::Arc;

pub struct AppState {
    pub db: Arc<SqlitePool>,
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

        AppState {
            db: Arc::new(pool),
        }
    }
}
