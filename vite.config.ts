import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Inlines built CSS and JS into dist/index.html as classic tags so ChromeOS
 * users opening index.html directly via file:// don't hit module/CORS blocks.
 */
function fileProtocolBundlePlugin(): Plugin {
  return {
    name: 'file-protocol-bundle',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const bundle = ctx.bundle;
        if (!bundle) return html;

        let result = html;
        const cssChunks: string[] = [];
        const jsChunks: string[] = [];

        for (const [fileName, output] of Object.entries(bundle)) {
          const escapedName = escapeRegExp(fileName);
          if (output.type === 'asset' && fileName.endsWith('.css')) {
            const source =
              typeof output.source === 'string'
                ? output.source
                : Buffer.from(output.source).toString('utf8');
            cssChunks.push(source.replace(/<\/style/gi, '<\\/style'));
            result = result.replace(
              new RegExp(`<link\\b[^>]*href=["'][^"']*${escapedName}["'][^>]*>\\s*`, 'gi'),
              () => ''
            );
          } else if (output.type === 'chunk' && fileName.endsWith('.js')) {
            jsChunks.push(output.code.replace(/<\/script/gi, '<\\/script'));
            result = result.replace(
              new RegExp(`<script\\b[^>]*src=["'][^"']*${escapedName}["'][^>]*><\\/script>\\s*`, 'gi'),
              () => ''
            );
          }
        }

        if (cssChunks.length > 0) {
          const styleTag = `<style>${cssChunks.join('\n')}</style>\n  `;
          result = result.replace('</head>', () => `${styleTag}</head>`);
        }

        if (jsChunks.length > 0) {
          const scriptTag = `  <script>${jsChunks.join('\n')}</script>\n  `;
          result = result.replace('</body>', () => `${scriptTag}</body>`);
        }

        return result;
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), fileProtocolBundlePlugin()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 307200,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
      },
    },
  },
});
