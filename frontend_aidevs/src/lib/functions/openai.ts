import type { IState } from "../stores/main.dt";
import { state } from "../stores/main";
import type { IMessage } from "../stores/main.dt";
import { writeText } from "@tauri-apps/api/clipboard";

const temperature = 0.7;
const max_tokens = 1000;

export const openAICompletion = async (params: {
    apikey: string,
    messages: IMessage[],
    stream?: boolean,
    conversation_uuid?: string
}) => {
    if (!params.apikey) {
        return;
    }

    try {
        // Replace direct OpenAI API call with AgentTom API endpoint
        const response = await fetch('http://localhost:8080/api/agi/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${params.apikey}`
            },
            body: JSON.stringify({
                messages: params.messages,
                stream: params.stream || false,
                model: 'gpt-4o',
                conversation_uuid: params.conversation_uuid
            })
        });

        if (params.stream) {
            // Handle streaming response
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error("Failed to get response reader");
            }
            return processStreamedResponse(reader);
        } else {
            // Handle regular response
            const data = await response.json();
            return data.choices[0].message.content;
        }
    } catch (error) {
        console.error('Error calling AgentTom API:', error);
        return error;
    }
}

// Process streamed response from the API
async function processStreamedResponse(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<string> {
    const decoder = new TextDecoder();
    let result = '';
    
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            result += chunk;
            
            // Update the UI with each chunk
            state.update((state) => updateLatestMessage(state, chunk));
        }
        return result;
    } catch (error) {
        console.error('Error processing stream:', error);
        throw error;
    }
}

function updateLatestMessage(state: any, content: string): any {
    const messages = [...state.messages];
    const lastMessage = messages[messages.length - 1];

    if (lastMessage && lastMessage.role === 'assistant') {
        lastMessage.content += content;
    } else {
        messages.push({
            role: 'assistant',
            content
        });
    }

    return {
        ...state,
        messages,
        answer: messages[messages.length - 1].content
    };
}

export const displayAnswer = async (params: Partial<IState>, content: string) => {
    state.update(state => {
        const messages = [...state.messages];
        messages.push({
            role: 'assistant',
            content
        });
        return {
            ...state,
            query: '',
            messages
        };
    });

    // Copy last response to clipboard on double click
    document.querySelectorAll('.output > div:last-child').forEach(element => {
        element.addEventListener('dblclick', async () => {
            const text = element.textContent || '';
            if (text) {
                await writeText(text);
            }
        });
    });
}