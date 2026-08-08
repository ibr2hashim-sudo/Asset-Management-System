import { pgTable, text, integer, jsonb, timestamp, serial } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').unique(),
  username: text('username'),
  name: text('name'),
  role: text('role'),
  department: text('department'),
  email: text('email'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const departments = pgTable('departments', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  subDepartments: jsonb('sub_departments').$type<string[]>().default([]),
});

export const assets = pgTable('assets', {
  id: text('id').primaryKey(),
  customId: text('custom_id'),
  name: text('name').notNull(),
  department: text('department').notNull(),
  subDepartment: text('sub_department'),
  currentQuantity: integer('current_quantity').default(0),
  bookQuantity: integer('book_quantity').default(0),
  difference: integer('difference').default(0),
  model: text('model'),
  serialNumber: text('serial_number'),
  company: text('company'),
  accessories: jsonb('accessories').$type<string[]>().default([]),
  status: text('status').default('working'),
  custodian: text('custodian'),
  notes: text('notes'),
  image: text('image'),
});

export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  orderName: text('order_name'),
  department: text('department'),
  assetId: text('asset_id'),
  assetCustomId: text('asset_custom_id'),
  assetName: text('asset_name'),
  assetModel: text('asset_model'),
  createdAt: text('created_at'),
  complaint: text('complaint'),
  status: text('status').default('red'),
  supervisorName: text('supervisor_name'),
  initialReport: text('initial_report'),
  requiredParts: text('required_parts'),
  finalReport: text('final_report'),
  technician: text('technician'),
  receivedAt: text('received_at'),
  completedAt: text('completed_at'),
});

export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  defaultIntervalMeter: integer('default_interval_meter'),
});

export const maintenanceLogs = pgTable('maintenance_logs', {
  id: text('id').primaryKey(),
  assetId: text('asset_id').notNull(),
  categoryName: text('category_name').notNull(),
  date: text('date').notNull(),
  workDone: text('work_done'),
  currentMeter: integer('current_meter'),
  nextMeter: integer('next_meter'),
  batteryName: text('battery_name'),
  batteryModel: text('battery_model'),
  batterySerial: text('battery_serial'),
  changeDate: text('change_date'),
  notes: text('notes'),
});
