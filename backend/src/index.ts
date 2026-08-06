import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/database.js";

async function main() {
  await prisma.$connect();
  app.listen(env.port, () => {
    console.log(`[mig-flares] API listening on http://localhost:${env.port} (${env.nodeEnv})`);
  });
}

main().catch((error) => {
  console.error("[mig-flares] Failed to start server", error);
  process.exit(1);
});
