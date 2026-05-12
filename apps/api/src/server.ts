import Fastify from "fastify";
import { registerArciumRoutes } from "./routes/arcium.js";
import { registerAttestationRoutes } from "./routes/attestations.js";
import { registerSystemRoutes } from "./routes/system.js";
import { registerUnderwritingRoutes } from "./routes/underwriting.js";
import { registerOnchainRoutes } from "./routes/onchain.js";
import { underwritingWorker, closeQueue } from "./queue/underwriting-queue.js";
import { registerRateLimit } from "./lib/rate-limit.js";

const port = Number(process.env.PORT ?? 4000);
const app = Fastify({
  logger: true
});

// Register rate limiting
await registerRateLimit(app);

await registerSystemRoutes(app);
await registerArciumRoutes(app);
await registerAttestationRoutes(app);
await registerUnderwritingRoutes(app);
await registerOnchainRoutes(app);

const start = async () => {
  try {
    await app.listen({
      host: "0.0.0.0",
      port
    });

    console.log(`Server running on port ${port}`);
    console.log('Underwriting worker started');
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await app.close();
  await closeQueue();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await app.close();
  await closeQueue();
  process.exit(0);
});

void start();
