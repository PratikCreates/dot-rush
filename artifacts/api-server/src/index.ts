import { createServer } from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { attachWebSocketServer } from "./ws/roomManager";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = createServer(app);

attachWebSocketServer(httpServer);

httpServer.listen(port, () => {
  logger.info({ port }, "Server listening");
  logger.info({ path: "/ws" }, "WebSocket endpoint ready");
});

httpServer.on("error", (err) => {
  logger.error({ err }, "Server error");
  process.exit(1);
});
