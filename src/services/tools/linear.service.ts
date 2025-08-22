/**
 * Linear service for managing Linear project management tasks and issues.
 * Provides functionality for creating, updating, and managing Linear tasks and projects.
 * @module linear.service
 */

import { z } from 'zod';
import { LinearClient, Issue, Project, IssueConnection, WorkflowState } from '@linear/sdk';

import { stateManager } from '../agent/state.service';
import { documentService } from '../agent/document.service';
import type { DocumentType } from '../agent/document.service';
import { IssueFilter } from '@linear/sdk/dist/_generated_documents';
import { createLogger } from '../common/logger.service';
const log = createLogger('Tools:Linear');


const DEFAULT_TEAM_ID = process.env.LINEAR_DEFAULT_TEAM_ID || '';
const DEFAULT_ASSIGNEE_ID = process.env.LINEAR_DEFAULT_ASSIGNEE_ID || '';

let linearClient: LinearClient | null = null;

if (process.env.LINEAR_API_KEY) {
  try {
    linearClient = new LinearClient({ 
      apiKey: process.env.LINEAR_API_KEY 
    });
  } catch (error) {
    log.error('Failed to initialize Linear client', error as Error);
  }
}

/**
 * Helper function to ensure Linear client is initialized and available
 * @throws {Error} If Linear client is not configured
 * @returns {LinearClient} Initialized Linear client instance
 */
const ensureLinearClient = (): LinearClient => {
  if (!linearClient) {
    throw new Error('Linear not configured. Please set LINEAR_API_KEY in your environment variables.');
  }
  return linearClient;
};

/**
 * Schema for creating a new Linear issue
 * @typedef {Object} IssueSchema
 */
const issueSchema = z.object({
  teamId: z.string().optional().default(DEFAULT_TEAM_ID),
  title: z.string(),
  description: z.string().optional(),
  priority: z.number().optional(),
  assigneeId: z.string().optional().default(DEFAULT_ASSIGNEE_ID),
  projectId: z.string().optional(),
  stateId: z.string().optional(),
  estimate: z.number().optional(),
  labelIds: z.array(z.string()).optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional()
});

/**
 * Schema for updating an existing Linear issue
 * @typedef {Object} UpdateIssueSchema
 */
const updateIssueSchema = z.object({
  issueId: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  priority: z.number().optional(),
  assigneeId: z.string().optional(),
  projectId: z.string().optional(),
  stateId: z.string().optional(),
  estimate: z.number().optional(),
  labelIds: z.array(z.string()).optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional()
});

/**
 * Schema for searching Linear issues
 * @typedef {Object} SearchIssuesSchema
 */
const searchIssuesSchema = z.object({
  projectIds: z.array(z.string()).optional(),
  startDate: z.date(),
  endDate: z.date()
});

/**
 * Schema for adding multiple tasks
 * @typedef {Object} AddTasksPayloadSchema
 */
const addTasksPayloadSchema = z.object({
  tasks: z.array(issueSchema),
  conversation_uuid: z.string().optional()
});

/**
 * Schema for updating multiple tasks
 * @typedef {Object} UpdateTasksPayloadSchema
 */
const updateTasksPayloadSchema = z.object({
  tasks: z.array(updateIssueSchema),
  conversation_uuid: z.string().optional()
});

/**
 * Schema for getting tasks with date range
 * @typedef {Object} GetTasksPayloadSchema
 */
const getTasksPayloadSchema = z.object({
  projectIds: z.array(z.string()).optional(),
  startDate: z.string().transform(str => new Date(str)),
  endDate: z.string().transform(str => new Date(str)),
  conversation_uuid: z.string()
});

/**
 * Available Linear actions
 * @constant {readonly string[]}
 */
const LINEAR_ACTIONS = [
  'add_tasks',
  'update_tasks',
  'search_tasks',
  'get_projects',
  'get_states'
] as const;

/**
 * Interface for project information
 * @interface ProjectInfo
 */
interface ProjectInfo {
  name: string;
  description: string | null;
  state: string;
}

/**
 * Interface for state information
 * @interface StateInfo
 */
interface StateInfo {
  name: string;
  type: string;
  color: string;
}

/**
 * Utility functions for formatting Linear data
 * @namespace formatters
 */
const formatters = {
  /**
   * Converts priority number to human-readable label
   * @param {number|null|undefined} priority - The priority number
   * @returns {string} Formatted priority label
   */
  getPriorityLabel: (priority: number | null | undefined): string => {
    switch (priority) {
      case 0: return "No priority";
      case 1: return "Urgent 🔴";
      case 2: return "High 🟠";
      case 3: return "Medium 🟡";
      case 4: return "Low 🟢";
      default: return "Not set";
    }
  },

  /**
   * Formats a date into a localized string
   * @param {string|Date|null|undefined} date - The date to format
   * @returns {string} Formatted date string
   */
  formatDate: (date: string | Date | null | undefined): string => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  },

  /**
   * Formats project information into a string
   * @param {ProjectInfo|null} project - The project information
   * @returns {string} Formatted project string
   */
  formatProjectInfo: (project: ProjectInfo | null): string => {
    if (!project) return 'Unassigned';
    return `${project.name}${project.description ? ` - ${project.description}` : ''}`;
  },

  /**
   * Formats issue details into a readable string
   * @param {Issue} issue - The Linear issue
   * @param {Map<string, ProjectInfo>} projectMap - Map of project information
   * @param {Map<string, StateInfo>} stateMap - Map of state information
   * @returns {Promise<string>} Formatted issue details
   */
  formatIssueDetails: async (
    issue: Issue, 
    projectMap: Map<string, ProjectInfo>, 
    stateMap: Map<string, StateInfo>
  ): Promise<string> => {
    const project = issue.project ? await issue.project : null;
    const state = issue.state ? await issue.state : null;

    return `
📌 ${issue.title}
Issue ID: ${issue.id}
Project: ${project?.name || 'Unassigned'}
Status: ${state?.name || 'Unknown'}
Priority: ${formatters.getPriorityLabel(issue.priority)}
Created: ${formatters.formatDate(issue.createdAt)}
${issue.startedAt ? `Start Date: ${formatters.formatDate(issue.startedAt)}` : ''}
${issue.dueDate ? `Due Date: ${formatters.formatDate(issue.dueDate)}` : ''}
${issue.description ? `Description: ${issue.description}` : ''}`.trim();
  },

  /**
   * Formats a tasks report with issue count and project information
   * @param {number} issueCount - Number of issues
   * @param {number|undefined} projectCount - Number of projects
   * @param {string[]} formattedIssues - Array of formatted issue strings
   * @returns {string} Formatted tasks report
   */
  formatTasksReport: (
    issueCount: number, 
    projectCount: number | undefined, 
    formattedIssues: string[]
  ): string => {
    const header = `Found ${issueCount} active issues${
      projectCount ? ` across ${projectCount} project(s)` : ''
    }:`;

    return [header, ...formattedIssues].join('\n───────────────────\n');
  },

  /**
   * Formats a list of projects into a readable string
   * @param {Project[]} projects - Array of Linear projects
   * @returns {string} Formatted projects list
   */
  formatProjectsList: (projects: Project[]): string => {
    return projects.map(project => `
🗂️ ${project.name}
ID: ${project.id}
${project.description ? `Description: ${project.description}` : ''}
State: ${project.state}
${project.startDate ? `Start Date: ${formatters.formatDate(project.startDate)}` : ''}
${project.targetDate ? `Target Date: ${formatters.formatDate(project.targetDate)}` : ''}`
    ).join('\n───────────────────\n');
  },

  /**
   * Formats a list of workflow states into a readable string
   * @param {WorkflowState[]} states - Array of Linear workflow states
   * @returns {string} Formatted states list
   */
  formatStatesList: (states: WorkflowState[]): string => {
    return states.map(state => `
⚡ ${state.name}
ID: ${state.id}
Type: ${state.type}
Color: ${state.color}
${state.description ? `Description: ${state.description}` : ''}`
    ).join('\n───────────────\n');
  },

  /**
   * Gets context maps for projects and states
   * @returns {Promise<{projectMap: Map<string, ProjectInfo>, stateMap: Map<string, StateInfo>}>} Maps of project and state information
   */
  getContextMaps: async () => {
    try {
      const client = ensureLinearClient();
      const [projects, states] = await Promise.all([
        client.projects(),
        linearService.fetchTeamStates(DEFAULT_TEAM_ID)
      ]);

      const projectMap = new Map<string, ProjectInfo>(
        projects.nodes.map(project => [
          project.id,
          {
            name: project.name,
            description: project.description,
            state: project.state
          }
        ])
      );

      const stateMap = new Map<string, StateInfo>(
        states.map(state => [
          state.id,
          {
            name: state.name,
            type: state.type,
            color: state.color
          }
        ])
      );


      return { projectMap, stateMap };
    } catch (error) {
      throw error;
    }
  }
};

/**
 * Linear service for managing Linear project management tasks and issues
 * @namespace linearService
 */
const linearService = {
  /**
   * Creates a new Linear issue
   * @param {z.infer<typeof issueSchema>} payload - The issue creation payload
   * @returns {Promise<Issue|null>} The created issue or null if creation failed
   * @throws {Error} If issue creation fails
   */
  createIssue: async (
    payload: z.infer<typeof issueSchema>
  ): Promise<Issue | null> => {
    try {
      const client = ensureLinearClient();
      const result = await client.createIssue(issueSchema.parse(payload));

      if (!result.success || !result.issue) {
        return null;
      }

      const issue = await result.issue;

      return issue;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Creates multiple Linear issues in parallel
   * @param {z.infer<typeof issueSchema>[]} issues - Array of issue creation payloads
   * @returns {Promise<{successful: Issue[], failed: Array<{input: z.infer<typeof issueSchema>, error: Error}>}>} Results of the batch creation
   */
  createManyIssues: async (
    issues: z.infer<typeof issueSchema>[]
  ): Promise<{ successful: Issue[]; failed: Array<{ input: z.infer<typeof issueSchema>; error: Error }> }> => {
    const results = await Promise.all(
      issues.map(async (issue) => {
        try {
          const result = await linearService.createIssue(issue);
          return { success: true, data: result, input: issue };
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error : new Error('Unknown error'), 
            input: issue 
          };
        }
      })
    );

    const outcome = results.reduce((acc, result) => {
      if (result.success && result.data) {
        acc.successful.push(result.data);
      } else if (!result.success) {
        acc.failed.push({ input: result.input, error: result.error as Error });
      }
      return acc;
    }, { successful: [] as Issue[], failed: [] as Array<{ input: z.infer<typeof issueSchema>; error: Error }> });

    return outcome;
  },

  /**
   * Updates an existing Linear issue
   * @param {z.infer<typeof updateIssueSchema>} payload - The issue update payload
   * @returns {Promise<Issue|null>} The updated issue or null if update failed
   * @throws {Error} If issue update fails
   */
  updateIssue: async (
    payload: z.infer<typeof updateIssueSchema>
  ): Promise<Issue | null> => {
    try {
      const { issueId, ...updateData } = updateIssueSchema.parse(payload);


      const client = ensureLinearClient();
      const result = await client.updateIssue(issueId, updateData);
      
      if (!result.success || !result.issue) {
        return null;
      }


      return result.issue;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Fetches Linear issues based on search criteria
   * @param {z.infer<typeof searchIssuesSchema>} params - Search parameters
   * @returns {Promise<Issue[]>} Array of matching issues
   * @throws {Error} If issue fetching fails
   */
  fetchIssues: async (
    params: z.infer<typeof searchIssuesSchema>, 
    
  ): Promise<Issue[]> => {
    try {
      const { projectIds, startDate, endDate } = searchIssuesSchema.parse(params);

      let allIssues: Issue[] = [];
      let hasNextPage = true;
      let endCursor: string | undefined;

      const client = ensureLinearClient();

      while (hasNextPage) {
        const filter: IssueFilter = {
          or: [
            { createdAt: { gte: startDate, lte: endDate } },
            { dueDate: { gte: startDate, lte: endDate } }
          ],
          state: { type: { neq: "completed" } },
          team: { id: { eq: DEFAULT_TEAM_ID } }
        };

        if (projectIds?.length) {
          filter.project = { id: { in: projectIds } };
        }

        const issues: IssueConnection = await client.issues({
          first: 100,
          after: endCursor,
          filter
        });

        allIssues = allIssues.concat(issues.nodes);
        hasNextPage = issues.pageInfo.hasNextPage;
        endCursor = issues.pageInfo.endCursor;
      }

      return allIssues;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Fetches all Linear projects
   * @returns {Promise<Project[]>} Array of all projects
   * @throws {Error} If project fetching fails
   */
  fetchProjects: async () => {
    try {
      const client = ensureLinearClient();
      const projects = await client.projects();
      

      return projects.nodes;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Fetches detailed information about a specific project
   * @param {string} projectId - The ID of the project to fetch
   * @returns {Promise<Project|null>} The project details or null if not found
   * @throws {Error} If project fetching fails
   */
  fetchProjectDetails: async (projectId: string): Promise<Project | null> => {
    try {

      const client = ensureLinearClient();
      const project = await client.project(projectId);
      

      return project;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Fetches workflow states for a team
   * @param {string} [teamId=DEFAULT_TEAM_ID] - The team ID to fetch states for
   * @returns {Promise<WorkflowState[]>} Array of workflow states
   * @throws {Error} If state fetching fails
   */
  fetchTeamStates: async (teamId: string = DEFAULT_TEAM_ID): Promise<WorkflowState[]> => {
    try {

      const client = ensureLinearClient();
      const team = await client.team(teamId);
      if (!team) {
        throw new Error(`Team not found: ${teamId}`);
      }

      const states = await team.states();
      

      return states.nodes;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Formats an array of issues into a readable string
   * @param {Issue[]} issues - Array of issues to format
   * @returns {Promise<string>} Formatted string representation of issues
   * @throws {Error} If formatting fails
   */
  formatIssues: async (issues: Issue[]): Promise<string> => {
    try {

      const { projectMap, stateMap } = await formatters.getContextMaps();
      
      // Wait for all issue details to be formatted
      const formattedIssues = await Promise.all(
        issues.map(issue => formatters.formatIssueDetails(issue, projectMap, stateMap))
      );

      const report = formatters.formatTasksReport(
        issues.length,
        projectMap.size,
        formattedIssues
      );


      return report;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Executes a Linear action with the given payload
   * @param {string} action - The action to execute (must be one of LINEAR_ACTIONS)
   * @param {unknown} payload - The action payload
   * @returns {Promise<DocumentType>} Document containing the action result
   * @throws {Error} If action execution fails
   */
  execute: async (
    action: string,
    payload: unknown,
    
  ): Promise<DocumentType> => {
    const state = stateManager.getState();
    try {
      // Validate the action
      if (!LINEAR_ACTIONS.includes(action as any)) {
        throw new Error(`Unknown action: ${action}`);
      }


      switch (action) {
        case 'add_tasks': {
          const { tasks, conversation_uuid } = addTasksPayloadSchema.parse(payload);
          const result = await linearService.createManyIssues(tasks);
          
          const content = `
Created ${result.successful.length} issues successfully.
${result.failed.length > 0 ? `Failed to create ${result.failed.length} issues.` : ''}

Successfully created issues:
${result.successful.map(issue => `- "${issue.title}" (${issue.id})`).join('\n')}

${result.failed.length > 0 ? `
Failed issues:
${result.failed.map(f => `- "${f.input.title}": ${f.error.message}`).join('\n')}
` : ''}`.trim();

          return documentService.createDocument({
            conversation_uuid: conversation_uuid ?? state.config.conversation_uuid ?? 'unknown',
            source_uuid: conversation_uuid ?? state.config.conversation_uuid ?? 'unknown',
            text: content,
            metadata_override: {
              type: 'document',
              content_type: 'full',
              name: 'CreateIssuesResult',
              source: 'linear',
              description: `Created ${result.successful.length} issues, ${result.failed.length} failed`
            }
          });
        }

        case 'update_tasks': {
          const { tasks, conversation_uuid } = updateTasksPayloadSchema.parse(payload);
          const results = await Promise.all(
            tasks.map(task => linearService.updateIssue(task))
          );

          const successful = results.filter((r): r is Issue => r !== null);
          const failed = results.filter((r): r is null => r === null);

          const content = `
Updated ${successful.length} issues successfully.
${failed.length > 0 ? `Failed to update ${failed.length} issues.` : ''}

Successfully updated issues:
${successful.map(issue => `- "${issue.title}" (${issue.id})`).join('\n')}`;

          return documentService.createDocument({
            conversation_uuid: conversation_uuid ?? state.config.conversation_uuid ?? 'unknown',
            source_uuid: conversation_uuid ?? state.config.conversation_uuid ?? 'unknown',
            text: content,
            metadata_override: {
              type: 'document',
              content_type: 'full',
              name: 'UpdateIssuesResult',
              source: 'linear',
              description: `Updated ${successful.length} issues, ${failed.length} failed`
            }
          });
        }

        case 'search_tasks': {
          const { projectIds, startDate, endDate, conversation_uuid } = getTasksPayloadSchema.parse(payload);
          
          const issues = await linearService.fetchIssues({ projectIds, startDate, endDate });
          const formattedContent = await linearService.formatIssues(issues);

          return documentService.createDocument({
            conversation_uuid: conversation_uuid,
            source_uuid: conversation_uuid,
            text: formattedContent,
            metadata_override: {
              type: 'document',
              content_type: 'full',
              name: 'GetIssuesResult',
              source: 'linear',
              description: `Found ${issues.length} issues`
            }
          });
        }

        case 'get_projects': {
          const projects = await linearService.fetchProjects();
          const formattedContent = formatters.formatProjectsList(projects);

          return documentService.createDocument({
            conversation_uuid: state.config.conversation_uuid ?? 'unknown',
            source_uuid: state.config.conversation_uuid ?? 'unknown',
            text: formattedContent,
            metadata_override: {
              type: 'document',
              content_type: 'full',
              name: 'ProjectsList',
              source: 'linear',
              description: `Listed ${projects.length} projects`
            }
          });
        }

        case 'get_states': {
          const states = await linearService.fetchTeamStates(DEFAULT_TEAM_ID);
          const formattedContent = formatters.formatStatesList(states);

          const conversation_uuid = (payload as any)?.conversation_uuid ?? state.config.conversation_uuid ?? 'unknown';

          return documentService.createDocument({
            conversation_uuid,
            source_uuid: conversation_uuid,
            text: formattedContent,
            metadata_override: {
              type: 'document',
              content_type: 'full',
              name: 'StatesList',
              source: 'linear',
              description: `Listed ${states.length} workflow states`
            }
          });
        }

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {

      return documentService.createErrorDocument({
        error: error instanceof Error ? error : new Error('Unknown error'),
        conversation_uuid: state.config.conversation_uuid ?? 'unknown',
        source_uuid: state.config.conversation_uuid ?? 'unknown',
        context: `Failed to execute Linear action: ${action}`
      });
    }
  },

  /**
   * Gets context about recent tasks (last 7 days and next 7 days)
   * @returns {Promise<DocumentType>} Document containing recent tasks context
   */
  getRecentTasksContext: async (): Promise<DocumentType> => {
    const today = new Date();
    const startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const state = stateManager.getState();

    return linearService.execute('search_tasks', {
      projectIds: [], // Empty array to fetch from all projects
      startDate,
      endDate,
      conversation_uuid: state.config.conversation_uuid ?? 'unknown'
    });
  }
};

export { linearService };