import axios from 'axios';

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
        // Network error (ECONNREFUSED, timeout, DNS failure, etc.)
        if (!error.response) {
            console.error('Network Error:', error.message);
            error.isNetworkError = true;
            error.userMessage = 'Cannot reach server. Please check if the backend is running.';
            return Promise.reject(error);
        }

        // Handle specific HTTP status codes
        switch (error.response.status) {
            case 401:
                console.log('Unauthorized - session may have expired');
                error.userMessage = 'Please log in to continue.';
                break;
            case 500:
                error.userMessage = 'Server error. Please try again later.';
                break;
            case 503:
                error.userMessage = 'Service temporarily unavailable.';
                break;
            default:
                // Backend returns 'error' field, some may use 'message'
                error.userMessage = error.response.data?.error || error.response.data?.message || 'An error occurred.';
        }

        return Promise.reject(error);
    }
);

export default api;
