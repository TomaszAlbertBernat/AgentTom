import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database';
import { users } from '../schema/user';
import { eq } from 'drizzle-orm';
import type { AppEnv } from '../types/hono';
import { 
  selectColumns, 
  getPaginationParams, 
  measureQueryTime, 
  PaginationOptions 
} from '../database/query-utils';
import { logger } from '../services/common/logger.service';

const userLogger = logger.child('USER_ROUTES');
const users_router = new Hono<AppEnv>();

// Basic validation schemas
const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  token: z.string().optional()
});

// Pagination schema
const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  orderBy: z.enum(['name', 'email', 'createdAt', 'updatedAt']).default('createdAt'),
  orderDir: z.enum(['asc', 'desc']).default('desc')
});

// User columns for list view (excluding sensitive data)
const LIST_COLUMNS = ['id', 'uuid', 'name', 'email', 'active', 'createdAt', 'updatedAt'];

// GET /api/users - List all users with pagination
users_router.get('/', zValidator('query', paginationSchema), async (c) => {
  try {
    const query = c.req.valid('query');
    
    return await measureQueryTime('users-list', async () => {
      const { limit, offset, page, orderBy, orderDir } = getPaginationParams(query);
      
      const [users, countResult] = await Promise.all([
        db.select(selectColumns(users, LIST_COLUMNS))
          .from(users)
          .limit(limit)
          .offset(offset)
          .orderBy(users[orderBy as keyof typeof users], orderDir),
          
        db.select({ count: db.fn.count() }).from(users)
      ]);
      
      const total = Number(countResult[0]?.count || 0);
      const totalPages = Math.ceil(total / limit);
      
      return c.json({
        success: true,
        data: users,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasMore: page < totalPages
        }
      });
    });
  } catch (error) {
    userLogger.error('Error fetching users:', error as Error);
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
    
    return await measureQueryTime(`user-get-${uuid.slice(0, 8)}`, async () => {
      // Select only needed columns excluding sensitive tokens
      const [user] = await db
        .select({
          id: users.id,
          uuid: users.uuid,
          name: users.name,
          email: users.email,
          active: users.active,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          context: users.context,
          environment: users.environment
        })
        .from(users)
        .where(eq(users.uuid, uuid));

      if (!user) {
        return c.json({
          success: false,
          error: 'User not found'
        }, 404);
      }

      return c.json({
        success: true,
        data: user
      });
    });
  } catch (error) {
    userLogger.error('Error fetching user:', error as Error);
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

    return await measureQueryTime(`user-update-${uuid.slice(0, 8)}`, async () => {
      // Check if user exists - select only id for efficiency
      const [existingUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.uuid, uuid));

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
      
      // Always update the timestamp
      updateData.updatedAt = new Date();

      const result = await db
        .update(users)
        .set(updateData)
        .where(eq(users.uuid, uuid))
        .returning({
          uuid: users.uuid,
          name: users.name,
          email: users.email,
          active: users.active
        });

      return c.json({
        success: true,
        data: result[0],
        message: 'User updated successfully'
      });
    });
  } catch (error) {
    userLogger.error('Error updating user:', error as Error);
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
