# Dashboards

## Admin Dashboard (`app/dashboard/admin/*`)
- What: High-level control room.
- Why: See the big picture and access admin tools.
- How: Shown only to Admin users via roles and middleware.
- Analogy: Executive office overview screen.

## Watchman Dashboard (`app/dashboard/watchman/*`)
- What: Gate logbook and tools (entry, exit, activity, reports).
- Why: Record and review who enters and leaves.
- How: Role-lock ensures only Watchman can use it.
- Analogy: Guard’s desk with a bound logbook.

## Food Manager Dashboard (`app/dashboard/food-manager/*`)
- What: Warehouse operations (inventory, feedings, suppliers, schedules).
- Why: Keep stock, feeding records, vendor info, and schedules organized.
- How: Secure APIs, role checks, CSRF, and rate limits protect changes.
- Analogy: Warehouse manager’s console.

## Shared Navigation
- `components/dashboard/DashboardHeader.jsx` and `Sidebar.jsx`
- What: Reusable header and sidebar.
- Why: Consistent navigation and quick actions (like Logout).
- How: Shows options based on user role.
- Analogy: Building directory and top bar in every room.
