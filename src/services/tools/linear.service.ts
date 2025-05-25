/**
 * Linear service for managing Linear project management tasks and issues.
 * Provides functionality for creating, updating, and managing Linear tasks and projects.
 * @module linear.service
 */

import { z } from 'zod';
import { LinearClient, Issue, Project, IssueConnection, WorkflowState } from '@linear/sdk';
import { LangfuseSpanClient } from '../../types/langfuse';
import { stateManager } from '../agent/state.service';
import { documentService } from '../agent/document.service';
import type { DocumentType } from '../agent/document.service';
import { IssueFilter } from '@linear/sdk/dist/_generated_documents';


const DEFAULT_TEAM_ID = process.env.LINEAR_DEFAULT_TEAM_ID || '';
const DEFAULT_ASSIGNEE_ID = process.env.LINEAR_DEFAULT_ASSIGNEE_ID || '';

let linearClient: LinearClient | null = null;

if (process.env.LINEAR_API_KEY) {
  try {
    linearClient = new LinearClient({ 
      apiKey: process.env.LINEAR_API_KEY 
    });
  } catch (error) {
    console.error('Failed to initialize Linear client:', error);
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
   * @param {LangfuseSpanClient} [span] - Optional Langfuse span for tracing
   * @returns {Promise<{projectMap: Map<string, ProjectInfo>, stateMap: Map<string, StateInfo>}>} Maps of project and state information
   */
  getContextMaps: async (span?: LangfuseSpanClient) => {
    try {
      span?.event({ name: 'linear_get_context_maps_start' });

      const client = ensureLinearClient();
      const [projects, states] = await Promise.all([
        client.projects(),
        linearService.fetchTeamStates(DEFAULT_TEAM_ID, span)
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

      span?.event({
        name: 'linear_get_context_maps_complete',
        output: { 
          projects: projectMap.size,
          states: stateMap.size
        }
      });

      return { projectMap, stateMap };
    } catch (error) {
      span?.event({
        name: 'linear_get_context_maps_error',
        output: { error: error instanceof Error ? error.message : 'Unknown error' },
        level: 'ERROR'
      });
      throw error;
    }
  }
};

const linearService = {
  createIssue: async (
    payload: z.infer<typeof issueSchema>, 
    span?: LangfuseSpanClient
  ): Promise<Issue | null> => {
    try {
      span?.event({
        name: 'linear_create_issue_start',
        input: { payload }
      });

      const client = ensureLinearClient();
      const result = await client.createIssue(issueSchema.parse(payload));
      
      if (!result.success || !result.issue) {
        span?.event({
          name: 'linear_create_issue_error',
          input: { payload },
          output: { error: 'Issue creation failed' },
          level: 'ERROR'
        });
        return null;
      }

      const issue = await result.issue;

      span?.event({
        name: 'linear_create_issue_success',
        input: { payload },
        output: { issueId: issue.id }
      });

      return issue;
    } catch (error) {
      span?.event({
        name: 'linear_create_issue_error',
        input: { payload },
        output: { error: error instanceof Error ? error.message : 'Unknown error' },
        level: 'ERROR'
      });
      throw error;
    }
  },

  createManyIssues: async (
    issues: z.infer<typeof issueSchema>[], 
    span?: LangfuseSpanClient
  ): Promise<{ successful: Issue[]; failed: Array<{ input: z.infer<typeof issueSchema>; error: Error }> }> => {
    span?.event({
      name: 'linear_create_many_issues_start',
      input: { count: issues.length }
    });

    const results = await Promise.all(
      issues.map(async (issue) => {
        try {
          const result = await linearService.createIssue(issue, span);
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

    span?.event({
      name: 'linear_create_many_issues_complete',
      input: { total: issues.length },
      output: { 
        successful: outcome.successful.length, 
        failed: outcome.failed.length 
      }
    });

    return outcome;
  },

  updateIssue: async (
    payload: z.infer<typeof updateIssueSchema>, 
    span?: LangfuseSpanClient
  ): Promise<Issue | null> => {
    try {
      const { issueId, ...updateData } = updateIssueSchema.parse(payload);

      span?.event({
        name: 'linear_update_issue_start',
        input: { issueId, updateData }
      });

      const client = ensureLinearClient();
      const result = await client.updateIssue(issueId, updateData);
      
      if (!result.success || !result.issue) {
        span?.event({
          name: 'linear_update_issue_error',
          input: { issueId, updateData },
          output: { error: 'Issue update failed' },
          level: 'ERROR'
        });
        return null;
      }

      span?.event({
        name: 'linear_update_issue_success',
        input: { issueId },
        output: { issue: (await result.issue).id }
      });

      return result.issue;
    } catch (error) {
      span?.event({
        name: 'linear_update_issue_error',
        input: payload,
        output: { error: error instanceof Error ? error.message : 'Unknown error' },
        level: 'ERROR'
      });
      throw error;
    }
  },

  fetchIssues: async (
    params: z.infer<typeof searchIssuesSchema>, 
    span?: LangfuseSpanClient
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
      span?.event({
        name: 'linear_fetch_issues_error',
        input: params,
        output: { error: error instanceof Error ? error.message : 'Unknown error' },
        level: 'ERROR'
      });
      throw error;
    }
  },

  fetchProjects: async (span?: LangfuseSpanClient) => {
    try {
      span?.event({ name: 'linear_fetch_projects_start' });
      const client = ensureLinearClient();
      const projects = await client.projects();
      
      span?.event({
        name: 'linear_fetch_projects_complete',
        output: { count: projects.nodes.length }
      });

      return projects.nodes;
    } catch (error) {
      span?.event({
        name: 'linear_fetch_projects_error',
        output: { error: error instanceof Error ? error.message : 'Unknown error' },
        level: 'ERROR'
      });
      throw error;
    }
  },

  fetchProjectDetails: async (projectId: string, span?: LangfuseSpanClient): Promise<Project | null> => {
    try {
      span?.event({
        name: 'linear_fetch_project_details_start',
        input: { projectId }
      });

      const client = ensureLinearClient();
      const project = await client.project(projectId);
      
      span?.event({
        name: 'linear_fetch_project_details_complete',
        input: { projectId },
        output: { found: !!project }
      });

      return project;
    } catch (error) {
      span?.event({
        name: 'linear_fetch_project_details_error',
        input: { projectId },
        output: { error: error instanceof Error ? error.message : 'Unknown error' },
        level: 'ERROR'
      });
      throw error;
    }
  },

  fetchTeamStates: async (teamId: string = DEFAULT_TEAM_ID, span?: LangfuseSpanClient): Promise<WorkflowState[]> => {
    try {
      span?.event({
        name: 'linear_fetch_team_states_start',
        input: { teamId }
      });

      const client = ensureLinearClient();
      const team = await client.team(teamId);
      if (!team) {
        throw new Error(`Team not found: ${teamId}`);
      }

      const states = await team.states();
      
      span?.event({
        name: 'linear_fetch_team_states_complete',
        input: { teamId },
        output: { count: states.nodes.length }
      });

      return states.nodes;
    } catch (error) {
      span?.event({
        name: 'linear_fetch_team_states_error',
        input: { teamId },
        output: { error: error instanceof Error ? error.message : 'Unknown error' },
        level: 'ERROR'
      });
      throw error;
    }
  },

  formatIssues: async (issues: Issue[], span?: LangfuseSpanClient): Promise<string> => {
    try {
      span?.event({
        name: 'linear_format_issues_start',
        input: { issueCount: issues.length }
      });

      const { projectMap, stateMap } = await formatters.getContextMaps(span);
      
      // Wait for all issue details to be formatted
      const formattedIssues = await Promise.all(
        issues.map(issue => formatters.formatIssueDetails(issue, projectMap, stateMap))
      );

      const report = formatters.formatTasksReport(
        issues.length,
        projectMap.size,
        formattedIssues
      );

      span?.event({
        name: 'linear_format_issues_complete',
        output: { formattedCount: formattedIssues.length }
      });

      return report;
    } catch (error) {
      span?.event({
        name: 'linear_format_issues_error',
        output: { error: error instanceof Error ? error.message : 'Unknown error' },
        level: 'ERROR'
      });
      throw error;
    }
  },

  execute: async (
    action: string,
    payload: unknown,
    span?: LangfuseSpanClient
  ): Promise<DocumentType> => {
    const state = stateManager.getState();
    try {
      // Validate the action
      if (!LINEAR_ACTIONS.includes(action as any)) {
        throw new Error(`Unknown action: ${action}`);
      }

      span?.event({
        name: 'linear_execute_start',
        input: { action, payload }
      });

      switch (action) {
        case 'add_tasks': {
          const { tasks, conversation_uuid } = addTasksPayloadSchema.parse(payload);
          const result = await linearService.createManyIssues(tasks, span);
          
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
            tasks.map(task => linearService.updateIssue(task, span))
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
          
          const issues = await linearService.fetchIssues({ projectIds, startDate, endDate }, span);
          const formattedContent = await linearService.formatIssues(issues, span);

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
          const projects = await linearService.fetchProjects(span);
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
          const states = await linearService.fetchTeamStates(DEFAULT_TEAM_ID, span);
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
      span?.event({
        name: 'linear_execute_error',
        input: { action, payload },
        output: { error: error instanceof Error ? error.message : 'Unknown error' },
        level: 'ERROR'
      });

      return documentService.createErrorDocument({
        error: error instanceof Error ? error : new Error('Unknown error'),
        conversation_uuid: state.config.conversation_uuid ?? 'unknown',
        source_uuid: state.config.conversation_uuid ?? 'unknown',
        context: `Failed to execute Linear action: ${action}`
      });
    }
  },

  getRecentTasksContext: async (span?: LangfuseSpanClient): Promise<DocumentType> => {
    const today = new Date();
    const startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const state = stateManager.getState();

    return linearService.execute('search_tasks', {
      projectIds: [], // Empty array to fetch from all projects
      startDate,
      endDate,
      conversation_uuid: state.config.conversation_uuid ?? 'unknown'
    }, span);
  }
};

export { linearService };