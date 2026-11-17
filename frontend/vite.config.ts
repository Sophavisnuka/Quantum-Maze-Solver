import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // forward API calls to the FastAPI backend (uvicorn app.main:app --port 8000)
    proxy: { '/api': 'http://127.0.0.1:8000' },
  },
})
