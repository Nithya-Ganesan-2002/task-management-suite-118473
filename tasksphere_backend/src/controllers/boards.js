'use strict';

const { supabase } = require('../supabase');

/**
 * BoardController handles CRUD operations for Kanban boards and task ordering/assignment.
 * All endpoints require authentication; boards and operations are user-scoped.
 */
// PUBLIC_INTERFACE
class BoardController {
  /**
   * @swagger
   * /boards:
   *   post:
   *     summary: Create a new board for the authenticated user
   *     tags: [Boards]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [title]
   *             properties:
   *               title:
   *                 type: string
   *                 example: "My Kanban Board"
   *               description:
   *                 type: string
   *                 example: "Personal planning board"
   *               order:
   *                 type: integer
   *                 example: 1
   *     responses:
   *       201:
   *         description: Board created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Board'
   *       400:
   *         description: Invalid input
   *       401:
   *         description: Authentication required
   *       500:
   *         description: Supabase or backend error
   */
  async create(req, res) {
    try {
      const user = req.user;
      if (!user || !user.id) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      const { title, description = '', order } = req.body;
      if (!title || typeof title !== 'string') {
        return res.status(400).json({ message: 'Board title is required' });
      }
      // Determine 'order' (position in Kanban) if not provided: insert at end
      let boardOrder = order;
      if (boardOrder === undefined) {
        // Get the max current order for user boards
        const { data: boards, error: listError } = await supabase
          .from('boards')
          .select('order')
          .eq('user_id', user.id)
          .order('order', { ascending: false })
          .limit(1);
        boardOrder = boards && boards.length > 0 ? (boards[0].order || 0) + 1 : 1;
      }
      const { data, error } = await supabase
        .from('boards')
        .insert([{ user_id: user.id, title, description, order: boardOrder }])
        .select()
        .single();
      if (error) {
        return res.status(500).json({ message: error.message || 'Failed to create board' });
      }
      // Real-time event: Board created
      emitUpdate({ type: 'board_created', payload: data });
      return res.status(201).json(data);
    } catch (err) {
      console.error('Create Board error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * @swagger
   * /boards:
   *   get:
   *     summary: List all boards for the authenticated user, with tasks ordered for each board (Kanban)
   *     tags: [Boards]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: List of boards with associated tasks for user
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/BoardWithTasks'
   *       401:
   *         description: Authentication required
   *       500:
   *         description: Supabase or backend error
   */
  async list(req, res) {
    try {
      const user = req.user;
      if (!user || !user.id) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      // Get boards for user
      const { data: boards, error: boardError } = await supabase
        .from('boards')
        .select('*')
        .eq('user_id', user.id)
        .order('order', { ascending: true });
      if (boardError) {
        return res.status(500).json({ message: boardError.message || 'Failed to fetch boards' });
      }
      // For each board, aggregate associated tasks (order by board_task.order for Kanban)
      const boardIds = boards && boards.length > 0 ? boards.map(b => b.id) : [];
      let boardTasks = [];
      if (boardIds.length > 0) {
        const { data: btData, error: btError } = await supabase
          .from('board_task')
          .select('id, board_id, task_id, order, task:tasks(*)')
          .in('board_id', boardIds)
          .order('order', { ascending: true });
        if (btError) {
          return res.status(500).json({ message: btError.message || 'Failed to fetch board tasks' });
        }
        boardTasks = btData;
      }
      // Map boardTasks into boards
      boards.forEach(board => {
        board.tasks = (boardTasks || [])
          .filter(bt => bt.board_id === board.id)
          .map(bt => ({ ...bt.task, kanban_order: bt.order }));
      });
      return res.status(200).json(boards);
    } catch (err) {
      console.error('List Boards error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * @swagger
   * /boards/{id}:
   *   get:
   *     summary: Get a board by ID (with ordered tasks)
   *     tags: [Boards]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Board ID
   *     responses:
   *       200:
   *         description: Board found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/BoardWithTasks'
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Access denied
   *       404:
   *         description: Board not found
   *       500:
   *         description: Supabase or backend error
   */
  async get(req, res) {
    try {
      const user = req.user;
      if (!user || !user.id) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ message: 'Board ID is required' });
      }
      // Fetch board
      const { data: board, error: bError } = await supabase
        .from('boards')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();
      if (bError || !board) {
        return res.status(404).json({ message: 'Board not found' });
      }
      // Fetch board tasks
      const { data: boardTasks, error: btError } = await supabase
        .from('board_task')
        .select('id, board_id, task_id, order, task:tasks(*)')
        .eq('board_id', id)
        .order('order', { ascending: true });
      if (btError) {
        return res.status(500).json({ message: btError.message || 'Failed to fetch board tasks' });
      }
      board.tasks = (boardTasks || []).map(bt => ({ ...bt.task, kanban_order: bt.order }));
      return res.status(200).json(board);
    } catch (err) {
      console.error('Get Board error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * @swagger
   * /boards/{id}:
   *   put:
   *     summary: Update a board by ID
   *     tags: [Boards]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Board ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               title:
   *                 type: string
   *               description:
   *                 type: string
   *               order:
   *                 type: integer
   *     responses:
   *       200:
   *         description: Board updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Board'
   *       400:
   *         description: Invalid input
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Access denied
   *       404:
   *         description: Board not found
   *       500:
   *         description: Supabase or backend error
   */
  async update(req, res) {
    try {
      const user = req.user;
      if (!user || !user.id) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ message: 'Board ID is required' });
      }
      const { title, description, order } = req.body;
      const updateObj = {};
      if (title !== undefined) updateObj.title = title;
      if (description !== undefined) updateObj.description = description;
      if (order !== undefined) updateObj.order = order;

      if (Object.keys(updateObj).length === 0) {
        return res.status(400).json({ message: 'No valid fields to update' });
      }
      // Ensure the board belongs to the user
      const { data: oldBoard, error: fetchError } = await supabase
        .from('boards')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();
      if (fetchError || !oldBoard) {
        return res.status(404).json({ message: 'Board not found' });
      }
      const { data, error } = await supabase
        .from('boards')
        .update(updateObj)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      if (error) {
        return res.status(500).json({ message: error.message });
      }
      // Real-time event: Board updated
      emitUpdate({ type: 'board_updated', payload: data });
      return res.status(200).json(data);
    } catch (err) {
      console.error('Update Board error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * @swagger
   * /boards/{id}:
   *   delete:
   *     summary: Delete a board by ID
   *     tags: [Boards]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Board ID
   *     responses:
   *       204:
   *         description: Board deleted successfully
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Access denied
   *       404:
   *         description: Board not found
   *       500:
   *         description: Supabase or backend error
   */
  async delete(req, res) {
    try {
      const user = req.user;
      if (!user || !user.id) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ message: 'Board ID is required' });
      }
      // Ensure board exists and user owns it
      const { data: oldBoard, error: fetchError } = await supabase
        .from('boards')
        .select('id')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();
      if (fetchError || !oldBoard) {
        return res.status(404).json({ message: 'Board not found' });
      }
      // Delete associated board_task entries (clean up Kanban relationship)
      await supabase
        .from('board_task')
        .delete()
        .eq('board_id', id);

      // Delete the board itself
      const { error } = await supabase
        .from('boards')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) {
        return res.status(500).json({ message: error.message });
      }
      // Real-time event: Board deleted
      emitUpdate({ type: 'board_deleted', payload: { id, user_id: user.id } });
      return res.status(204).send();
    } catch (err) {
      console.error('Delete Board error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * @swagger
   * /boards/{id}/tasks:
   *   post:
   *     summary: Add or move a task to a board at a specific position (Kanban drag-and-drop operation)
   *     tags: [Boards]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Board ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [task_id, order]
   *             properties:
   *               task_id:
   *                 type: integer
   *               order:
   *                 type: integer
   *                 description: "The order/index of the task in the board (starts at 1)"
   *     responses:
   *       200:
   *         description: Task added/moved on board; returns board-task relation
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 board_task:
   *                   type: object
   *       400:
   *         description: Invalid input
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Access denied
   *       404:
   *         description: Board/task not found
   *       500:
   *         description: Supabase or backend error
   */
  async addOrMoveTask(req, res) {
    try {
      const user = req.user;
      if (!user || !user.id) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      const { id } = req.params; // board_id
      const { task_id, order } = req.body;
      if (!id || !task_id || typeof order !== 'number') {
        return res.status(400).json({ message: 'board_id, task_id, and order are required' });
      }
      // Confirm ownership of board and task
      const [{ data: board, error: bError }, { data: task, error: tError }] = await Promise.all([
        supabase.from('boards').select('*').eq('id', id).eq('user_id', user.id).single(),
        supabase.from('tasks').select('*').eq('id', task_id).eq('user_id', user.id).single()
      ]);
      if (bError || !board) return res.status(404).json({ message: 'Board not found' });
      if (tError || !task) return res.status(404).json({ message: 'Task not found' });

      // Reorder all board_task mapping for this board correctly (simple implementation: shift necessary orders down)
      // Step 1: Shift board_task.order >= new order by +1
      await supabase
        .rpc('shift_board_task_orders', { board_id_param: id, position: order }); // create this RPC in Supabase SQL
      // Step 2: Upsert (insert or update) mapping for this task-board
      const { data: bt, error: btError } = await supabase
        .from('board_task')
        .upsert({ board_id: id, task_id, order }, { onConflict: ['board_id', 'task_id'] })
        .select()
        .single();
      if (btError) {
        return res.status(500).json({ message: btError.message || 'Failed to add/move task in board' });
      }
      // Real-time event: Task moved/added in Kanban board
      emitUpdate({
        type: 'board_task_changed',
        payload: {
          board_id: id,
          task_id,
          new_order: order,
          board_task: bt,
          user_id: user.id,
        },
      });
      return res.status(200).json({ board_task: bt });
    } catch (err) {
      console.error('addOrMoveTask error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
}

module.exports = new BoardController();
