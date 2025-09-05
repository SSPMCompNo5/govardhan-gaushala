# API Documentation

All API routes require authentication and are protected via middleware. Unauthorized requests return `401` JSON; forbidden roles return `403` JSON`. Mutations are rate limited and require CSRF headers.

Base path: `/api`

## Common
- Auth routes under `/api/auth/*` are handled by NextAuth and are excluded from RBAC checks
- Content-Type: JSON
- CSRF for mutations (POST/PATCH/DELETE):
  - Include header `X-CSRF-Token: <value of csrftoken cookie>`
  - Only `application/json` bodies are accepted for mutations
- Rate limiting: write endpoints return `429` when limits are exceeded

---

## Food Inventory
Path: `/api/food/inventory`

### GET
List inventory with filters.

Query params:
- `page` (number, default 1)
- `limit` (number, default 20)
- `status` ("healthy" | "low" | "critical" | "out_of_stock")
- `type` (one of FoodTypes values)
- `search` (string, partial match on name/supplier)

Response:
```json
{
  "inventory": [ { /* item */ } ],
  "pagination": { "page": 1, "limit": 20, "total": 100, "pages": 5 }
}
```

### POST
Create a new inventory item.

Headers:
```
X-CSRF-Token: <csrftoken>
Content-Type: application/json
```

Body:
```json
{
  "name": "Hay Bale",
  "type": "hay",
  "quantity": 50,
  "unit": "kg",
  "supplier": "Supplier A",
  "purchaseDate": "2025-09-01T00:00:00.000Z",
  "expiryDate": "2025-10-01T00:00:00.000Z",
  "notes": "Stored in bay 3"
}
```

Response 201:
```json
{ "message": "Inventory item added successfully", "id": "..." }
```

### PATCH
Update an inventory item.

Headers:
```
X-CSRF-Token: <csrftoken>
Content-Type: application/json
```

Body:
```json
{ "id": "<itemId>", "quantity": 40 }
```

### DELETE
Delete an inventory item.

Headers:
```
X-CSRF-Token: <csrftoken>
```

Query:
- `id` (string)

---

## Feeding Logs
Path: `/api/food/feeding-logs`

### GET
Filters: `page`, `limit`, `cowGroup`, `foodType`, `dateFrom`, `dateTo`, `search`

### POST
Record a feeding log.

Headers:
```
X-CSRF-Token: <csrftoken>
Content-Type: application/json
```

Body:
```json
{
  "foodType": "hay",
  "quantity": 10,
  "unit": "kg",
  "cowGroup": "lactating",
  "feedingTime": "2025-09-03T06:30:00.000Z",
  "wastage": 0,
  "notes": "Morning feed"
}
```

Response 201:
```json
{ "message": "Feeding log recorded successfully", "id": "..." }
```

---

## Suppliers
Path: `/api/food/suppliers`

### GET
Filters: `page`, `limit`, `isActive`, `foodType`, `search`

### POST
Create supplier (fields validated in backend)

Headers:
```
X-CSRF-Token: <csrftoken>
Content-Type: application/json
```

### PATCH
Update supplier (requires `id` in body)

Headers:
```
X-CSRF-Token: <csrftoken>
Content-Type: application/json
```

### DELETE
Delete supplier (requires `id` in query)

Headers:
```
X-CSRF-Token: <csrftoken>
```

---

## Feeding Schedule
Path: `/api/food/schedule`

### GET
Filters: `page`, `limit`, `cowGroup`, `foodType`, `isActive`

### POST
Create schedule.

Headers:
```
X-CSRF-Token: <csrftoken>
Content-Type: application/json
```

Body:
```json
{
  "time": "06:30",
  "cowGroup": "lactating",
  "foodType": "hay",
  "quantity": 12,
  "unit": "kg",
  "daysOfWeek": [1,3,5],
  "isActive": true,
  "notes": "Alternate days"
}
```

### PATCH/DELETE
Update/delete schedules (similar to inventory patterns)

---

## Admin: Initialize Indexes
Path: `/api/admin/init-indexes` (POST)

- Requires role Owner/Admin
- Initializes database indexes if missing

Response:
```json
{ "message": "Database indexes initialized successfully", "timestamp": "..." }
```

---

## Errors
- 400 Validation error
- 401 Unauthorized (no/invalid token)
- 403 Forbidden (insufficient role)
- 404 Not found
- 429 Too many requests (future throttling)
- 500 Internal server error
