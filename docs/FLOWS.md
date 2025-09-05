# Process Walkthroughs

## Visitor Entry Flow (Gate)
1) Watchman enters visitor info in a form
2) System saves it to the database
3) Admin can view the entry later in a dashboard
4) Audit logs note who created the record and when

## Feeding Event Flow
1) Food Manager records a feeding (type, quantity, group)
2) System validates it (security checks) and saves it
3) Feeding history and reports can be generated

## Feeding Schedule Flow
1) Food Manager creates a schedule (time, group, food)
2) System stores a repeating plan
3) Staff follow the plan; feedings are recorded

## Health Check Flow
1) Monitoring system calls `/api/health`
2) App pings the database
3) Returns ok if healthy, or a warning otherwise
