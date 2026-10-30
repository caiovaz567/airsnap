import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

type Handler = (request: Request) => Promise<Response>;

function apiDevServer(env: Record<string, string>): Plugin {
  return {
    name: "airsnap-api",
    configureServer(server) {
      Object.assign(process.env, env);
      server.middlewares.use("/api/lg", async (req, res) => {
        try {
          const handlers = (await server.ssrLoadModule("/api/lg.ts")) as Record<string, Handler | undefined>;
          const handler = handlers[req.method ?? "GET"];
          if (!handler) {
            res.statusCode = 405;
            res.end();
            return;
          }
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const url = new URL(req.originalUrl ?? req.url ?? "/", `http://${req.headers.host}`);
          const response = await handler(
            new Request(url, {
              method: req.method,
              headers: req.headers as Record<string, string>,
              body: req.method === "GET" ? undefined : Buffer.concat(chunks),
            }),
          );
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (e) {
          server.config.logger.error(e instanceof Error ? (e.stack ?? e.message) : String(e));
          res.statusCode = 500;
          res.end();
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), apiDevServer(loadEnv(mode, process.cwd(), ""))],
  server: { port: 3000 },
}));
