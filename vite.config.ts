import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, loadEnv} from 'vite';

// Patch html2canvas on-disk to prevent oklab/oklch crashes with Tailwind CSS v4
try {
  const patchFile = (filePath: string) => {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('Attempting to parse an unsupported color function')) {
        content = content.replace(
          /throw\s+new\s+Error\s*\(\s*['"]Attempting to parse an unsupported color function[\s\S]+?['"]\s*\);?/g,
          'return 0;'
        );
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Successfully patched html2canvas oklab/oklch color crash in: ${filePath}`);
      }
    }
  };

  const esmPath = path.resolve(__dirname, 'node_modules/html2canvas/dist/html2canvas.esm.js');
  const jsPath = path.resolve(__dirname, 'node_modules/html2canvas/dist/html2canvas.js');
  
  patchFile(esmPath);
  patchFile(jsPath);

  // Clear local Vite pre-bundle cache if it exists, to ensure Vite rebuilds with the patch
  const viteCachePath = path.resolve(__dirname, 'node_modules/.vite');
  if (fs.existsSync(viteCachePath)) {
    // We can delete the cache folder to force dependency re-bundling
    fs.rmSync(viteCachePath, { recursive: true, force: true });
    console.log('Cleared Vite pre-bundled dependency cache.');
  }
} catch (e) {
  console.warn('Failed to auto-patch html2canvas dependency:', e);
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
