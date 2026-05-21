import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '')
    const apiTarget = env.VITE_DEV_PROXY_TARGET || 'http://localhost:8000'

    const proxy = {
        changeOrigin: true,
        secure: false,
    }

    return {
        plugins: [react()],
        server: {
            port: 5173,
            proxy: {
                '/auth': { target: apiTarget, ...proxy },
                '/crypto': { target: apiTarget, ...proxy },
                '/payment': { target: apiTarget, ...proxy },
                '/alerts': { target: apiTarget, ...proxy },
                '/api': { target: apiTarget, ...proxy },
                '/watchlist': { target: apiTarget, ...proxy },
                '/health': { target: apiTarget, ...proxy },
                '/socket.io': { target: apiTarget, ws: true, ...proxy },
            }
        },
        preview: {
            port: 4173,
        }
    }
})
