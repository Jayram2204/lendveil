import type { FastifyReply } from "fastify";

export class ApiError extends Error {
  code: string;
  statusCode: number;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

export const sendSuccess = <T>(
  reply: FastifyReply,
  data: T,
  statusCode = 200
) => {
  return reply.status(statusCode).send({
    success: true,
    data,
    timestamp: new Date().toISOString()
  });
};

export const sendError = (reply: FastifyReply, error: unknown) => {
  if (error instanceof ApiError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: {
        code: error.code,
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }

  return reply.status(500).send({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: error instanceof Error ? error.message : "Unknown error"
    },
    timestamp: new Date().toISOString()
  });
};
