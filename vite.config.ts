import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// import { componentTagger } from "lovable-tagger"; // Comentado temporalmente por incompatibilidad con Node 16

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "localhost",
    port: 8080,
    strictPort: true,
    hmr: {
      overlay: true,
    },
  },
  plugins: [react()], // Removido componentTagger temporalmente
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    commonjsOptions: {
      include: [/lucide-react/, /node_modules/],
    },
  },
  optimizeDeps: {
    include: ["lucide-react"],
  },
}));
