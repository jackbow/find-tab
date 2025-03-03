import { defineConfig } from 'wxt';
import pkg from "./package.json";

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  extensionApi: 'webextension-polyfill',
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    name: pkg.displayName,
    permissions: ["tabs", "sessions"],
    host_permissions: [
      "<all_urls>"
    ],
    background: { scripts: ["src/entrypoints/background.ts"] },
    action: {
      default_popup: "src/entrypoints/popup/index.html",
      default_title: "Find Tab"
    },
    commands: {
      togglePopup: {
        suggested_key: {
          default: "Ctrl+Shift+E",
          mac: "Command+Shift+E"
        },
        description: "Opens the popup"
      }
    },
  }
});
