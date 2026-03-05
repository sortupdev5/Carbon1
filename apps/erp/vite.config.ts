import { reactRouter } from "@react-router/dev/vite";
import path from "node:path";
import { defineConfig, PluginOption } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ isSsrBuild }) => ({
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
      "@ai-sdk/react",
      "@ai-sdk-tools/agents",
      "@ai-sdk-tools/artifacts",
      "@ai-sdk-tools/cache",
      "@ai-sdk-tools/devtools",
      "@ai-sdk-tools/memory",
      "@ai-sdk-tools/store",
      "react-tweet",
      "react-csv",
      "json-2-csv",
      "papaparse",
      "@marsidev/react-turnstile",
      "react-dropzone",
      "react-icons",
      "react-phone-number-input",
      "tailwind-merge",
    ],
  },
  server: {
    port: 3000,
    allowedHosts: [".ngrok-free.app", ".ngrok-free.dev"],
  },
  plugins: [reactRouter(), tsconfigPaths()] as PluginOption[],
  resolve: {
    alias: {
      "@carbon/auth/auth.server": path.resolve(__dirname, "../../packages/auth/src/services/auth.server.ts"),
      "@carbon/auth/company.server": path.resolve(__dirname, "../../packages/auth/src/services/company.server.ts"),
      "@carbon/auth/session.server": path.resolve(__dirname, "../../packages/auth/src/services/session.server.ts"),
      "@carbon/auth/users.server": path.resolve(__dirname, "../../packages/auth/src/services/users.server.ts"),
      "@carbon/auth/verification.server": path.resolve(__dirname, "../../packages/auth/src/services/verification.server.ts"),
      "@carbon/auth": path.resolve(__dirname, "../../packages/auth/src/index.ts"),
      "@carbon/database/client": path.resolve(__dirname, "../../packages/database/src/client.ts"),
      "@carbon/database": path.resolve(__dirname, "../../packages/database/src/index.ts"),
      "@carbon/documents/email": path.resolve(__dirname, "../../packages/documents/src/email/index.ts"),
      "@carbon/documents/pdf": path.resolve(__dirname, "../../packages/documents/src/pdf/index.ts"),
      "@carbon/documents/zpl": path.resolve(__dirname, "../../packages/documents/src/zpl/index.ts"),
      "@carbon/documents/qr": path.resolve(__dirname, "../../packages/documents/src/qr/qr-code.ts"),
      "@carbon/form": path.resolve(__dirname, "../../packages/form/src/index.tsx"),
      "@carbon/react": path.resolve(__dirname, "../../packages/react/src/index.tsx"),
      "@carbon/remix": path.resolve(__dirname, "../../packages/remix/src/index.ts"),
      "@carbon/utils": path.resolve(__dirname, "../../packages/utils/src/index.ts"),
    },
  },
}));
