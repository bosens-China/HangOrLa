import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import UnoCSS from 'unocss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import AutoImport from 'unplugin-auto-import/vite';
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers';
import Components from 'unplugin-vue-components/vite';

// 检测是否在 GitHub Actions 环境中
const isCI = !!(process.env.GITHUB_ACTIONS || process.env.CI);

// https://vite.dev/config/
export default defineConfig({
  // 在 CI 环境中部署到 GitHub Pages 时使用仓库名作为 base 路径
  // 本地开发时使用根路径
  base: isCI ? '/HangOrLa/' : '/',
  plugins: [
    vue(),
    AutoImport({
      eslintrc: {
        enabled: true,
      },
      imports: [
        'vue',
        {
          'naive-ui': [
            'useDialog',
            'useMessage',
            'useNotification',
            'useLoadingBar',
          ],
        },
      ],
    }),
    Components({
      resolvers: [NaiveUiResolver()],
    }),
    UnoCSS(),
    tsconfigPaths({
      loose: true,
    }),
  ],
});
