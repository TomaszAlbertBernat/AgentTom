/**
 * Image service for handling image analysis, generation, editing, and variations
 * @module image.service
 */

import { z } from 'zod';
import { stateManager } from '../agent/state.service';
import { documentService } from '../agent/document.service';
import type { Document, DocumentMetadata } from '../../types/document';
import { uploadFile } from '../common/upload.service';
import { FileType } from '../../types/upload';
import { completion } from '../common/llm.service';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { google } from 'googleapis';
import { logger } from '../common/logger.service';
import type { DocumentType } from '../agent/document.service';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Note: LangfuseSpanClient type would need proper import if available
type LangfuseSpanClient = any;

const imagePayloadSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('analyze'),
    payload: z.object({
      image_url: z.string().url(),
      query: z.string().optional(),
      context: z.string().optional()
    })
  }),
  z.object({
    action: z.literal('generate'),
    payload: z.object({
      prompt: z.string(),
      size: z.enum(['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792']).default('1024x1024'),
      quality: z.enum(['standard', 'hd']).default('standard'),
      style: z.enum(['vivid', 'natural']).default('vivid')
    })
  }),
  z.object({
    action: z.literal('edit'),
    payload: z.object({
      image_url: z.string().url(),
      mask_url: z.string().url().optional(),
      prompt: z.string(),
      size: z.enum(['256x256', '512x512', '1024x1024']).default('1024x1024')
    })
  }),
  z.object({
    action: z.literal('variation'),
    payload: z.object({
      image_url: z.string().url(),
      n: z.number().int().min(1).max(10).default(1),
      size: z.enum(['256x256', '512x512', '1024x1024']).default('1024x1024')
    })
  }),
  z.object({
    action: z.literal('upload'),
    payload: z.object({
      image_data: z.string(), // base64 encoded image
      filename: z.string(),
      description: z.string().optional()
    })
  })
]);

const validateImageUrl = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const contentType = response.headers.get('content-type') || '';
    return response.ok && contentType.startsWith('image/');
  } catch {
    return false;
  }
};

const downloadImageAsBase64 = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') || 'image/jpeg';
  return `data:${contentType};base64,${buffer.toString('base64')}`;
};

const uploadImageFromUrl = async (url: string, filename?: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const extension = contentType.split('/')[1] || 'jpg';
  const finalFilename = filename || `image_${Date.now()}.${extension}`;

  const upload_result = await uploadFile({
    uuid: uuidv4(),
    file: new Blob([buffer], { type: contentType }),
    type: FileType.IMAGE,
    original_name: finalFilename
  });

  return `${process.env.APP_URL}/api/files/${upload_result.uuid}`;
};

const uploadImageFromBase64 = async (
  base64: string,
  filename?: string,
  mimeType: string = 'image/png'
): Promise<string> => {
  const buffer = Buffer.from(base64, 'base64');
  const finalFilename = filename || `image_${Date.now()}.png`;

  const upload_result = await uploadFile({
    uuid: uuidv4(),
    file: new Blob([buffer], { type: mimeType }),
    type: FileType.IMAGE,
    original_name: finalFilename
  });

  return `${process.env.APP_URL}/api/files/${upload_result.uuid}`;
};

// Prefer OpenAI DALL·E by default; allow optional Vertex Images provider via env flag
const isVertexImagesEnabled = () => {
  const provider = (process.env.IMAGE_PROVIDER || 'openai').toLowerCase();
  const projectId = process.env.VERTEX_PROJECT_ID;
  const location = process.env.VERTEX_LOCATION;
  return provider === 'vertex' && !!projectId && !!location;
};

/**
 * Generate an image using Vertex AI Images API (Imagen 3) via REST
 * Requires GOOGLE_APPLICATION_CREDENTIALS or ADC, VERTEX_PROJECT_ID, VERTEX_LOCATION
 */
const generateWithVertex = async (prompt: string, size: string) => {
  const projectId = process.env.VERTEX_PROJECT_ID!;
  const location = process.env.VERTEX_LOCATION!;

  // Obtain access token using Google Auth
  const authClient = await google.auth.getClient({
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });
  const accessToken = await authClient.getAccessToken();

  // Map size like "1024x1024" to width/height integers
  const [widthStr, heightStr] = size.split('x');
  const width = parseInt(widthStr, 10) || 1024;
  const height = parseInt(heightStr, 10) || 1024;

  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/imagegeneration:generateImages`;

  const body = {
    // API accepts either { instances: [{ prompt: { text }, ...}] } or { prompt } depending on version.
    // Use instances shape for broader compatibility.
    instances: [
      {
        prompt: { text: prompt },
      }
    ],
    parameters: {
      sampleCount: 1,
      width,
      height,
    }
  } as any;

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Vertex Images generate failed: ${resp.status} ${resp.statusText} ${errText}`);
  }

  const json = await resp.json();

  // Try multiple response shapes
  let base64: string | undefined;
  // Newer Images API
  base64 = base64 || json?.images?.[0]?.bytesBase64Encoded;
  // Prediction-style response
  base64 = base64 || json?.predictions?.[0]?.bytesBase64Encoded;
  // Generic data field (fallback)
  base64 = base64 || json?.data?.[0]?.b64_json;

  if (!base64) {
    throw new Error('Vertex Images response missing base64 image');
  }

  // Upload and return hosted URL
  const uploaded_url = await uploadImageFromBase64(base64, `generated_${Date.now()}.png`, 'image/png');
  return uploaded_url;
};

// Extend DocumentMetadata to include image-related fields
interface ImageDocumentMetadata extends DocumentMetadata {
  image_url?: string;
  image_urls?: string[];
}

const imageService = {
  execute: async (action: string, payload: unknown, span?: LangfuseSpanClient): Promise<DocumentType> => {
    const state = stateManager.getState();
    const conversation_uuid = state.config.conversation_uuid || 'unknown';

    if (!conversation_uuid) {
      return documentService.createErrorDocument({
        error: new Error('No active conversation'),
        conversation_uuid: 'unknown',
        context: 'Image service requires active conversation'
      });
    }

    try {
      const parsed = imagePayloadSchema.parse({ action, payload });

      span?.event({
        name: 'image_action_start',
        input: { action, payload }
      });

      switch (parsed.action) {
        case 'analyze': {
          const { image_url, query, context } = parsed.payload;

          // Validate image URL
          if (!(await validateImageUrl(image_url))) {
            throw new Error('Invalid or inaccessible image URL');
          }

          const analysis_prompt = [
            'Analyze this image in detail.',
            query && `Focus on: ${query}`,
            context && `Context: ${context}`,
            'Provide a comprehensive description including objects, people, settings, colors, mood, and any text visible in the image.'
          ].filter(Boolean).join('\n\n');

          const image_base64 = await downloadImageAsBase64(image_url);

          // NOTE: Never use 'gemini-2.0-flash'. Using 'gemini-2.5-flash'.
          const analysis_result = await completion.text({
            model: 'gemini-2.5-flash',
            messages: [
              {
                role: 'user',
                // Vercel AI SDK supports array content parts with Google provider as well
                // Use image as data URL part
                content: [
                  { type: 'text', text: analysis_prompt },
                  { type: 'image', image: image_base64 } as any
                ]
              }
            ],
            max_tokens: 1000,
            user: { uuid: 'system', name: 'Image Analysis Service' },
            temperature: 0.2
          });

          const analysis_text = typeof analysis_result === 'string' ? analysis_result : 'Unable to analyze image';

          span?.event({
            name: 'image_analysis_success',
            output: { analysis_length: analysis_text.length }
          });

          return documentService.createDocument({
            source_uuid: uuidv4(),
            conversation_uuid,
            text: analysis_text,
            metadata_override: {
              name: 'Image Analysis',
              description: query || 'Image analysis result',
              source: 'image_service',
              mimeType: 'text/plain',
              type: 'text',
              content_type: 'full',
              images: [image_url]
            }
          });
        }

        case 'generate': {
          const { prompt, size, quality, style } = parsed.payload;

          try {
            let uploaded_url: string;
            if (isVertexImagesEnabled()) {
              // Optional Vertex Images provider
              uploaded_url = await generateWithVertex(prompt, size);
            } else {
              // Default: OpenAI DALL·E 3
              const response = await openai.images.generate({
                model: 'dall-e-3',
                prompt,
                n: 1,
                size: size as '1024x1024' | '1792x1024' | '1024x1792',
                quality: quality as 'standard' | 'hd',
                style: style as 'vivid' | 'natural'
              });

              const image_url = response.data[0].url;
              if (!image_url) {
                throw new Error('No image URL in response');
              }
              uploaded_url = await uploadImageFromUrl(image_url, `generated_${Date.now()}.png`);
            }

            span?.event({
              name: 'image_generation_success',
              input: { prompt, size, quality, style },
              output: { image_url: uploaded_url }
            });

            return documentService.createDocument({
              source_uuid: uuidv4(),
              conversation_uuid,
              text: `Generated image based on prompt: "${prompt}"\n\nImage specifications:\n- Size: ${size}\n- Quality: ${quality}\n- Style: ${style}\n\nImage URL: ${uploaded_url}`,
              metadata_override: {
                name: 'Generated Image',
                description: `AI-generated image: ${prompt}`,
                source: 'image_service',
                mimeType: 'text/plain',
                type: 'text',
                content_type: 'full',
                images: [uploaded_url]
              }
            });
          } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            logger.error('Image generation error:', err);
            // Keep error message generic to avoid leaking provider-specific details
            throw new Error('Failed to generate image');
          }
        }

        case 'edit': {
          const { image_url, mask_url, prompt, size } = parsed.payload;

          // Validate URLs
          if (!(await validateImageUrl(image_url))) {
            throw new Error('Invalid or inaccessible image URL');
          }

          if (mask_url && !(await validateImageUrl(mask_url))) {
            throw new Error('Invalid or inaccessible mask URL');
          }

          try {
            const image_base64 = await downloadImageAsBase64(image_url);
            const mask_base64 = mask_url ? await downloadImageAsBase64(mask_url) : undefined;

            const imageBuffer = Buffer.from(image_base64.split(',')[1], 'base64');
            const maskBuffer = mask_base64 ? Buffer.from(mask_base64.split(',')[1], 'base64') : undefined;

            const response = await openai.images.edit({
              image: new File([imageBuffer], 'image.png', { type: 'image/png' }),
              mask: maskBuffer ? new File([maskBuffer], 'mask.png', { type: 'image/png' }) : undefined,
              prompt,
              n: 1,
              size: size as "256x256" | "512x512" | "1024x1024"
            });

            const edited_image_url = response.data[0].url;
            if (!edited_image_url) {
              throw new Error('No edited image URL in response');
            }

            // Upload the edited image to our storage
            const uploaded_url = await uploadImageFromUrl(edited_image_url, `edited_${Date.now()}.png`);

            span?.event({
              name: 'image_edit_success',
              input: { image_url, mask_url, prompt, size },
              output: { edited_image_url: uploaded_url }
            });

            return documentService.createDocument({
              source_uuid: uuidv4(),
              conversation_uuid,
              text: `Edited image with prompt: "${prompt}"\n\nOriginal image: ${image_url}\n${mask_url ? `Mask: ${mask_url}\n` : ''}Size: ${size}\n\nEdited image URL: ${uploaded_url}`,
              metadata_override: {
                name: 'Image Edit',
                description: `Edited image: ${prompt}`,
                source: 'image_service',
                mimeType: 'text/plain',
                type: 'text',
                content_type: 'full',
                images: [uploaded_url]
              }
            });
          } catch (error) {
            logger.error('DALL-E edit error:', error instanceof Error ? error : new Error(String(error)));
            throw new Error('Failed to edit image with DALL-E');
          }
        }

        case 'variation': {
          const { image_url, n, size } = parsed.payload;

          // Validate image URL
          if (!(await validateImageUrl(image_url))) {
            throw new Error('Invalid or inaccessible image URL');
          }

          try {
            const image_base64 = await downloadImageAsBase64(image_url);
            const imageBuffer = Buffer.from(image_base64.split(',')[1], 'base64');

            const response = await openai.images.createVariation({
              image: new File([imageBuffer], 'image.png', { type: 'image/png' }),
              n,
              size: size as "256x256" | "512x512" | "1024x1024"
            });

            const variation_urls = response.data.map(img => img.url).filter((url): url is string => !!url);
            
            // Upload all variations to our storage
            const uploaded_urls = await Promise.all(
              variation_urls.map((url, index) => 
                uploadImageFromUrl(url, `variation_${index}_${Date.now()}.png`)
              )
            );

            span?.event({
              name: 'image_variation_success',
              input: { image_url, n, size },
              output: { variations: uploaded_urls }
            });

            return documentService.createDocument({
              source_uuid: uuidv4(),
              conversation_uuid,
              text: `Generated ${n} variations of the image\n\nOriginal image: ${image_url}\nSize: ${size}\n\nVariation URLs:\n${uploaded_urls.map((url, i) => `${i + 1}. ${url}`).join('\n')}`,
              metadata_override: {
                name: 'Image Variations',
                description: `Generated ${n} variations`,
                source: 'image_service',
                mimeType: 'text/plain',
                type: 'text',
                content_type: 'full',
                images: uploaded_urls
              }
            });
          } catch (error) {
            logger.error('DALL-E variation error:', error instanceof Error ? error : new Error(String(error)));
            throw new Error('Failed to create image variations with DALL-E');
          }
        }

        case 'upload': {
          const { image_data, filename, description } = parsed.payload;

          try {
            // Convert base64 to Blob
            const base64Data = image_data.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            const blob = new Blob([buffer], { type: 'image/jpeg' });

            const upload_result = await uploadFile({
              uuid: uuidv4(),
              file: blob,
              type: FileType.IMAGE,
              original_name: filename
            });

            const image_url = `${process.env.APP_URL}/api/files/${upload_result.uuid}`;

            span?.event({
              name: 'image_upload_success',
              input: { filename, description },
              output: { image_url }
            });

            return documentService.createDocument({
              source_uuid: uuidv4(),
              conversation_uuid,
              text: `Image uploaded successfully\n\nFilename: ${filename}\n${description ? `Description: ${description}\n` : ''}URL: ${image_url}`,
              metadata_override: {
                name: 'Uploaded Image',
                description: description || 'User uploaded image',
                source: 'image_service',
                mimeType: 'image/jpeg',
                type: 'image',
                content_type: 'full',
                images: [image_url]
              }
            });
          } catch (error) {
            logger.error('Image upload error:', error instanceof Error ? error : new Error(String(error)));
            throw new Error('Failed to upload image');
          }
        }

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      span?.event({
        name: 'image_action_error',
        input: { action, payload },
        output: { error: error instanceof Error ? error.message : 'Unknown error' },
        level: 'ERROR'
      });

      return documentService.createErrorDocument({
        error: error instanceof Error ? error : new Error('Unknown error'),
        conversation_uuid,
        source_uuid: uuidv4(),
        context: `Failed to execute image action: ${action}`
      });
    }
  }
};

export { imageService };
