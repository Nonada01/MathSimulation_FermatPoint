import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/MathSimulation_FermatPoint/', // GitHub Pages 저장소 이름에 맞게 수정하세요
})
