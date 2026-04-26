use sqlx::sqlite::{SqlitePool, SqlitePoolOptions};
use sqlx::Row;
use std::sync::Arc;

pub struct AppState {
    pub db: Arc<SqlitePool>,
}

#[derive(Debug)]
pub struct User {
    pub id: i32,
    pub username: String,
    pub password_hash: String,
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
}
