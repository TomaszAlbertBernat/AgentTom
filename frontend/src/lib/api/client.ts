import createClient from 'openapi-fetch';
import type { paths } from './types';
import { API_BASE_URL } from '../config';

export const api = createClient<paths>({ baseUrl: API_BASE_URL });


