import {writable} from "svelte/store";
import {Store} from "tauri-plugin-store-api";
import type {IState} from "./main.dt";

let store = new Store('aidevs_.dat');

export const defaultSystemPrompt = "You\'re a helpful assistant named DAIvid";

export const saveState = async (newState: Partial<IState>) => {
    try {
        await store.set('state', newState);
    } catch (error) {
        console.error(error);
    }
    return newState;
}

export const loadState = async (state): Promise<IState | null> => {
    const savedState: IState = await store.get('state');
    state.update(state => {
        state.apikey = savedState.apikey;
        return state;
    });
    return state;
}

export const state = writable<IState>({
    apikey: '',
    model: 'gpt-4',
    max_tokens: 1500,
    temperature: 0.8,
    stream: true,
    answer: '',
    query: '',
    messages: [{
        role: 'system',
        content: defaultSystemPrompt
    }],
    shortcuts: [
        {
            id: 1,
            system: 'Answer yes or no.',
            name: 'Yes or no',
            keystroke: 'CommandOrControl+Shift+K'
        }
    ]
})
