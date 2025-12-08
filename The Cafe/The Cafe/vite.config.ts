import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          [
            'babel-plugin-react-compiler',
            {
              target: '19',
            },
          ],
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    sourcemap: false,
    minify: 'terser',
    target: 'esnext',
    chunkSizeWarningLimit: 800, // Warn if > 800KB
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        // Intelligent manual chunking strategy
        manualChunks(id) {
          // Framework chunks
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          
          // MUI chunks (large library)
          if (id.includes('@mui/material') || id.includes('@mui/icons-material') || id.includes('@mui/x-')) {
            return 'vendor-mui';
          }
          
          // Query and state management
          if (id.includes('@tanstack/react-query')) {
            return 'vendor-query';
          }
          
          // Data visualization and UI libraries
          if (id.includes('recharts') || id.includes('framer-motion') || id.includes('lucide-react')) {
            return 'vendor-ui-libs';
          }
          
          // Radix UI components
          if (id.includes('@radix-ui')) {
            return 'vendor-radix-ui';
          }
          
          // PDF generation libraries
          if (id.includes('jspdf') || id.includes('pdf-lib')) {
            return 'vendor-pdf';
          }
          
          // Other utilities
          if (id.includes('node_modules')) {
            return 'vendor-other';
          }
        },
        // Optimize chunk naming for better caching
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
      input: {
        main: path.resolve(import.meta.dirname, 'client', 'src', 'main.tsx'),
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5000,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
