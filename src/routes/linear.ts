import { Hono } from 'hono';
import { AppEnv } from '../types/hono';
import { linearService } from '../services/tools/linear.service';
import { LinearClient } from '@linear/sdk';

const linear = new Hono<AppEnv>()
  .get('/projects', async c => {
    try {
      const projects = await linearService.fetchProjects();
      return c.json({ 
        success: true, 
        data: projects.map(project => ({
          uuid: project.id,
          name: project.name,
          description: project.description,
          state: project.state
        }))
      });
    } catch (error) {
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500);
    }
  })
  .get('/states', async c => {
    try {
      const states = await linearService.fetchTeamStates();
      return c.json({ 
        success: true, 
        data: states.map(state => ({
          uuid: state.id,
          name: state.name,
          type: state.type,
          color: state.color
        }))
      });
    } catch (error) {
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500);
    }
  })
  .get('/teams', async c => {
    try {
      if (!process.env.LINEAR_API_KEY) {
        return c.json({
          success: false,
          error: 'LINEAR_API_KEY not configured'
        }, 400);
      }

      const linearClient = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });
      const teams = await linearClient.teams();
      
      return c.json({ 
        success: true, 
        data: teams.nodes.map(team => ({
          id: team.id,
          name: team.name,
          key: team.key,
          description: team.description
        })),
        message: 'Use one of these team IDs for LINEAR_DEFAULT_TEAM_ID in your .env file'
      });
    } catch (error) {
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch teams'
      }, 500);
    }
  })
  .get('/users', async c => {
    try {
      if (!process.env.LINEAR_API_KEY) {
        return c.json({
          success: false,
          error: 'LINEAR_API_KEY not configured'
        }, 400);
      }

      const linearClient = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });
      const users = await linearClient.users();
      
      return c.json({ 
        success: true, 
        data: users.nodes.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          displayName: user.displayName,
          active: user.active
        })).filter(user => user.active),
        message: 'Use one of these user IDs for LINEAR_DEFAULT_ASSIGNEE_ID in your .env file'
      });
    } catch (error) {
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch users'
      }, 500);
    }
  })
  .get('/setup', async c => {
    try {
      if (!process.env.LINEAR_API_KEY) {
        return c.json({
          success: false,
          error: 'LINEAR_API_KEY not configured. Please add it to your .env file first.'
        }, 400);
      }

      const linearClient = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });
      const [teams, users] = await Promise.all([
        linearClient.teams(),
        linearClient.users()
      ]);

      const activeUsers = users.nodes.filter(user => user.active);
      const currentUser = activeUsers.find(user => user.email && user.active);

      return c.json({
        success: true,
        setup: {
          teams: teams.nodes.map(team => ({
            id: team.id,
            name: team.name,
            key: team.key,
            description: team.description
          })),
          users: activeUsers.map(user => ({
            id: user.id,
            name: user.name,
            email: user.email,
            displayName: user.displayName
          })),
          recommendations: {
            defaultTeam: teams.nodes[0]?.id || '',
            defaultAssignee: currentUser?.id || activeUsers[0]?.id || ''
          }
        },
        instructions: {
          step1: 'Add these environment variables to your .env file:',
          variables: {
            LINEAR_DEFAULT_TEAM_ID: teams.nodes[0]?.id || 'TEAM_ID_HERE',
            LINEAR_DEFAULT_ASSIGNEE_ID: currentUser?.id || activeUsers[0]?.id || 'USER_ID_HERE'
          },
          step2: 'Restart your application for changes to take effect'
        }
      });
    } catch (error) {
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch setup information'
      }, 500);
    }
  });

export default linear; 