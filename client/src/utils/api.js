import axios from 'axios';
import { classifyError, parseError, logError } from './errors';

const api = axios.create({
    baseURL: '/', // Proxy handles the rest
    withCredentials: true, // Send cookies
    timeout: 10000, // 10 second timeout
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Classify and parse the error using centralized system
        const errorCode = classifyError(error);
        const parsed = parseError(error);

        // Attach structured error info for easy consumption
        error.errorCode = errorCode;
        error.parsed = parsed;
        error.userMessage = parsed.message;
        error.userTitle = parsed.title;
        error.suggestion = parsed.suggestion;
        error.severity = parsed.severity;

        // Log for debugging (silent)
        logError(error);

        return Promise.reject(error);
    }
);

export default api;

