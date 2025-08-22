import type { ExternalChatRequest } from '../dto/chat.dto';

export type AppEnv = {
  Variables: {
    request: ExternalChatRequest;
  };
};
