import {isRegistered, register, unregister} from '@tauri-apps/api/globalShortcut';
import type {IShortcut} from "../stores/main.dt";
import {readText} from "@tauri-apps/api/clipboard";
import {state} from "../stores/main";

const createAction = async (currentState, shortcut) => {
    return async () => {
        const clipboardText = (await readText())?.toString()?.trim();
        const updatedState = {
            ...currentState,
            query: clipboardText ?? '',
            messages: [
                { role: 'system', content: shortcut.system },
            ]
        }
        state.update(() => updatedState);
    }
}

export const registerKeystroke = async (currentState, shortcut: IShortcut) => {
    const action = await createAction(currentState, shortcut);
    const alreadyRegistered = await isRegistered(shortcut.keystroke);
    if (!alreadyRegistered) {
        await register(shortcut.keystroke, action);
    }
}

export const unregisterKeystroke = async (shortcut: IShortcut) => {
    await unregister(shortcut.keystroke);
}
