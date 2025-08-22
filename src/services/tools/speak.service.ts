import {z} from 'zod';
import {promisify} from 'util';
import {exec as execCallback} from 'child_process';
import {writeFile, unlink} from 'fs/promises';
import {tmpdir} from 'os';
import {join} from 'path';
import {stateManager} from '../agent/state.service';
import {documentService} from '../agent/document.service';
import type {DocumentType} from '../agent/document.service';
import {createTextService} from '../common/text.service';
import {elevenlabsService} from '../common/elevenlabs.service';
import { env } from '../../config/env.config';

const exec = promisify(execCallback);

const speakPayloadSchema = z.object({
  text: z.string(),
  voice: z.string().optional(),
  mode: z.enum(['speak', 'elevenlabs']).default('elevenlabs')
});

const text_service = await createTextService({model_name: env.DEFAULT_TEXT_MODEL || 'gemini-2.5-flash'});

const playAudioBuffer = async (buffer: Buffer): Promise<void> => {
  const temp_file = join(tmpdir(), `speech-${Date.now()}.mp3`);
  
  try {
    await writeFile(temp_file, buffer);
    await exec(`afplay "${temp_file}"`);
  } catch (error) {
    throw error;
  } finally {
    await unlink(temp_file).catch(() => {});
  }
};

const speakText = async (text: string): Promise<void> => {
  try {
    await exec(`say "${text.replace(/"/g, '\\"')}"`);
  } catch (error) {
    throw error;
  }
};

const speakWithElevenLabs = async (text: string, voice?: string): Promise<void> => {
  try {
    const audio_stream = await elevenlabsService.speak(text, voice);
    const chunks: Buffer[] = [];
    
    for await (const chunk of audio_stream) {
      chunks.push(Buffer.from(chunk));
    }
    
    const audio_buffer = Buffer.concat(chunks);
    await playAudioBuffer(audio_buffer);
  } catch (error) {
    throw error;
  }
};

const speakService = {
  execute: async (action: string, payload: unknown): Promise<DocumentType> => {
    try {
      const state = stateManager.getState();
      const {text, voice, mode} = speakPayloadSchema.parse(payload);
      const conversation_uuid = state.config.conversation_uuid ?? 'unknown';

      if (action === 'speak') {
        await (mode === 'elevenlabs' ?
          speakWithElevenLabs(text, voice) :
          speakText(text)
        );

        return documentService.createDocument({
          conversation_uuid,
          source_uuid: conversation_uuid,
          text: `The following text was spoken: "${text}". There is no need to repeat this.`,
          metadata_override: {
            type: 'text',
            content_type: 'full',
            tokens: text.length,
            name: 'Speak Notification',
            source: mode,
            description: `Text-to-speech completed using ${mode}`
          }
        });
      }

      return documentService.createErrorDocument({
        error: new Error(`Unknown action: ${action}`),
        conversation_uuid,
        context: 'Invalid notification operation requested'
      });
    } catch (error) {
      const state = stateManager.getState();
      return documentService.createErrorDocument({
        error,
        conversation_uuid: state.config.conversation_uuid ?? 'unknown',
        context: 'Failed to execute notification operation'
      });
    }
  }
};

export {speakService};