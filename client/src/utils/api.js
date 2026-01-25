import axios from 'axios';

const api = axios.create({
    baseURL: '/', // Proxy handles the rest
    withCredentials: true, // Send cookies
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Optionally handle global errors like 401 Unauthorized
        if (error.response && error.response.status === 401) {
            // Logic to clear local state if needed
            console.log('Unauthorized');
        }
        return Promise.reject(error);
    }
);

export default api;
