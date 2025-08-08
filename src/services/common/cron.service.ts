/**
 * Cron job management service for scheduled task execution.
 * Handles creation, scheduling, and execution of recurring and one-time tasks.
 * Supports cron expressions, scheduled execution, and recurring tasks.
 * @module cron.service
 */

import { eq, and, lte, isNull } from 'drizzle-orm';
import parser from 'cron-parser';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../database';
import { jobs } from '../../schema/jobs';
import type { Job, NewJob } from '../../schema/jobs';
import type { Task } from '../../schema/task';
import { taskService } from '../agent/task.service';
import { conversationService } from '../agent/conversation.service';
import { createLogger } from './logger.service';
const cronLog = createLogger('CronService');

/**
 * Parameters for creating a new cron job
 * @interface CreateJobParams
 */
interface CreateJobParams {
  /** Human-readable name for the job */
  name: string;
  /** Type of job scheduling */
  type: 'cron' | 'scheduled' | 'recurring';
  /** Schedule string (cron expression or ISO date) */
  schedule: string;
  /** UUID of the task to execute */
  task_uuid: string;
  /** Optional metadata for the job */
  metadata?: {
    /** Job description */
    description?: string;
    /** Additional custom properties */
    [key: string]: any;
  };
}

/**
 * Cron service for managing scheduled jobs and task execution
 * @namespace cronService
 */
export const cronService = {
  /** Private interval reference for the job checker */
  private_interval: null as NodeJS.Timer | null,
  /** Service logger */
  log: createLogger('CronService'),

  /**
   * Initializes the cron service with periodic job checking
   * @param {number} check_interval - Interval in milliseconds for checking pending jobs (default: 60000)
   * @returns {Promise<void>}
   */
  async initialize(check_interval = 60000) {
    if (this.private_interval) {
      clearInterval(this.private_interval);
    }
    
    this.log.startup('Starting cron service', { check_interval });
    this.private_interval = setInterval(async () => {
      try {
        await this.checkJobs();
      } catch (error) {
        this.log.error('Error in checkJobs interval', error as Error);
      }
    }, check_interval);
    
    // Run immediately on start
    this.checkJobs().catch(error => this.log.error('Error in initial checkJobs', error as Error));
    this.log.startup('Cron service initialized');
  },

  /**
   * Creates a new cron job with the specified parameters
   * @param {CreateJobParams} params - Job creation parameters
   * @param {string} params.name - Human-readable name for the job
   * @param {'cron'|'scheduled'|'recurring'} params.type - Type of job scheduling
   * @param {string} params.schedule - Schedule string (cron expression or ISO date)
   * @param {string} params.task_uuid - UUID of the task to execute
   * @param {Object} [params.metadata] - Optional metadata for the job
   * @returns {Promise<Job>} The created job object
   * @throws {Error} When job type is invalid or schedule parsing fails
   */
  async createJob({ name, type, schedule, task_uuid, metadata }: CreateJobParams): Promise<Job> {
    let next_run: string;

    try {
      if (type === 'cron') {
        const interval = parser.parseExpression(schedule, {
          tz: process.env.APP_TIMEZONE || 'Europe/Warsaw'
        });
        next_run = interval.next().toDate().toISOString();
      } else if (type === 'scheduled' || type === 'recurring') {
        next_run = new Date(schedule).toISOString();
      } else {
        throw new Error('Invalid job type');
      }

      const newJob: NewJob = {
        uuid: uuidv4(),
        name,
        type,
        schedule,
        task_uuid,
        next_run,
        metadata: metadata ? JSON.stringify(metadata) : null,
        status: 'pending'
      };

      const [job] = await db.insert(jobs).values(newJob).returning();
      return job;
    } catch (error) {
      this.log.error('Failed to create job', error as Error);
      throw error;
    }
  },

  /**
   * Checks for pending jobs that are ready to be executed
   * Converts times to Poland timezone and processes eligible jobs
   * @returns {Promise<void>}
   */
  async checkJobs() {
    // console.log('Checking for pending jobs...');
    try {
      // Convert current time to configured timezone
      const currentTime = new Date().toLocaleString('en-US', { 
        timeZone: process.env.APP_TIMEZONE || 'Europe/Warsaw',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).replace(/(\d+)\/(\d+)\/(\d+),\s(\d+):(\d+):(\d+)/, '$3-$1-$2T$4:$5:$6Z');

    //   this.log.debug('Current time', { currentTime });

      const pending_jobs = await db
        .select()
        .from(jobs)
        .where(
          and(
            eq(jobs.status, 'pending'),
            lte(jobs.next_run, currentTime)
          )
        );

    //   this.log.debug('Pending jobs', { pending_jobs_count: pending_jobs.length });

      this.log.info(`Found ${pending_jobs.length} pending jobs`);

      for (const job of pending_jobs) {
        this.log.info(`Processing job: ${job.uuid} (${job.name})`);
        await this.processJob(job);
      }
    } catch (error) {
      this.log.error('Error checking jobs', error as Error);
    }
  },

  /**
   * Processes a single job by executing it and updating its status
   * Handles job state transitions, scheduling next runs, and error handling
   * @param {Job} job - The job to process
   * @returns {Promise<void>}
   */
  async processJob(job: Job) {
    this.log.debug(`Starting to process job ${job.uuid}`);
    try {
      await db
        .update(jobs)
        .set({ status: 'running' })
        .where(eq(jobs.uuid, job.uuid));
      this.log.debug(`Job ${job.uuid} marked as running`);

      const conversation_uuid = uuidv4();
      const task = await taskService.createTasks(conversation_uuid, [{
        name: job.name,
        description: typeof job.metadata === 'string' 
          ? (JSON.parse(job.metadata) as { description?: string })?.description || ''
          : (job.metadata as { description?: string } | null)?.description || '',
        status: 'pending',
        uuid: job.task_uuid
      }]);

      const execution_result = await this.executeJob(job);
      this.log.info(`Job ${job.uuid} executed`, { execution_result });

      let next_run: string | null = null;
      if (job.type === 'cron') {
        const interval = parser.parseExpression(job.schedule, {
          currentDate: new Date(),
          iterator: true,
          tz: process.env.APP_TIMEZONE || 'Europe/Warsaw'
        });
        next_run = interval.next().value.toISOString();
        this.log.debug(`Next run for job ${job.uuid} scheduled`, { next_run });
      } else if (job.type === 'recurring') {
        next_run = new Date(job.schedule).toISOString();
      }

      await db
        .update(jobs)
        .set({
          status: next_run ? 'pending' : 'completed',
          last_run: new Date().toISOString(),
          next_run,
          result: JSON.stringify(execution_result),
          updated_at: new Date().toISOString()
        })
        .where(eq(jobs.uuid, job.uuid));
      this.log.info(`Job ${job.uuid} completed and updated`);

    } catch (error: any) {
      this.log.error(`Error processing job ${job.uuid}`, error as Error);
      await db
        .update(jobs)
        .set({
          status: 'failed',
          result: JSON.stringify({
            error: error.message,
            timestamp: new Date().toISOString()
          }),
          updated_at: new Date().toISOString()
        })
        .where(eq(jobs.uuid, job.uuid));
    }
  },

  /**
   * Executes a job by creating a conversation and task, then running it
   * @param {Job} job - The job to execute
   * @returns {Promise<any>} The execution result
   * @throws {Error} When job execution fails
   */
  async executeJob(job: Job) {
    this.log.debug(`Executing job ${job.uuid}`);
    try {
      const conversation_uuid = uuidv4();
      const metadata = typeof job.metadata === 'string' 
        ? JSON.parse(job.metadata) as { description?: string; [key: string]: any }
        : job.metadata as { description?: string; [key: string]: any } | null;

      // Create conversation first
      await conversationService.create({
        uuid: conversation_uuid,
        user_id: 'system', // Since this is a system-initiated task
        name: `Scheduled Task: ${job.name}`
      });

      // Create task with proper data structure
      const task_data = [{
        name: job.name,
        description: metadata?.description || job.name,
        status: 'pending' as const,
        uuid: null
      }];

      this.log.debug('Creating task with data', { conversation_uuid, task_count: task_data.length });

      const tasks = await taskService.createTasks(conversation_uuid, task_data);

      this.log.debug('Created tasks', { count: tasks.length });

      if (!tasks.length || !tasks[0]) {
        throw new Error('Failed to create task');
      }

      // Query /api/agi/chat with conversation_uuid and metadata description
      const description = metadata?.description || job.name;
      await queryAgiChat(conversation_uuid, description);

      return {
        status: 'success',
        execution_time: new Date().toISOString(),
        job_id: job.uuid,
        task_id: tasks[0].uuid
      };
    } catch (error) {
      this.log.error(`Error executing job ${job.uuid}`, error as Error);
      throw error;
    }
  },

  /**
   * Cancels a job by setting its status to 'cancelled'
   * @param {string} job_uuid - UUID of the job to cancel
   * @returns {Promise<void>}
   * @throws {Error} When job cancellation fails
   */
  async cancelJob(job_uuid: string): Promise<void> {
    try {
      await db
        .update(jobs)
        .set({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .where(eq(jobs.uuid, job_uuid));
    } catch (error) {
      this.log.error('Error cancelling job', error as Error);
      throw error;
    }
  },

  /**
   * Retrieves a job by its UUID
   * @param {string} job_uuid - UUID of the job to retrieve
   * @returns {Promise<Job|null>} The job object or null if not found
   * @throws {Error} When job retrieval fails
   */
  async getJob(job_uuid: string): Promise<Job | null> {
    try {
      const [job] = await db
        .select()
        .from(jobs)
        .where(eq(jobs.uuid, job_uuid));
      return job || null;
    } catch (error) {
      this.log.error('Error getting job', error as Error);
      throw error;
    }
  },

  /**
   * Cleans up the cron service by clearing the job checking interval
   * Should be called when shutting down the application
   * @returns {Promise<void>}
   */
  async cleanup() {
    if (this.private_interval) {
      clearInterval(this.private_interval);
      this.private_interval = null;
    }
  }
};

/**
 * Queries the AGI chat API to execute a scheduled task
 * @param {string} conversation_uuid - UUID of the conversation to use
 * @param {string} description - Description of the task to execute
 * @returns {Promise<void>}
 * @throws {Error} When API query fails or API key is missing
 */
async function queryAgiChat(conversation_uuid: string, description: string) {
  try {
    const base_url = process.env.APP_URL || 'http://localhost:3000';
    const api_key = process.env.API_KEY;

    if (!api_key) {
      throw new Error('API_KEY environment variable is not set');
    }

    const response = await fetch(`${base_url}/api/agi/chat`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + api_key
      },
      body: JSON.stringify({
        conversation_id: conversation_uuid,
        messages: [{ role: 'user', content: `The system has asked you to do the following task due to the schedule: ${description}. \n\n Ensure that the plan of tasks and actions is valid so you can perform it.` }]
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to query AGI chat: ${response.status}`);
    }

    cronLog.info('AGI chat queried successfully');
  } catch (error) {
    cronLog.error('Error querying AGI chat', error as Error);
    throw error;
  }
}
