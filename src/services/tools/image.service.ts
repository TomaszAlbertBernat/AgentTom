import { z } from 'zod';
import { stateManager } from '../agent/state.service';
import { documentService } from '../agent/document.service';
import type { DocumentType } from '../agent/document.service';
import { uploadFile } from '../common/upload.service';
import { FileType } from '../../types/upload';
import { completion } from '../common/llm.service';
import { v4 as uuidv4 } from 'uuid';

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

const imageService = {
  execute: async (action: string, payload: unknown, span?: LangfuseSpanClient): Promise<DocumentType> => {
    const state = stateManager.getState();
    const conversation_uuid = state.config.conversation_uuid;

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

                                           const analysis_result = await completion.text({
             model: 'gpt-4o',
             messages: [
               {
                 role: 'user',
                 content: analysis_prompt
               }
             ],
             temperature: 0.7,
             max_tokens: 1000,
             user: { uuid: 'system', name: 'Image Analysis Service' }
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
               mimeType: 'text/plain'
             }
           });
        }

        case 'generate': {
          const { prompt, size, quality, style } = parsed.payload;

          // Note: This would require OpenAI DALL-E integration
          // For now, returning a placeholder implementation
          const generated_image_url = `https://via.placeholder.com/${size.replace('x', 'x')}/000000/FFFFFF?text=Generated+Image`;

          span?.event({
            name: 'image_generation_placeholder',
            input: { prompt, size, quality, style },
            output: { image_url: generated_image_url }
          });

                     return documentService.createDocument({
             source_uuid: uuidv4(),
             conversation_uuid,
             text: `Generated image based on prompt: "${prompt}"\n\nImage specifications:\n- Size: ${size}\n- Quality: ${quality}\n- Style: ${style}`,
             metadata_override: {
               name: 'Generated Image',
               description: `AI-generated image: ${prompt}`,
               source: 'image_service',
               mimeType: 'text/plain'
             }
           });
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

          // Placeholder for image editing functionality
          const edited_image_url = `https://via.placeholder.com/${size.replace('x', 'x')}/FF0000/FFFFFF?text=Edited+Image`;

          span?.event({
            name: 'image_edit_placeholder',
            input: { image_url, mask_url, prompt, size },
            output: { edited_image_url }
          });

                     return documentService.createDocument({
             source_uuid: uuidv4(),
             conversation_uuid,
             text: `Edited image with prompt: "${prompt}"\n\nOriginal image: ${image_url}\n${mask_url ? `Mask: ${mask_url}\n` : ''}Size: ${size}`,
             metadata_override: {
               name: 'Image Edit',
               description: `Edited image: ${prompt}`,
               source: 'image_service',
               mimeType: 'text/plain'
             }
           });
        }

        case 'variation': {
          const { image_url, n, size } = parsed.payload;

          // Validate image URL
          if (!(await validateImageUrl(image_url))) {
            throw new Error('Invalid or inaccessible image URL');
          }

          // Placeholder for image variation functionality
          const variations = Array.from({ length: n }, (_, i) => 
            `https://via.placeholder.com/${size.replace('x', 'x')}/00${i}${i}${i}${i}/FFFFFF?text=Variation+${i + 1}`
          );

          span?.event({
            name: 'image_variation_placeholder',
            input: { image_url, n, size },
            output: { variations }
          });

                     return documentService.createDocument({
             source_uuid: uuidv4(),
             conversation_uuid,
             text: `Generated ${n} variation(s) of the original image\n\nOriginal: ${image_url}\nVariations:\n${variations.map((url, i) => `${i + 1}. ${url}`).join('\n')}`,
             metadata_override: {
               name: 'Image Variations',
               description: `${n} variations of original image`,
               source: 'image_service',
               mimeType: 'text/plain'
             }
           });
        }

        case 'upload': {
          const { image_data, filename, description } = parsed.payload;

          try {
            // Parse base64 data
            const matches = image_data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (!matches) {
              throw new Error('Invalid base64 image data format');
            }

            const [, mimeType, base64Data] = matches;
            const buffer = Buffer.from(base64Data, 'base64');

            const upload_result = await uploadFile({
              uuid: uuidv4(),
              file: new Blob([buffer], { type: mimeType }),
              type: FileType.IMAGE,
              original_name: filename
            });

            const uploaded_url = `${process.env.APP_URL}/api/files/${upload_result.uuid}`;

            span?.event({
              name: 'image_upload_success',
              input: { filename, size: buffer.length },
              output: { uploaded_url }
            });

                         return documentService.createDocument({
               source_uuid: uuidv4(),
               conversation_uuid,
               text: `Uploaded image: ${filename}\n${description ? `Description: ${description}\n` : ''}File size: ${(buffer.length / 1024).toFixed(2)} KB\nURL: ${uploaded_url}`,
               metadata_override: {
                 name: 'Image Upload',
                 description: description || `Uploaded image: ${filename}`,
                 source: 'image_service',
                 mimeType: 'text/plain'
               }
             });
          } catch (error) {
            throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        default: {
          throw new Error(`Unknown image action: ${action}`);
        }
      }
    } catch (error) {
      span?.event({
        name: 'image_action_error',
        input: { action, payload },
        output: { error: error instanceof Error ? error.message : String(error) },
        level: 'ERROR'
      });

      return documentService.createErrorDocument({
        error: error instanceof Error ? error : new Error(String(error)),
        conversation_uuid,
        context: `Failed to execute image action: ${action}`
      });
    }
  }
};

export { imageService };
