# Supabase Integration for TaskSphere Backend and Frontend

## Secure Supabase Configuration

**Backend (`tasksphere_backend`):**
- Requires a `.env` file (place in `tasksphere_backend/.env`).
- Add the following keys (do NOT hardcode these in source code!):
  ```
  SUPABASE_URL=<your-supabase-url>
  SUPABASE_KEY=<your-service-role-or-public-key>
  ```
- These are referenced in code by:
  ```js
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;
  ```

**Frontend (`tasksphere_frontend`):**
- Requires a `.env` file (place in `tasksphere_frontend/.env`).
- Add:
  ```
  VITE_SUPABASE_URL=<your-supabase-url>
  VITE_SUPABASE_ANON_KEY=<your-anon-key>
  ```
- Referenced in code as:
  ```ts
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  ```
- Never expose service keys in frontend; use only anon keys for client-side code.

**Do NOT commit these .env files with secrets to version control.**  
Always use environment variables for configuration/secrets.

---

This backend expects the following Supabase tables and relationships (schema):

## Table: boards

| Column      | Type        | Notes                                                 |
|-------------|-------------|-------------------------------------------------------|
| id          | integer     | PK, auto-increment, PRIMARY KEY                       |
| user_id     | uuid        | FK to auth.users.id, NOT NULL, indexed                |
| title       | text        | NOT NULL                                              |
| description | text        | Optional                                              |
| "order"     | integer     | Kanban position/order of board                        |
| created_at  | timestamptz | Default now()                                         |
| updated_at  | timestamptz | Auto-updated                                          |

* `user_id` references the Supabase Auth user (`auth.users`).
* Index on `user_id` for fast board lookup by user.
* Row Level Security (RLS) ensures only board owner access.

## Table: tasks

| Column      | Type        | Notes                                                 |
|-------------|-------------|-------------------------------------------------------|
| id          | integer     | PK, auto-increment, PRIMARY KEY                       |
| user_id     | uuid        | FK to auth.users.id, NOT NULL, indexed                |
| title       | text        | NOT NULL                                              |
| description | text        | Optional                                              |
| status      | text        | 'todo' | 'in_progress' | 'done', default 'todo'      |
| created_at  | timestamptz | Default now()                                         |
| updated_at  | timestamptz | Auto-updated                                          |

* Each task belongs to one user (RLS-protected).
* Index on `user_id` for efficient querying.

## Table: board_task
* Maps tasks to boards and manages their order on a Kanban board.

| Column    | Type      | Notes                                               |
|-----------|-----------|-----------------------------------------------------|
| id        | integer   | PK, auto-increment, PRIMARY KEY                     |
| board_id  | integer   | FK to boards.id, NOT NULL                           |
| task_id   | integer   | FK to tasks.id, NOT NULL                            |
| "order"   | integer   | Kanban order/index in board                         |

* Composite unique index on (board_id, task_id) so each task appears only once per board.
* RLS: Only board owner can CRUD board_task rows (using board's user_id).

## Table: attachments

| Column        | Type        | Notes                                              |
|---------------|-------------|----------------------------------------------------|
| id            | integer     | PK, auto-increment, PRIMARY KEY                    |
| task_id       | integer     | FK to tasks.id, NOT NULL, indexed                  |
| user_id       | uuid        | FK to auth.users.id, NOT NULL, indexed             |
| file_url      | text        | Public/file download URL from Supabase Storage     |
| storage_object| jsonb       | (Optional) Storage object metadata                 |
| created_at    | timestamptz | Default now()                                      |

* Each uploaded file is linked to a task and a user.
* RLS: Only file owner (by user_id) can access/modify their attachments.

## RPC: shift_board_task_orders
A Postgres function (used by Kanban for shifting tasks):

```
CREATE OR REPLACE FUNCTION shift_board_task_orders(board_id_param integer, position_param integer)
RETURNS void AS $$
BEGIN
  UPDATE board_task
  SET "order" = "order" + 1
  WHERE board_id = board_id_param AND "order" >= position_param;
END;
$$ LANGUAGE plpgsql;
```
Used to shift board_task orderings when reordering/adding a task.

## Row Level Security (RLS) Policies
Enforced for data privacy and isolation:
- Only resource owners (matching `user_id`) can SELECT/INSERT/UPDATE/DELETE their data in `boards`, `tasks`, and `attachments`.
- Only board owner (from boards.user_id) may create/modify board_task entries for their boards.
- All tables have RLS enabled.

## Indexes
- Unique index on (board_id, task_id) in board_task.
- Standard indexes on user_id and task_id columns for all major lookup fields.

## Foreign Keys
- boards.user_id, tasks.user_id, attachments.user_id → auth.users(id)
- board_task.board_id → boards(id)
- board_task.task_id → tasks(id)
- attachments.task_id → tasks(id)

## Storage Buckets

- File attachments are managed in a dedicated Supabase Storage bucket (configurable in the backend), with `attachments` table referencing file metadata and URLs.

## Auth & JWT

- All endpoints require Bearer JWT; user_id extracted by backend, referenced in Supabase.
- Never expose service keys on frontend; only use anon keys for client-side.

# Note for Kanban
- To move a task between boards, client must call POST `/boards/:id/tasks` with new board_id and order/index.

# Supabase Dashboard/SQL Setup Tips
- Ensure RLS is enabled on all the above tables and policies are created.
- File upload functionality requires a Supabase Storage bucket (typically called `attachments`).
- All schema, index, and function changes can be managed in the Supabase web console or deployed via migrations.
