import { defineConfig } from "@rsbuild/core";
import { pluginVue2 } from "@rsbuild/plugin-vue2";
import { UnoCSSRspackPlugin } from "@unocss/webpack/rspack";

export default defineConfig({
  plugins: [pluginVue2()],
  tools: {
    rspack: (config, { prependPlugins }) => {
      prependPlugins(UnoCSSRspackPlugin());
    },
  },
});
