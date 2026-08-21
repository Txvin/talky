import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // base relativo: necessário pro build funcionar quando o Electron
  // carrega o index.html direto do disco (file://) em vez de um servidor web.
  base: './',
})