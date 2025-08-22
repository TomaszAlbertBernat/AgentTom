export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

// Server-side only: API key for backend, not exposed to the browser
export const BACKEND_API_KEY = process.env.BACKEND_API_KEY ?? '';

export const isProduction = process.env.NODE_ENV === 'production';


