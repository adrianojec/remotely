import { Hono } from 'hono';
import { db, GroupRecord, HttpStatus } from '../db/index.js';
import crypto from 'node:crypto';

export const groupsRouter = new Hono();

// GET all server groups
groupsRouter.get('/', (c) => {
  const stmt = db.prepare('SELECT id, name, created_at, updated_at FROM server_groups ORDER BY name ASC');
  const groups = stmt.all() as GroupRecord[];

  return c.json({ success: true, groups });
});

// POST create a new server group
groupsRouter.post('/', async (c) => {
  const body = await c.req.json();
  const { name } = body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return c.json({ success: false, message: 'Group name is required' }, HttpStatus.BAD_REQUEST);
  }

  const trimmedName = name.trim();

  // Check uniqueness
  const existing = db.prepare('SELECT id FROM server_groups WHERE LOWER(name) = LOWER(?)').get(trimmedName);
  
  if (existing) {
    return c.json({ success: false, message: 'A group with this name already exists' }, HttpStatus.BAD_REQUEST);
  }

  const id = crypto.randomUUID();
  const stmt = db.prepare('INSERT INTO server_groups (id, name) VALUES (?, ?)');
  stmt.run(id, trimmedName);

  const newGroup: GroupRecord = {
    id,
    name: trimmedName,
  };

  return c.json({ success: true, group: newGroup });
});

// DELETE a group and all its contained servers
groupsRouter.delete('/:id', (c) => {
  const id = c.req.param('id');

  const groupStmt = db.prepare('SELECT id, name FROM server_groups WHERE id = ?');
  const group = groupStmt.get(id) as GroupRecord | undefined;

  if (!group) {
    return c.json({ success: false, message: 'Group not found' }, HttpStatus.NOT_FOUND);
  }

  // Execute deletion of contained servers and group in transaction
  const deleteTx = db.transaction((groupId: string) => {
    const deleteServersStmt = db.prepare('DELETE FROM servers WHERE group_id = ?');
    const serverResult = deleteServersStmt.run(groupId);

    const deleteGroupStmt = db.prepare('DELETE FROM server_groups WHERE id = ?');
    deleteGroupStmt.run(groupId);

    return serverResult.changes;
  });

  const deletedServersCount = deleteTx(id);

  return c.json({
    success: true,
    message: `Group "${group.name}" and ${deletedServersCount} server(s) deleted successfully`,
    deletedServersCount,
  });
});
