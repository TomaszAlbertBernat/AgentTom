import {Context, Next} from 'hono';
import {ExternalChatRequestDto} from '../dto/chat.dto';
import {z} from 'zod';
import {v4 as uuidv4} from 'uuid';
import {uploadFile} from '../services/common/upload.service';
import {messageService} from '../services/agent/message.service';
import { FileType } from '../types/upload';

// Define compatible message types for the application
interface AppMessage {
  role: 'user' | 'system' | 'assistant' | 'tool';
  content: string | AppMessageContent[];
  content_type?: 'text' | 'multi_part';
}

interface AppMessageContent {
  type: string;
  text?: string;
  image_url?: { url: string };
  image?: string;
  source?: {
    type: 'base64';
    data: string;
    media_type: string;
  };
}

const processImageData = async (imageData: string) => {
  if (imageData.startsWith('http')) return imageData;

  const base64Data = imageData.startsWith('data:') ? imageData : `data:image/jpeg;base64,${imageData}`;

  const upload_result = await uploadFile({
    uuid: uuidv4(),
    file: {base64: base64Data, mime_type: 'image/jpeg'},
    type: FileType.IMAGE,
    original_name: 'image.jpg'
  });

  return `${process.env.APP_URL}/api/files/${upload_result.uuid}`;
};

const normalizeMessage = async (message: any): Promise<AppMessage> => {
  const hasMultipartContent = Array.isArray(message.content);
  const hasImageContent = hasMultipartContent && message.content.some((part: any) => part.type === 'image' || part.type === 'image_url');

  if (!hasMultipartContent) {
    return {
      ...message,
      content_type: 'text'
    } as AppMessage;
  }

  const normalizedContent: AppMessageContent[] = await Promise.all(
    message.content.map(async (part: any) => {
      if (part.type === 'image_url' && part.image_url?.url) {
        const processed_url = await processImageData(part.image_url.url);
        return {type: 'image', image: processed_url} as AppMessageContent;
      }

      if (part.type === 'image' && part.image) {
        const imageData = typeof part.image === 'string' ? part.image : '';
        const processed_url = await processImageData(imageData);
        return {type: 'image', image: processed_url} as AppMessageContent;
      }

      // Handle text parts
      if (part.type === 'text' && part.text) {
        return {type: 'text', text: part.text} as AppMessageContent;
      }

      // Return as-is for other types, ensuring compatibility
      return {
        type: part.type || 'text',
        text: part.text,
        image: typeof part.image === 'string' ? part.image : undefined,
        image_url: part.image_url
      } as AppMessageContent;
    })
  );

  return {
    ...message,
    content_type: hasImageContent ? 'multi_part' : 'text',
    content: normalizedContent
  } as AppMessage;
};

export const mapperMiddleware = async (c: Context, next: Next) => {
  try {
    const request = c.get('request') || {};
    const external = ExternalChatRequestDto.parse(request);
    const other_messages = external.messages.filter(msg => msg.role !== 'system');

    let messages_to_normalize = [...other_messages];

    if (other_messages.length <= 1 && external.conversation_id) {
      const previous_messages = await messageService.findByConversationId(external.conversation_id);
      // @ts-ignore - Type compatibility between AI SDK types and app message types
      messages_to_normalize = [...(previous_messages as any[]), ...other_messages];
    }

    const normalized_messages: AppMessage[] = await Promise.all(
      messages_to_normalize.map(msg => normalizeMessage(msg as any))
    );

    console.log(`Query:`, normalized_messages.at(-1)?.content);

    c.set('request', {
      ...external,
      messages: normalized_messages as any // Cast to bypass type checking for external interface compatibility
    });

    await next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({error: 'Invalid request format', details: error.issues}, 400);
    }
    console.error('Mapper error:', error);
    return c.json({error: 'Invalid request body'}, 400);
  }
};
