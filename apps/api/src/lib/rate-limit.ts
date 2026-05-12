import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { redis } from '../queue/redis.js';

export async function registerRateLimit(app: FastifyInstance) {
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '15 minutes',
    cache: 10000,
    allowList: ['127.0.0.1'],
    redis: redis,
    keyGenerator: (request: FastifyRequest) => {
      // Use IP address as key
      return request.ip;
    },
    errorResponseBuilder: () => {
      return {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later'
        },
        timestamp: new Date().toISOString()
      };
    }
  });
}
