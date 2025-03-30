import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    root: 'grid-system/frontend',
    base: './',
    publicDir: path.resolve(__dirname, 'grid-system/frontend/public'),
    build: {
        outDir: path.resolve(__dirname, 'grid-system/frontend/dist'),
        emptyOutDir: true,
        assetsDir: 'assets',
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'grid-system/frontend/index.html'),
            },
            output: {
                entryFileNames: 'assets/[name]-[hash].js',
                chunkFileNames: 'assets/[name]-[hash].js',
                assetFileNames: 'assets/[name]-[hash].[ext]'
            }
        },
        cssCodeSplit: false
    },
    resolve: {
        alias: {
            '@src': path.resolve(__dirname, 'grid-system/frontend/src')
        }
    },
    server: {
        host: '192.168.1.5', // Thay đổi từ 'localhost' thành '0.0.0.0'
        port: 5173,      // Giữ nguyên cổng mặc định (hoặc thay đổi nếu cần)
    }
});