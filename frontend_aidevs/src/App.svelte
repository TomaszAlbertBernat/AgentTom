<script lang="ts">
  import {onDestroy, onMount} from "svelte";
  import type {IMessage, IState} from "./lib/stores/main.dt";
  import {loadState, saveState, state} from "./lib/stores/main";
  import {ask} from "./lib/functions/chat";
  import {registerKeystroke, unregisterKeystroke} from "./lib/functions/shortcuts";
  import {unregisterAll} from "@tauri-apps/api/globalShortcut";
  import {marked} from "marked";

  let messages: IMessage[] = [];
  let apikey = '';
  let query = '';
  let stream = false;
  let model = '';
  let currentState: IState;
  let conversation_uuid = '';

  document.addEventListener('keydown', sendShortcut);

  async function sendShortcut(event) {
    if (event.key === 'Enter' && event.metaKey) {
      await ask(currentState);
    }
  }

  // Create a new conversation
  const createNewConversation = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/conversation/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apikey}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        conversation_uuid = data.uuid;
        
        // Clear messages when starting a new conversation
        state.update(state => {
          return {
            ...state,
            messages: []
          };
        });
      }
    } catch (error) {
      console.error('Error creating new conversation:', error);
    }
  };

  const unsubscribe = state.subscribe((current) => {
    currentState = {
      ...current,
      messages: [
        ...current.messages
      ],
      shortcuts: [
        ...current.shortcuts
      ]
    };
    model = current.model;
    messages = current.messages;
    apikey = current.apikey;
    stream = current.stream;
    query = current.query
  });

  const updateQuery = (event) => {
    state.update(state => {
      state.query = event.target.value;
      return state;
    })
  }

  const updateApiKey = async (event) => {
    state.update(state => {
      state.apikey = event.target.value;
      return state;
    })
    await saveState({ apikey });
  }

  onMount(async () => {
    await loadState(state);

    await unregisterAll();
    currentState.shortcuts.forEach(shortcut => {
      registerKeystroke(currentState, shortcut);
    })
  });

  onDestroy(() => {
    unsubscribe();
    currentState.shortcuts.forEach(shortcut => {
      unregisterKeystroke(shortcut);
    })
  });

</script>

<main>

  <div class="text-center text-zinc-200 p-8 pt-2">
    <div class="flex flex-col">
      <div class="text-zinc-200 p-6 pr-1.5">
        <img class="w-24 ml-auto" src="./aidevs.svg" alt="AI Devs">
      </div>

      <div class="flex flex-col gap-3.5">
        <div class="flex justify-between">
          <input placeholder="OpenAI API Key" class="apikey bg-slate-900 text-zinc-200 p-3.5" type="text" on:blur={updateApiKey} bind:value={apikey}>
        </div>

        <div class="flex justify-between gap-2">
          <input 
            placeholder="Conversation UUID (optional)" 
            class="conversation-id bg-slate-900 text-zinc-200 p-3.5 flex-grow" 
            type="text" 
            bind:value={conversation_uuid}
          >
          <button 
            on:click={createNewConversation}
            class="rounded-md px-3 bg-blue-600 hover:bg-blue-800 active:bg-blue-900 text-zinc-100 py-2 text-sm font-bold"
          >
            New Chat
          </button>
        </div>

        <textarea on:change={updateQuery} bind:value={currentState.query} placeholder="Ask me anything..." class="bg-slate-900 text-zinc-200 p-3.5" name="prompt" id="" rows="3"></textarea>

        <div class="text-right">
          <button on:click={() => ask({...currentState, conversation_uuid})} class="rounded-md px-3 bg-emerald-600 hover:bg-emerald-800 active:bg-emerald-900 text-zinc-100 py-2 uppercase text-sm font-bold flex ml-auto">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="#fff" style="width: 20px; height: 18px; margin-top: 1px">
              <path d="M16.1 260.2c-22.6 12.9-20.5 47.3 3.6 57.3L160 376V479.3c0 18.1 14.6 32.7 32.7 32.7c9.7 0 18.9-4.3 25.1-11.8l62-74.3 123.9 51.6c18.9 7.9 40.8-4.5 43.9-24.7l64-416c1.9-12.1-3.4-24.3-13.5-31.2s-23.3-7.5-34-1.4l-448 256zm52.1 25.5L409.7 90.6 190.1 336l1.2 1L68.2 285.7zM403.3 425.4L236.7 355.9 450.8 116.6 403.3 425.4z"/>
            </svg>
            <span class="ml-2">Wyślij</span>
          </button>
        </div>
      </div>

      <div class="text-left mt-3.5 overflow-y-auto output p-2.5">
        {#each currentState.messages as message}
          <div class="mb-2.5">
            {#if message.role === 'system'}
              <span class="opacity-50">system ({model}): {message.content}</span>
            {:else}
              <div class="font-bold opacity-50">{message.role === 'assistant' ? 'Tom' : 'You'}:</div> {@html marked(message.content)}
            {/if}
          </div>
        {/each}
      </div>
    </div>
  </div>

</main>

<style>
</style>
