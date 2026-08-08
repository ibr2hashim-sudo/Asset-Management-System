import { createPool } from './index.ts';

export async function initDbSchema() {
  const pool = createPool();
  const client = await pool.connect();
  try {
    console.log('Initializing Cloud SQL database tables if not exist...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        uid TEXT UNIQUE,
        username TEXT,
        name TEXT,
        role TEXT,
        department TEXT,
        email TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS departments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sub_departments JSONB DEFAULT '[]'::jsonb
      );

      CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY,
        custom_id TEXT,
        name TEXT NOT NULL,
        department TEXT NOT NULL,
        sub_department TEXT,
        current_quantity INT DEFAULT 0,
        book_quantity INT DEFAULT 0,
        difference INT DEFAULT 0,
        model TEXT,
        serial_number TEXT,
        company TEXT,
        accessories JSONB DEFAULT '[]'::jsonb,
        status TEXT DEFAULT 'working',
        custodian TEXT,
        notes TEXT,
        image TEXT
      );

      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        order_name TEXT,
        department TEXT,
        asset_id TEXT,
        asset_custom_id TEXT,
        asset_name TEXT,
        asset_model TEXT,
        created_at TEXT,
        complaint TEXT,
        status TEXT DEFAULT 'red',
        supervisor_name TEXT,
        initial_report TEXT,
        required_parts TEXT,
        final_report TEXT,
        technician TEXT,
        received_at TEXT,
        completed_at TEXT
      );

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        default_interval_meter INT
      );

      CREATE TABLE IF NOT EXISTS maintenance_logs (
        id TEXT PRIMARY KEY,
        asset_id TEXT NOT NULL,
        category_name TEXT NOT NULL,
        date TEXT NOT NULL,
        work_done TEXT,
        current_meter INT,
        next_meter INT,
        battery_name TEXT,
        battery_model TEXT,
        battery_serial TEXT,
        change_date TEXT,
        notes TEXT
      );
    `);
    console.log('Cloud SQL database tables successfully created or verified.');
  } catch (err) {
    console.error('Error creating Cloud SQL schema tables:', err);
  } finally {
    client.release();
  }
}
