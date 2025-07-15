'use strict';

const { supabase } = require('../supabase');

/**
 * StatsController
 * 
 * Provides productivity and dashboard statistics for the authenticated user.
 * Aggregates statistics about tasks, boards, and recent activity.
 * All endpoints require authentication.
 */
class StatsController {
  // PUBLIC_INTERFACE
  /**
   * @swagger
   * /stats/productivity:
   *   get:
   *     summary: Productivity statistics for authenticated user (dashboard)
   *     description: |
   *       Returns aggregate productivity statistics (tasks completed, tasks by status, boards, and recent activity)
   *       for the authenticated user.
   *     tags: [Stats]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Productivity statistics object
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 total_tasks:
   *                   type: integer
   *                 completed_tasks:
   *                   type: integer
   *                 tasks_by_status:
   *                   type: object
   *                   properties:
   *                     todo:
   *                       type: integer
   *                     in_progress:
   *                       type: integer
   *                     done:
   *                       type: integer
   *                 total_boards:
   *                   type: integer
   *                 recent_activity:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: integer
   *                       title:
   *                         type: string
   *                       status:
   *                         type: string
   *                       updated_at:
   *                         type: string
   *                         format: date-time
   *       401:
   *         description: Authentication required
   *       500:
   *         description: Supabase or backend error
   */
  async productivity(req, res) {
    try {
      const user = req.user;
      if (!user || !user.id) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Aggregate statistics from Supabase
      // 1. Total tasks, completed tasks, board count, tasks by status
      const [{ data: tasks, error: taskErr }, { data: boards, error: boardErr }] = await Promise.all([
        supabase
          .from('tasks')
          .select('id, status, title, updated_at')
          .eq('user_id', user.id),
        supabase
          .from('boards')
          .select('id')
          .eq('user_id', user.id),
      ]);
      if (taskErr) return res.status(500).json({ message: 'Failed to fetch tasks', detail: taskErr.message });
      if (boardErr) return res.status(500).json({ message: 'Failed to fetch boards', detail: boardErr.message });
      const total_tasks = tasks.length;
      const completed_tasks = tasks.filter(t => t.status === 'done').length;
      const tasks_by_status = {
        todo: tasks.filter(t => t.status === 'todo').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        done: completed_tasks,
      };
      const total_boards = boards.length;
      // 2. Recent activity: Last 10 tasks (updated or created most recently)
      // (sorted descending by updated_at, fallback to created_at if needed)
      const sorted = [...tasks].sort((a, b) => {
        // Use updated_at, fallback to 0
        const d1 = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const d2 = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return d2 - d1;
      }).slice(0, 10);

      const recent_activity = sorted.map(({ id, title, status, updated_at }) => ({
        id,
        title,
        status,
        updated_at,
      }));

      return res.status(200).json({
        total_tasks,
        completed_tasks,
        tasks_by_status,
        total_boards,
        recent_activity,
      });
    } catch (err) {
      console.error('Stats productivity error:', err);
      return res.status(500).json({ message: 'Internal server error', detail: err.message });
    }
  }
}

module.exports = new StatsController();
