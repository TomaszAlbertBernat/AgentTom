/**
 * Web service for scraping and searching web content
 * Provides functionality for content extraction from URLs, intelligent web search,
 * and document creation from web sources using Firecrawl API
 * @module web.service
 */

// cSpell:ignore websearch

import FirecrawlApp from '@mendable/firecrawl-js';
import {z} from 'zod';
import {v4 as uuidv4} from 'uuid';
import {documentService} from '../agent/document.service';
import {createTokenizer} from '../common/text.service';
import { ValidationError } from '../../utils/errors';
import type {DocumentType} from '../agent/document.service';
import {whitelistedDomains} from '../../config/websearch.config';
import {prompt as useSearchPrompt} from '../../prompts/tools/search.use';
import {prompt as askSearchPrompt} from '../../prompts/tools/search.ask';

import {completion} from '../common/llm.service';
import {stateManager} from '../agent/state.service';
import {createTextService} from '../common/text.service';
import { env } from '../../config/env.config';
import { createLogger } from '../common/logger.service';

/**
 * Environment schema for validating required API keys
 * @constant
 */
const envSchema = z.object({
  FIRECRAWL_API_KEY: z.string()
});

/**
 * Schema for validating search payload
 * @constant
 */
const searchPayloadSchema = z.object({
  query: z.string()
});

/**
 * Schema for validating get contents payload
 * @constant
 */
const getContentsPayloadSchema = z.object({
  url: z.string()
});

/**
 * Successful scrape response containing markdown content
 * @interface ScrapeResponse
 */
interface ScrapeResponse {
  /** Scraped content in markdown format */
  markdown: string;
}

/**
 * Error response from scraping operation
 * @interface ErrorResponse
 */
interface ErrorResponse {
  /** Error message describing what went wrong */
  error: string;
}

/**
 * Union type for scrape operation results
 * @type ScrapeResult
 */
type ScrapeResult = ScrapeResponse | ErrorResponse;

/**
 * Web service for content scraping and intelligent search operations
 * Integrates with Firecrawl API for reliable web content extraction
 * @namespace webService
 */
const webService = {
  log: createLogger('Tools:Web'),
  /**
   * Creates a Firecrawl client instance with API key validation
   * @returns Configured FirecrawlApp instance
   * @throws Error if FIRECRAWL_API_KEY environment variable is missing
   * @example
   * ```typescript
   * const client = webService.createClient();
   * ```
   */
  createClient: () => {
    const env = envSchema.parse(process.env);
    return new FirecrawlApp({apiKey: env.FIRECRAWL_API_KEY});
  },

  /**
   * Scrapes content from a URL and creates a document
   * @param url - The URL to scrape content from
   * @param conversation_uuid - UUID of the current conversation
   * @returns Promise that resolves to a document containing the scraped content
   * @throws Error if scraping fails or URL is inaccessible
   * @example
   * ```typescript
   * const doc = await webService.getContents('https://example.com', 'conv-123');
   * console.log(`Scraped ${doc.text.length} characters from the webpage`);
   * ```
   */
  getContents: async (url: string, conversation_uuid: string): Promise<DocumentType> => {
    try {
      const firecrawl = webService.createClient();
      const tokenizer = await createTokenizer();

      const scrape_result = await firecrawl.scrapeUrl(url, {formats: ['markdown']}) as ScrapeResult;

      if ('error' in scrape_result) {
        throw new ValidationError(scrape_result.error);
      }

      const content = scrape_result.markdown?.trim() || '';
      
      if (!content) {
        return documentService.createDocument({
          conversation_uuid,
          source_uuid: conversation_uuid,
          text: `No content could be loaded from ${url}. The page might be empty or inaccessible.`,
          content_type: 'full',
          name: `Empty content from ${url}`,
          description: `Failed to load content from ${url}`,
          metadata_override: {
            type: 'text',
            content_type: 'full',
            source: url,
            urls: [url],
            tokens: 0,
            conversation_uuid,
            source_uuid: conversation_uuid
          }
        });
      }

      const tokens = tokenizer.countTokens(content);

      return documentService.createDocument({
        conversation_uuid,
        source_uuid: conversation_uuid,
        text: content || 'No content could be loaded from this URL',
        content_type: 'full',
        name: `Web content from ${url}`,
        description: `Scraped content from ${url}`,
        metadata_override: {
          type: 'text',
          content_type: 'full',
          source: url,
          urls: [url],
          tokens,
          conversation_uuid,
          source_uuid: conversation_uuid
        }
      });
    } catch (error) {
      const tokenizer = await createTokenizer();
      const error_text = `Failed to fetch content: ${error instanceof Error ? error.message : 'Unknown error'}`;
      const tokens = tokenizer.countTokens(error_text);

      return documentService.createDocument({
        conversation_uuid,
        source_uuid: conversation_uuid,
        text: error_text,
        content_type: 'full',
        name: 'Web Scraping Error',
        description: `Failed to scrape content from ${url}`,
        metadata_override: {
          type: 'text',
          content_type: 'full',
          source: url,
          urls: [url],
          uuid: uuidv4(),
          tokens,
          conversation_uuid,
          source_uuid: conversation_uuid
        }
      });
    }
  },

  /**
   * Executes web operations based on action type and payload
   * Currently supports intelligent web search with AI-powered query generation
   * @param action - The action to perform ('search' or 'getContents')
   * @param payload - Action-specific payload data
   * @returns Promise that resolves to a document containing the operation result
   * @throws Error if action is invalid or operation fails
   * @example
   * ```typescript
   * // Perform intelligent web search
   * const doc = await webService.execute('search', {
   *   query: 'latest developments in AI'
   * });
   * 
   * // Get contents from specific URL
   * const doc = await webService.execute('getContents', {
   *   url: 'https://example.com/article'
   * });
   * ```
   */
  async execute(action: string, payload: unknown): Promise<DocumentType> {
    if (action === 'search') {
      const { query } = searchPayloadSchema.parse(payload);
      const state = stateManager.getState();
      const conversation_uuid = state.config.conversation_uuid ?? 'unknown';
      const text_service = await createTextService({model_name: env.DEFAULT_TEXT_MODEL || 'gemini-2.5-flash'});

      // 1. Check if search is needed
      const searchNecessity = await completion.object<{shouldSearch: boolean, _thoughts: string}>({
        messages: [{role: 'system', content: useSearchPrompt()}, {role: 'user', content: query}],
        // NOTE: Never use 'gemini-2.0-flash'.
        model: state.config.model ?? 'gemini-2.5-flash',
        temperature: 0,
        user: {
          uuid: state.config.user_uuid ?? '',
          name: state.profile.user_name
        }
      });

      if (!searchNecessity.shouldSearch) {
        return documentService.createDocument({
          conversation_uuid,
          source_uuid: conversation_uuid,
          text: searchNecessity._thoughts,
          metadata_override: {
            type: 'document',
            content_type: 'full',
            name: 'SearchSkipped',
            source: 'web',
            description: 'Search was not necessary based on the query'
          }
        });
      }

      // 2. Generate queries
      const queryGeneration = await completion.object<{queries: Array<{q: string, url: string}>, _thoughts: string}>({
        messages: [{role: 'system', content: askSearchPrompt(whitelistedDomains)}, {role: 'user', content: query}],
        // NOTE: Never use 'gemini-2.0-flash'.
        model: state.config.model ?? 'gemini-2.5-flash',
        temperature: 0,
        user: {
          uuid: state.config.user_uuid ?? '',
          name: state.profile.user_name
        }
      });

      if (!queryGeneration.queries.length) {
        return documentService.createDocument({
          conversation_uuid,
          source_uuid: conversation_uuid,
          text: 'No valid search queries could be generated.',
          metadata_override: {
            type: 'document',
            content_type: 'full',
            name: 'NoQueriesGenerated',
            source: 'web',
            description: 'Failed to generate valid search queries'
          }
        });
      }

      // 3. Execute searches
      const searchResults = await Promise.all(
        queryGeneration.queries.map(async ({q, url}) => {
          try {
            const response = await webService.createClient().scrapeUrl(url, {formats: ['markdown']}) as ScrapeResult;
            if ('error' in response) {
              throw new Error(response.error);
            }
            if (!response.markdown) {
              throw new Error('No markdown content found');
            }
            return {
              url,
              content: response.markdown,
              query: q
            };
          } catch (error) {
            webService.log.error(`Failed to scrape ${url}`, error as Error);
            return null;
          }
        })
      );

      const validResults = searchResults.filter((result): result is NonNullable<typeof result> => result !== null);

      if (validResults.length === 0) {
        return documentService.createDocument({
          conversation_uuid,
          source_uuid: conversation_uuid,
          text: 'No valid search results found.',
          metadata_override: {
            type: 'document',
            content_type: 'full',
            name: 'NoResultsFound',
            source: 'web',
            description: 'Failed to find any valid search results'
          }
        });
      }

      // 4. Create documents from results
      const documents = await Promise.all(
        validResults.map(async (result) => {
          const [tokenized_content] = await text_service.split(result.content, Infinity);
          return documentService.createDocument({
            conversation_uuid,
            source_uuid: conversation_uuid,
            text: result.content,
            metadata_override: {
              type: 'document',
              content_type: 'full',
              name: `SearchResult-${result.url}`,
              source: 'web',
              description: `Search result for query: ${result.query}`,
              urls: [result.url]
            }
          });
        })
      );

      return documentService.createDocument({
        conversation_uuid,
        source_uuid: conversation_uuid,
        text: `Found ${documents.length} relevant documents.`,
        metadata_override: {
          type: 'document',
          content_type: 'full',
          name: 'SearchSummary',
          source: 'web',
          description: `Search completed with ${documents.length} results`
        }
      });
    }

    if (action === 'getContents') {
      const { url } = getContentsPayloadSchema.parse(payload);
      return webService.getContents(url, 'unknown');
    }

    throw new ValidationError(`Unknown action: ${action}`);
  }
};

export {webService};
