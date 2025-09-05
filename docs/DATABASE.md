# Database (MongoDB)

## Connection (`lib/mongo.js`)
- What: Single place to connect to the database.
- Why: Keeps things efficient and consistent.
- How: Shares a connection used by API routes.
- Analogy: A library card at the main desk.

## Indexes (`lib/initIndexes.js`)
- What: Creates search indexes.
- Why: Makes queries faster and predictable.
- How: Admin endpoint `/api/admin/init-indexes` can run it; safe to call more than once.
- Analogy: Librarian adding tabs to book sections.

## Warehouse Helpers (`lib/models/foodInventory.js`)
- What: Functions to get collections: `foodInventory`, `feedingLogs`, `foodSuppliers`, `feedingSchedule` and helpers like stock status.
- Why: Centralize all warehouse-related access.
- How: API routes call these to read/write data.
- Analogy: A clerk who knows which filing cabinet to open.

## Main Collections
- `users`: login info and roles
- `foodInventory`: items in stock (name, type, quantity, unit, status, dates, notes)
- `feedingLogs`: records of feedings (food type, quantity, unit, cow group, time, notes)
- `foodSuppliers`: vendor directory (name, contact, types, status)
- `feedingSchedule`: schedules (time, cow group, food type, quantity, days of week, isActive)
- `auth_throttle`, `auth_ip_throttle`: login protection (rate/throttle)
- (Gate logs collections support the gate features)
