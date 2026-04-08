import Fastify from "fastify";

const port = Number(process.env.PORT ?? 4000);
const app = Fastify({
  logger: true
});

app.get("/health", async () => {
  return {
    status: "ok",
    service: "confidential-underwriting-api"
  };
});

app.get("/v1/underwriting/demo", async () => {
  return {
    applicant: "demo-wallet",
    eligible: true,
    riskBand: "A2",
    maxBorrowAmountUsd: 25000,
    requiredCollateralRatio: 0.35
  };
});

const start = async () => {
  try {
    await app.listen({
      host: "0.0.0.0",
      port
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

void start();
