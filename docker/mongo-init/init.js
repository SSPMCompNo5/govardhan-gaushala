// MongoDB initialization script
// This script runs when the MongoDB container starts for the first time

// Switch to the goshala database
db = db.getSiblingDB('goshala');

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'email', 'role'],
      properties: {
        name: { bsonType: 'string' },
        email: { bsonType: 'string', pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$' },
        role: { 
          bsonType: 'string',
          enum: ['Owner/Admin', 'Goshala Manager', 'Food Manager', 'Cow Manager', 'Doctor', 'Watchman']
        },
        password: { bsonType: 'string' },
        active: { bsonType: 'bool' },
        lastLogin: { bsonType: 'date' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' }
      }
    }
  }
});

db.createCollection('gate_logs', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['type', 'at', 'actor'],
      properties: {
        type: { 
          bsonType: 'string',
          enum: ['entry', 'exit', 'incident']
        },
        at: { bsonType: 'date' },
        actor: { bsonType: 'string' },
        visitorName: { bsonType: 'string' },
        visitorPhone: { bsonType: 'string' },
        visitorAddress: { bsonType: 'string' },
        plate: { bsonType: 'string' },
        groupSize: { bsonType: 'int' },
        note: { bsonType: 'string' }
      }
    }
  }
});

db.createCollection('foodInventory', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'type', 'quantity', 'unit'],
      properties: {
        name: { bsonType: 'string' },
        type: { 
          bsonType: 'string',
          enum: ['fodder', 'grain', 'supplement', 'medicine', 'other']
        },
        quantity: { bsonType: 'number' },
        unit: { 
          bsonType: 'string',
          enum: ['kg', 'liters', 'pieces', 'bags', 'bales']
        },
        status: { 
          bsonType: 'string',
          enum: ['healthy', 'low', 'critical', 'expired']
        },
        supplier: { bsonType: 'string' },
        expiryDate: { bsonType: 'date' },
        purchaseDate: { bsonType: 'date' },
        cost: { bsonType: 'number' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' }
      }
    }
  }
});

db.createCollection('cows', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'tag'],
      properties: {
        name: { bsonType: 'string' },
        tag: { bsonType: 'string' },
        breed: { bsonType: 'string' },
        age: { bsonType: 'number' },
        weight: { bsonType: 'number' },
        color: { bsonType: 'string' },
        gender: { 
          bsonType: 'string',
          enum: ['male', 'female']
        },
        pregnant: { bsonType: 'bool' },
        group: { bsonType: 'string' },
        photo: { bsonType: 'string' },
        notes: { bsonType: 'string' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' }
      }
    }
  }
});

db.createCollection('treatments', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['cowId', 'type', 'date', 'doctor'],
      properties: {
        cowId: { bsonType: 'objectId' },
        type: { bsonType: 'string' },
        date: { bsonType: 'date' },
        doctor: { bsonType: 'string' },
        diagnosis: { bsonType: 'string' },
        treatment: { bsonType: 'string' },
        medication: { bsonType: 'string' },
        dosage: { bsonType: 'string' },
        notes: { bsonType: 'string' },
        followUpDate: { bsonType: 'date' },
        status: { 
          bsonType: 'string',
          enum: ['active', 'completed', 'cancelled']
        },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' }
      }
    }
  }
});

db.createCollection('staff_shifts', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['staffId', 'date', 'shiftType', 'startTime'],
      properties: {
        staffId: { bsonType: 'string' },
        date: { bsonType: 'date' },
        shiftType: { 
          bsonType: 'string',
          enum: ['morning', 'afternoon', 'night']
        },
        startTime: { bsonType: 'date' },
        endTime: { bsonType: 'date' },
        status: { 
          bsonType: 'string',
          enum: ['scheduled', 'active', 'completed', 'cancelled']
        },
        notes: { bsonType: 'string' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' }
      }
    }
  }
});

db.createCollection('staff_attendance', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['staffId', 'date', 'checkIn'],
      properties: {
        staffId: { bsonType: 'string' },
        date: { bsonType: 'date' },
        checkIn: { bsonType: 'date' },
        checkOut: { bsonType: 'date' },
        status: { 
          bsonType: 'string',
          enum: ['present', 'absent', 'late', 'half-day']
        },
        notes: { bsonType: 'string' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' }
      }
    }
  }
});

db.createCollection('staff_tasks', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['title', 'assignedTo', 'priority', 'status'],
      properties: {
        title: { bsonType: 'string' },
        description: { bsonType: 'string' },
        assignedTo: { bsonType: 'string' },
        priority: { 
          bsonType: 'string',
          enum: ['low', 'medium', 'high', 'urgent']
        },
        status: { 
          bsonType: 'string',
          enum: ['pending', 'in-progress', 'completed', 'cancelled']
        },
        dueDate: { bsonType: 'date' },
        completedAt: { bsonType: 'date' },
        notes: { bsonType: 'string' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' }
      }
    }
  }
});

db.createCollection('alerts', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['type', 'message', 'priority', 'status'],
      properties: {
        type: { 
          bsonType: 'string',
          enum: ['health', 'inventory', 'security', 'maintenance', 'general']
        },
        message: { bsonType: 'string' },
        priority: { 
          bsonType: 'string',
          enum: ['low', 'medium', 'high', 'critical']
        },
        status: { 
          bsonType: 'string',
          enum: ['active', 'acknowledged', 'resolved']
        },
        relatedId: { bsonType: 'string' },
        relatedType: { bsonType: 'string' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
        resolvedAt: { bsonType: 'date' }
      }
    }
  }
});

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.gate_logs.createIndex({ at: -1 });
db.gate_logs.createIndex({ type: 1 });
db.foodInventory.createIndex({ name: 1 });
db.foodInventory.createIndex({ status: 1 });
db.cows.createIndex({ tag: 1 }, { unique: true });
db.cows.createIndex({ name: 1 });
db.treatments.createIndex({ cowId: 1, date: -1 });
db.staff_shifts.createIndex({ staffId: 1, date: -1 });
db.staff_attendance.createIndex({ staffId: 1, date: -1 });
db.staff_tasks.createIndex({ assignedTo: 1, status: 1 });
db.alerts.createIndex({ status: 1, priority: 1, createdAt: -1 });

print('MongoDB initialization completed successfully!');
