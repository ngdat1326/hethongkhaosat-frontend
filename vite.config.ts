import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        host: '0.0.0.0', // hoặc '0.0.0.0' nếu muốn truy cập từ IP khác
        port: 3000,        // thay đổi port tại đây
        proxy: {
            '/api': {
                target: 'https://localhost:7226',
                changeOrigin: true,
                secure: false // Cho phép self-signed certificate
            }
        }
    },
})
