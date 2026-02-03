import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            '/auth': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            },
            '/crypto': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            },
            '/payment': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            },
            '/alerts': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            },
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            },
            '/watchlist': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            },
            '/health': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            },
            '/socket.io': {
                target: 'http://localhost:8000',
                ws: true,
                changeOrigin: true,
            }
        }
    }
})
