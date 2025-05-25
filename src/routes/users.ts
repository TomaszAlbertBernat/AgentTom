import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database';
import { users } from '../schema/user';
import { eq } from 'drizzle-orm';
import type { AppEnv } from '../types/hono';

const users_router = new Hono<AppEnv>();

// Basic validation schemas
const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  token: z.string().optional()
});

// GET /api/users - List all users
users_router.get('/', async (c) => {
  try {
    const allUsers = await db.select().from(users);
    return c.json({
      success: true,
      data: allUsers.map(user => ({
        id: user.id,
        uuid: user.uuid,
        name: user.name,
        email: user.email,
        active: user.active,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }))
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch users'
    }, 500);
  }
});

// GET /api/users/:uuid - Get specific user
users_router.get('/:uuid', async (c) => {
  try {
    const uuid = c.req.param('uuid');
    const user = await db.select().from(users).where(eq(users.uuid, uuid)).get();

    if (!user) {
      return c.json({
        success: false,
        error: 'User not found'
      }, 404);
    }

    return c.json({
      success: true,
      data: {
        id: user.id,
        uuid: user.uuid,
        name: user.name,
        email: user.email,
        active: user.active,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        context: user.context,
        environment: user.environment
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch user'
    }, 500);
  }
});

// POST /api/users - Create new user
users_router.post('/', zValidator('json', createUserSchema), async (c) => {
  try {
    const data = c.req.valid('json');

    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, data.email)).get();

    if (existingUser) {
      return c.json({
        success: false,
        error: 'User with this email already exists'
      }, 409);
    }

    // Create user
    const userUuid = uuidv4();
    const newUser = {
      uuid: userUuid,
      name: data.name,
      email: data.email,
      token: data.token || uuidv4(),
      active: true,
      context: null,
      environment: JSON.stringify({
        location: 'Unknown',
        time: new Date().toISOString(),
        weather: 'Unknown',
        music: 'No music playing',
        activity: 'Unknown'
      })
    };

    const result = await db.insert(users).values(newUser).returning();

    return c.json({
      success: true,
      data: {
        uuid: result[0].uuid,
        name: result[0].name,
        email: result[0].email,
        active: result[0].active
      },
      message: 'User created successfully'
    }, 201);
  } catch (error) {
    console.error('Error creating user:', error);
    return c.json({
      success: false,
      error: 'Failed to create user'
    }, 500);
  }
});

// PUT /api/users/:uuid - Update user
users_router.put('/:uuid', async (c) => {
  try {
    const uuid = c.req.param('uuid');
    const body = await c.req.json();

    // Check if user exists
    const existingUser = await db.select().from(users).where(eq(users.uuid, uuid)).get();

    if (!existingUser) {
      return c.json({
        success: false,
        error: 'User not found'
      }, 404);
    }

    // Update user
    const updateData: any = {};
    if (body.name) updateData.name = body.name;
    if (body.email) updateData.email = body.email;
    if (body.active !== undefined) updateData.active = body.active;
    if (body.context !== undefined) updateData.context = body.context;
    if (body.environment !== undefined) {
      updateData.environment = typeof body.environment === 'string' 
        ? body.environment 
        : JSON.stringify(body.environment);
    }

    const result = await db.update(users).set(updateData).where(eq(users.uuid, uuid)).returning();

    return c.json({
      success: true,
      data: {
        uuid: result[0].uuid,
        name: result[0].name,
        email: result[0].email,
        active: result[0].active
      },
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return c.json({
      success: false,
      error: 'Failed to update user'
    }, 500);
  }
});

// DELETE /api/users/:uuid - Deactivate user
users_router.delete('/:uuid', async (c) => {
  try {
    const uuid = c.req.param('uuid');

    // Check if user exists
    const existingUser = await db.select().from(users).where(eq(users.uuid, uuid)).get();

    if (!existingUser) {
      return c.json({
        success: false,
        error: 'User not found'
      }, 404);
    }

    // Deactivate user
    await db.update(users).set({ active: false }).where(eq(users.uuid, uuid));

    return c.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    console.error('Error deactivating user:', error);
    return c.json({
      success: false,
      error: 'Failed to deactivate user'
    }, 500);
  }
});

export { users_router };
