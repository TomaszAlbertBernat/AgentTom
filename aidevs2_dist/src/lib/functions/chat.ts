import {openAICompletion, displayAnswer} from "./openai";
import {state} from "../stores/main";
import type {IState} from "../stores/main.dt";

export const generateAnswer = async (currentState: IState) => {
    const response = await openAICompletion({
        apikey: currentState.apikey,
        stream: currentState.stream,
        messages: currentState.messages,
    });
    if (typeof response === 'string') {
        await displayAnswer({ stream: currentState.stream }, response);
    } else if (response ) {
        console.log(response);
        console.error('An error occurred during OpenAI request', response.statusText ?? '');
    }
}

export const ask = async (currentState: IState) => {
    if (!currentState.query) {
        return;
    }
    const updatedState: IState = {
        ...currentState,
        messages: [
            ...currentState.messages,
            {
                role: 'user',
                content: currentState.query
            }
        ]
    }
    state.update(() => updatedState);
    await generateAnswer(updatedState);
}
