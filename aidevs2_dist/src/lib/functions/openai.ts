import type { IState } from "../stores/main.dt";
import { defaultSystemPrompt, state } from "../stores/main";
import { writeText } from "@tauri-apps/api/clipboard";
import {ChatOpenAI} from "langchain/chat_models/openai";
import {AIMessage, HumanMessage, SystemMessage} from "langchain/schema";

const API_URL = "https://api.openai.com/v1/chat/completions";
const max_tokens = 1500;
const temperature = 0.8;
const model = "gpt-3.5-turbo";

export async function openAICompletion(query: Partial<IState>): Promise<string | Response> {
  try {

    const chat = new ChatOpenAI({
      openAIApiKey: query.apikey,
      temperature: query.temperature ?? temperature,
      maxTokens: query.max_tokens ?? max_tokens,
      modelName: query.model ?? model,
      streaming: query.stream ?? false
    });

    const { content } = await chat.call(
        query.messages.map(message => {
          switch (message.role) {
            case 'user':
              return new HumanMessage(message.content)
            case 'system':
                return new SystemMessage(message)
            case 'assistant':
              return new AIMessage(message)
          }
        }),
        {
            callbacks: [
              {
                handleLLMNewToken(token: string) {
                  state.update((state) => {
                    return updateLatestMessage(state, token);
                  });
                },
              },
            ]
        }
    );

    return content;
  } catch (err: any) {
    throw new Error(err.message);
  }
}

function updateLatestMessage(state: IState, content: string) {
  const latestMessage = state.messages[state.messages.length - 1];
  if (latestMessage.role === 'assistant') {
    state.messages[state.messages.length - 1] = {
      role: 'assistant',
      content: latestMessage.content + content
    }
  } else {
    state.messages = [
      ...state.messages,
      {
        role: 'assistant',
        content,
      },
    ];
  }
  return state;
}

export async function displayAnswer(query: Partial<IState>, response: string) {
  // Add to the clipboard
  await writeText(response);

  state.update(state => {
    state.messages = state.messages.map(message => {
      message.content = message.role === 'system' ? defaultSystemPrompt : message.content;
      return message;
    })
    state.query = '';
    return state;
  });
}