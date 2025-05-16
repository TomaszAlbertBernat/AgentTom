// API Configuration

export interface ApiConfig {
    endpoint: string;
    defaultModel: string;
}

// AgentTom API configuration
export const agentTomConfig: ApiConfig = {
    endpoint: 'http://localhost:8080/api/agi/chat',
    defaultModel: 'gpt-4o'
};

// Default API configuration - set to AgentTom
export const apiConfig: ApiConfig = {
    ...agentTomConfig
}; 