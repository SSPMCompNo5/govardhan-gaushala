import 'server-only';
// Food Inventory Models and Utilities
import clientPromise from '@/lib/mongo';
import { ObjectId } from 'mongodb';
import '@/lib/initIndexes'; // Initialize database indexes

// Food Types Enum
export const FoodTypes = {
  HAY: 'hay',
  GRASS: 'grass', 
  FODDER: 'fodder',
  SILAGE: 'silage',
  CONCENTRATE: 'concentrate',
  SUPPLEMENT: 'supplement',
  MINERALS: 'minerals',
  VITAMINS: 'vitamins'
};

// Unit Types Enum
export const UnitTypes = {
  KG: 'kg',
  LITERS: 'liters',
  BUNDLES: 'bundles',
  BAGS: 'bags',
  PACKETS: 'packets'
};

// Cow Groups Enum
export const CowGroups = {
  CALVES: 'calves',
  LACTATING: 'lactating',
  DRY: 'dry',
  BULLS: 'bulls',
  SICK: 'sick',
  GENERAL: 'general'
};

// Stock Status Enum
export const StockStatus = {
  HEALTHY: 'healthy',
  LOW: 'low',
  CRITICAL: 'critical',
  OUT_OF_STOCK: 'out_of_stock'
};

// Stock Thresholds (in kg)
export const StockThresholds = {
  [FoodTypes.HAY]: { critical: 100, low: 250 },
  [FoodTypes.GRASS]: { critical: 50, low: 150 },
  [FoodTypes.FODDER]: { critical: 75, low: 200 },
  [FoodTypes.SILAGE]: { critical: 200, low: 500 },
  [FoodTypes.CONCENTRATE]: { critical: 50, low: 150 },
  [FoodTypes.SUPPLEMENT]: { critical: 20, low: 50 },
  [FoodTypes.MINERALS]: { critical: 10, low: 25 },
  [FoodTypes.VITAMINS]: { critical: 5, low: 15 }
};

// Database Collections
export async function getInventoryCollection() {
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);
  return db.collection('foodInventory');
}

export async function getFeedingLogsCollection() {
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);
  return db.collection('feedingLogs');
}

export async function getSuppliersCollection() {
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);
  return db.collection('foodSuppliers');
}

export async function getFeedingScheduleCollection() {
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);
  return db.collection('feedingSchedule');
}

// Utility Functions
export function getStockStatus(foodType, quantity, unit = 'kg') {
  const threshold = StockThresholds[foodType];
  if (!threshold) return StockStatus.HEALTHY;
  
  // Convert to kg for comparison if needed
  let quantityInKg = quantity;
  if (unit === 'liters') {
    quantityInKg = quantity * 1.03; // Approximate conversion
  } else if (unit === 'bundles') {
    quantityInKg = quantity * 5; // Approximate weight per bundle
  } else if (unit === 'bags') {
    quantityInKg = quantity * 25; // Approximate weight per bag
  } else if (unit === 'packets') {
    quantityInKg = quantity * 0.5; // Approximate weight per packet
  }
  
  if (quantityInKg <= 0) return StockStatus.OUT_OF_STOCK;
  // Treat strictly less than critical as critical; exactly at threshold is low
  if (quantityInKg < threshold.critical) return StockStatus.CRITICAL;
  if (quantityInKg <= threshold.low) return StockStatus.LOW;
  return StockStatus.HEALTHY;
}

export function validateInventoryData(data) {
  const errors = [];
  
  if (!data.name || data.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }
  
  if (!data.type || !Object.values(FoodTypes).includes(data.type)) {
    errors.push('Valid food type is required');
  }
  
  if (!data.quantity || data.quantity <= 0) {
    errors.push('Quantity must be greater than 0');
  }
  
  if (!data.unit || !Object.values(UnitTypes).includes(data.unit)) {
    errors.push('Valid unit is required');
  }
  
  if (data.expiryDate && new Date(data.expiryDate) <= new Date()) {
    errors.push('Expiry date must be in the future');
  }
  
  return errors;
}

export function validateFeedingLogData(data) {
  const errors = [];
  
  if (!data.foodType || !Object.values(FoodTypes).includes(data.foodType)) {
    errors.push('Valid food type is required');
  }
  
  if (!data.quantity || data.quantity <= 0) {
    errors.push('Quantity must be greater than 0');
  }
  
  if (!data.unit || !Object.values(UnitTypes).includes(data.unit)) {
    errors.push('Valid unit is required');
  }
  
  if (!data.cowGroup || !Object.values(CowGroups).includes(data.cowGroup)) {
    errors.push('Valid cow group is required');
  }
  
  if (data.wastage && (data.wastage < 0 || data.wastage > data.quantity)) {
    errors.push('Wastage must be between 0 and total quantity');
  }
  
  return errors;
}

export function validateSupplierData(data) {
  const errors = [];
  
  if (!data.name || data.name.trim().length < 2) {
    errors.push('Supplier name must be at least 2 characters long');
  }
  
  if (!data.contactPerson || data.contactPerson.trim().length < 2) {
    errors.push('Contact person name must be at least 2 characters long');
  }
  
  if (!data.phone || !/^[0-9]{10}$/.test(data.phone)) {
    errors.push('Valid 10-digit phone number is required');
  }
  
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Valid email address is required');
  }
  
  return errors;
}

// Schema Definitions for Reference
export const InventorySchema = {
  _id: ObjectId,
  name: String,
  type: String, // FoodTypes enum
  quantity: Number,
  unit: String, // UnitTypes enum
  status: String, // StockStatus enum
  expiryDate: Date,
  supplier: String,
  purchaseDate: Date,
  purchasePrice: Number,
  notes: String,
  createdAt: Date,
  updatedAt: Date
};

export const FeedingLogSchema = {
  _id: ObjectId,
  foodType: String, // FoodTypes enum
  quantity: Number,
  unit: String, // UnitTypes enum
  cowGroup: String, // CowGroups enum
  feedingTime: Date,
  wastage: Number,
  notes: String,
  recordedBy: String,
  createdAt: Date
};

export const SupplierSchema = {
  _id: ObjectId,
  name: String,
  contactPerson: String,
  phone: String,
  email: String,
  address: String,
  foodTypes: [String], // Array of FoodTypes
  rating: Number, // 1-5
  isActive: Boolean,
  lastOrderDate: Date,
  notes: String,
  createdAt: Date,
  updatedAt: Date
};

export const FeedingScheduleSchema = {
  _id: ObjectId,
  time: String, // HH:MM format
  cowGroup: String, // CowGroups enum
  foodType: String, // FoodTypes enum
  quantity: Number,
  unit: String, // UnitTypes enum
  isActive: Boolean,
  daysOfWeek: [Number], // 0-6 (Sunday-Saturday)
  notes: String,
  createdAt: Date,
  updatedAt: Date
};
