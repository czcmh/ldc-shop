import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        // Run schema migrations directly - create all tables
        await db.run(sql`
            -- Products table
            CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                price TEXT NOT NULL,
                compare_at_price TEXT,
                category TEXT,
                image TEXT,
                is_hot INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 1,
                sort_order INTEGER DEFAULT 0,
                purchase_limit INTEGER,
                created_at INTEGER DEFAULT (unixepoch() * 1000)
            );
            
            -- Cards (stock) table
            CREATE TABLE IF NOT EXISTS cards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                card_key TEXT NOT NULL,
                is_used INTEGER DEFAULT 0,
                reserved_order_id TEXT,
                reserved_at INTEGER,
                used_at INTEGER,
                created_at INTEGER DEFAULT (unixepoch() * 1000)
            );
            
            -- Orders table
            CREATE TABLE IF NOT EXISTS orders (
                order_id TEXT PRIMARY KEY,
                product_id TEXT NOT NULL,
                product_name TEXT NOT NULL,
                amount TEXT NOT NULL,
                email TEXT,
                payee TEXT,
                status TEXT DEFAULT 'pending',
                trade_no TEXT,
                card_key TEXT,
                paid_at INTEGER,
                delivered_at INTEGER,
                user_id TEXT,
                username TEXT,
                points_used INTEGER DEFAULT 0,
                quantity INTEGER DEFAULT 1,
                current_payment_id TEXT,
                created_at INTEGER DEFAULT (unixepoch() * 1000)
            );
            
            -- Login users table
            CREATE TABLE IF NOT EXISTS login_users (
                user_id TEXT PRIMARY KEY,
                username TEXT,
                points INTEGER DEFAULT 0,
                is_blocked INTEGER DEFAULT 0,
                created_at INTEGER DEFAULT (unixepoch() * 1000),
                last_login_at INTEGER DEFAULT (unixepoch() * 1000)
            );
            
            -- Daily checkins table
            CREATE TABLE IF NOT EXISTS daily_checkins_v2 (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL REFERENCES login_users(user_id) ON DELETE CASCADE,
                created_at INTEGER DEFAULT (unixepoch() * 1000)
            );
            
            -- Settings table
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at INTEGER DEFAULT (unixepoch() * 1000)
            );
            
            -- Categories table
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                icon TEXT,
                sort_order INTEGER DEFAULT 0,
                created_at INTEGER DEFAULT (unixepoch() * 1000),
                updated_at INTEGER DEFAULT (unixepoch() * 1000)
            );
            CREATE UNIQUE INDEX IF NOT EXISTS categories_name_uq ON categories(name);
            
            -- Reviews table
            CREATE TABLE IF NOT EXISTS reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                order_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                username TEXT NOT NULL,
                rating INTEGER NOT NULL,
                comment TEXT,
                created_at INTEGER DEFAULT (unixepoch() * 1000)
            );
            
            -- Refund requests table
            CREATE TABLE IF NOT EXISTS refund_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id TEXT NOT NULL,
                user_id TEXT,
                username TEXT,
                reason TEXT,
                status TEXT DEFAULT 'pending',
                admin_username TEXT,
                admin_note TEXT,
                created_at INTEGER DEFAULT (unixepoch() * 1000),
                updated_at INTEGER DEFAULT (unixepoch() * 1000),
                processed_at INTEGER
            );
            
            -- Fix null is_used values
            UPDATE cards SET is_used = 0 WHERE is_used IS NULL;
        `);

        // Add columns to existing tables (SQLite doesn't support IF NOT EXISTS for columns)
        const safeAddColumn = async (table: string, column: string, definition: string) => {
            try {
                await db.run(sql.raw(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`));
            } catch {
                // Column already exists, ignore
            }
        };

        // Products columns
        await safeAddColumn('products', 'compare_at_price', 'TEXT');
        await safeAddColumn('products', 'is_hot', 'INTEGER DEFAULT 0');

        // Orders columns
        await safeAddColumn('orders', 'points_used', 'INTEGER DEFAULT 0');
        await safeAddColumn('orders', 'quantity', 'INTEGER DEFAULT 1');
        await safeAddColumn('orders', 'current_payment_id', 'TEXT');
        await safeAddColumn('orders', 'payee', 'TEXT');

        // Cards columns
        await safeAddColumn('cards', 'reserved_order_id', 'TEXT');
        await safeAddColumn('cards', 'reserved_at', 'INTEGER');

        // Login users columns
        await safeAddColumn('login_users', 'points', 'INTEGER DEFAULT 0');
        await safeAddColumn('login_users', 'is_blocked', 'INTEGER DEFAULT 0');

        return NextResponse.json({ success: true, message: "Database initialized successfully" });
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
