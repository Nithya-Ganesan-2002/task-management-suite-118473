# Supabase Integration for TaskSphere Backend - Boards & Kanban

This backend expects the following Supabase tables and relationships (schema):

## Table: boards
| Column      | Type      | Notes                              |
|-------------|-----------|------------------------------------|
| id          | integer   | PK, auto-increment                 |
| user_id     | uuid/text | FK to auth.users.id, NOT NULL      |
| title       | text      | NOT NULL                           |
| description | text      | Optional                           |
| order       | integer   | Kanban position/order of board     |
| created_at  | timestamptz | Default now()                    |
| updated_at  | timestamptz | Auto-updated                      |

* `user_id` references the Supabase Auth user.
* Each board belongs to one user.

## Table: board_task
* Maps tasks to boards and allows order/indexing within a board.

| Column    | Type    | Notes                         |
|-----------|---------|-------------------------------|
| id        | integer | PK, auto-increment            |
| board_id  | integer | FK to boards.id, NOT NULL     |
| task_id   | integer | FK to tasks.id, NOT NULL      |
| order     | integer | Kanban order/index in board   |

* Composite unique index on (board_id, task_id).
* Each task can appear in only one (current) place/order per board.

## Table: tasks
* As documented/used in the backend already.

## RPC: shift_board_task_orders
A Postgres function:
```
CREATE OR REPLACE FUNCTION shift_board_task_orders(board_id_param integer, position integer)
RETURNS void AS $$
BEGIN
  UPDATE board_task
  SET "order" = "order" + 1
  WHERE board_id = board_id_param AND "order" >= position;
END;
$$ LANGUAGE plpgsql;
```
Used to shift board_task orderings when reordering/adding a task.

**Supabase Policy Requirements**
- All board and board_task operations are protected by RLS rules per user (user_id).
- Only the owner can view/modify their boards and board-to-task mappings.

# Relationship with Auth
- All endpoints require Bearer JWT; user_id extracted by backend, passed as user_id.

# Note for Kanban
- To move a task between boards, client must call POST `/boards/:id/tasks` with new board_id and order/index.
