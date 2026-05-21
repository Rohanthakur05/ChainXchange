import axios from 'axios';
import { classifyError, parseError, logError } from './errors';

/** Backend base URL — required in production (Vercel: VITE_API_URL) */
export const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

if (import.meta.env.PROD && !API_BASE_URL) {
    console.error(
        '[ChainXchange] VITE_API_URL is not set. Set it to your Render API URL (e.g. https://chainxchange-api.onrender.com).'
    );
}

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    timeout: 30000,
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
