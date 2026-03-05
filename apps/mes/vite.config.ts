import { reactRouter } from "@react-router/dev/vite";
import path from "node:path";
import { defineConfig, PluginOption } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode, isSsrBuild }) => ({
  build: {
    minify: true,
    rollupOptions: {
      onwarn(warning, defaultHandler) {
        if (warning.code === "SOURCEMAP_ERROR") {
          return;
        }

        defaultHandler(warning);
      },
      ...(isSsrBuild && { input: "./server/app.ts" }),
    },
  },
  define: {
    global: "globalThis",
  },
  ssr: {
    noExternal: [
      "@carbon/auth",
      "@carbon/database",
      "@carbon/documents",
      "@carbon/form",
      "@carbon/react",
      "@carbon/remix",
      "@carbon/utils",
      "react-dropzone",
      "react-icons",
      "react-phone-number-input",
      "tailwind-merge",
      "@tanstack/react-query",
      "@tanstack/react-table",
      "@tanstack/react-virtual",
      "@vercel/analytics",
      "@vercel/react-router",
      "@react-aria/i18n",
      "react-markdown",
      "remark-gfm",
      "rehype-raw",
      "rehype-sanitize",
      "framer-motion",
      "isbot",
      "nanoid",
      "nanostores",
      "recharts",
      "ai",
      "motion-number",
    ],
  },
  server: {
    port: 3001,
    allowedHosts: [".ngrok-free.app", ".w.modal.host", ".w.modal.dev"],
  },
  plugins: [reactRouter(), tsconfigPaths()] as PluginOption[],
  resolve: {
    alias: {
      "@carbon/auth/auth.server": path.resolve(__dirname, "../../packages/auth/src/services/auth.server.ts"),
      "@carbon/auth/company.server": path.resolve(__dirname, "../../packages/auth/src/services/company.server.ts"),
      "@carbon/auth/session.server": path.resolve(__dirname, "../../packages/auth/src/services/session.server.ts"),
      "@carbon/auth/users.server": path.resolve(__dirname, "../../packages/auth/src/services/users.server.ts"),
      "@carbon/auth/verification.server": path.resolve(__dirname, "../../packages/auth/src/services/verification.server.ts"),
      "@carbon/auth": path.resolve(__dirname, "../../packages/auth/src"),
      "@carbon/database/client": path.resolve(__dirname, "../../packages/database/src/client.ts"),
      "@carbon/database": path.resolve(__dirname, "../../packages/database/src"),
      "@carbon/documents/email": path.resolve(__dirname, "../../packages/documents/src/email"),
      "@carbon/documents/pdf": path.resolve(__dirname, "../../packages/documents/src/pdf"),
      "@carbon/documents/zpl": path.resolve(__dirname, "../../packages/documents/src/zpl"),
      "@carbon/documents/qr": path.resolve(__dirname, "../../packages/documents/src/qr/qr-code.ts"),
      "@carbon/form": path.resolve(__dirname, "../../packages/form/src"),
      "@carbon/react": path.resolve(__dirname, "../../packages/react/src"),
      "@carbon/remix": path.resolve(__dirname, "../../packages/remix/src"),
      "@carbon/utils": path.resolve(__dirname, "../../packages/utils/src"),
    },
  },
}));
