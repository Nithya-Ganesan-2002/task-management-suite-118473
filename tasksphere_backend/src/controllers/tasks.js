'use strict';

const { supabase } = require('../supabase');
const { emitUpdate } = require('../realtime');

/**
 * TaskController handles CRUD operations for user tasks.
 * All endpoints require authentication. Tasks are only accessible and
 * modifiable by their owner (user_id from Supabase JWT).
 * Responses conform to OpenAPI/Swagger documentation.
 */
class TaskController {
  // PUBLIC_INTERFACE
  /**
   * @swagger
   * /tasks:
   *   post:
   *     summary: Create a new task for the authenticated user
   *     tags: [Tasks]
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
   *                 example: "Write project docs"
   *               description:
   *                 type: string
   *                 example: "Add API documentation for backend"
   *               status:
   *                 type: string
   *                 enum: [todo, in_progress, done]
   *                 default: "todo"
   *     responses:
   *       201:
   *         description: Task created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Task'
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
      const { title, description = '', status = 'todo' } = req.body;
      if (!title || typeof title !== 'string') {
        return res.status(400).json({ message: 'Task title is required' });
      }
      const { data, error } = await supabase
        .from('tasks')
        .insert([{ user_id: user.id, title, description, status }])
        .select()
        .single();
      if (error) {
        return res.status(500).json({ message: error.message || 'Failed to create task' });
      }
      // Real-time event: Task created
      emitUpdate({ type: 'task_created', payload: data });
      return res.status(201).json(data);
    } catch (err) {
      console.error('Create Task error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * @swagger
   * /tasks:
   *   get:
   *     summary: List all tasks for the authenticated user
   *     tags: [Tasks]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: List of tasks
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Task'
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
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) {
        return res.status(500).json({ message: error.message || 'Failed to fetch tasks' });
      }
      // Real-time event: Task updated
      emitUpdate({ type: 'task_updated', payload: data });
      return res.status(200).json(data);
    } catch (err) {
      console.error('List Tasks error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * @swagger
   * /tasks/{id}:
   *   get:
   *     summary: Get a task by ID (ownership required)
   *     tags: [Tasks]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Task ID
   *     responses:
   *       200:
   *         description: Task found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Task'
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Access denied
   *       404:
   *         description: Task not found
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
        return res.status(400).json({ message: 'Task ID is required' });
      }
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();
      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('No rows')) {
          return res.status(404).json({ message: 'Task not found' });
        }
        return res.status(500).json({ message: error.message });
      }
      if (!data) {
        return res.status(404).json({ message: 'Task not found' });
      }
      return res.status(200).json(data);
    } catch (err) {
      console.error('Get Task error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * @swagger
   * /tasks/{id}:
   *   put:
   *     summary: Update a task by ID (ownership required)
   *     tags: [Tasks]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Task ID
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
   *               status:
   *                 type: string
   *                 enum: [todo, in_progress, done]
   *     responses:
   *       200:
   *         description: Task updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Task'
   *       400:
   *         description: Invalid input
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Access denied
   *       404:
   *         description: Task not found
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
        return res.status(400).json({ message: 'Task ID is required' });
      }
      // Only update fields provided
      const { title, description, status } = req.body;
      const updateObj = {};
      if (title !== undefined) updateObj.title = title;
      if (description !== undefined) updateObj.description = description;
      if (status !== undefined) updateObj.status = status;
      if (Object.keys(updateObj).length === 0) {
        return res.status(400).json({ message: 'No valid fields to update' });
      }
      // Ensure the task belongs to the user
      const { data: oldTask, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();
      if (fetchError || !oldTask) {
        return res.status(404).json({ message: 'Task not found' });
      }
      const { data, error } = await supabase
        .from('tasks')
        .update(updateObj)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      if (error) {
        return res.status(500).json({ message: error.message });
      }
      return res.status(200).json(data);
    } catch (err) {
      console.error('Update Task error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * @swagger
   * /tasks/{id}:
   *   delete:
   *     summary: Delete a task by ID (ownership required)
   *     tags: [Tasks]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Task ID
   *     responses:
   *       204:
   *         description: Task deleted successfully
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Access denied
   *       404:
   *         description: Task not found
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
        return res.status(400).json({ message: 'Task ID is required' });
      }
      // Ensure task exists and user owns it
      const { data: oldTask, error: fetchError } = await supabase
        .from('tasks')
        .select('id')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();
      if (fetchError || !oldTask) {
        return res.status(404).json({ message: 'Task not found' });
      }
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) {
        return res.status(500).json({ message: error.message });
      }
      // Real-time event: Task deleted
      emitUpdate({ type: 'task_deleted', payload: { id, user_id: user.id } });
      return res.status(204).send();
    } catch (err) {
      console.error('Delete Task error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
}

module.exports = new TaskController();
