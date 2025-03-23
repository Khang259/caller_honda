import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    root: 'grid-system/frontend', // Đặt thư mục gốc là grid-system/frontend/
    base: './', // Đảm bảo đường dẫn tương đối để hoạt động trong Electron
    publicDir: path.resolve(__dirname, 'grid-system/frontend/public'), // Thư mục chứa các file tĩnh
    build: {
        outDir: path.resolve(__dirname, 'dist'), // Đặt thư mục đầu ra là thadosoftcaller.client/dist/
        assetsDir: 'assets', // Thư mục chứa tài nguyên
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'grid-system/frontend/index.html'), // Chỉ định index.html là entry point
            },
            output: {
                entryFileNames: 'assets/[name]-[hash].js',
                chunkFileNames: 'assets/[name]-[hash].js',
                assetFileNames: 'assets/[name]-[hash].[ext]'
            }
        },
        cssCodeSplit: false // Gộp tất cả CSS thành một file duy nhất (tùy chọn)
    },
    resolve: {
        alias: {
            './src': path.resolve(__dirname, 'grid-system/frontend/src')
        }
    }
});