import axios from 'axios';
import { classifyError, parseError, logError } from './errors';

const DEFAULT_PROD_API = 'https://chainxchange-api.onrender.com';

/** Backend base URL — empty in local dev uses Vite proxy */
export const API_BASE_URL = (
    import.meta.env.VITE_API_URL ||
    (import.meta.env.PROD ? DEFAULT_PROD_API : '')
).replace(/\/$/, '');

if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
    console.warn(
        `[ChainXchange] VITE_API_URL not set — using default API ${DEFAULT_PROD_API}. Set VITE_API_URL in Vercel for a custom backend.`
    );
}

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    timeout: 8000,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const errorCode = classifyError(error);
        const parsed = parseError(error);

        error.errorCode = errorCode;
        error.parsed = parsed;
        error.userMessage = parsed.message;
        error.userTitle = parsed.title;
        error.suggestion = parsed.suggestion;
        error.severity = parsed.severity;

        logError(error);

        return Promise.reject(error);
    }
);

export default api;
