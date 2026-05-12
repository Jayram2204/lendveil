import { Queue, Worker } from 'bullmq';
import { redis } from './redis.js';
import { underwritingService } from '../services/underwriting-service.js';

export interface UnderwritingJobData {
  borrower_pubkey: string;
  attestation_ids: string[];
}

export interface UnderwritingJobResult {
  request_id: string;
  decision_id: string;
  eligible: boolean;
  risk_band: string;
  max_borrow_usd: string;
}

// Create the queue
export const underwritingQueue = new Queue<UnderwritingJobData, UnderwritingJobResult>(
  'underwriting',
  {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: true,
      removeOnFail: false
    }
  }
);

// Create the worker
export const underwritingWorker = new Worker<UnderwritingJobData, UnderwritingJobResult>(
  'underwriting',
  async (job) => {
    console.log(`Processing underwriting job ${job.id}:`, job.data);

    try {
      const result = await underwritingService.submit({
        borrower_pubkey: job.data.borrower_pubkey,
        attestation_ids: job.data.attestation_ids
      });

      // Extract decision data for result
      const decision = (result as any).decision;
      return {
        request_id: result.request_id,
        decision_id: decision.decision_id,
        eligible: decision.eligible,
        risk_band: decision.risk_band,
        max_borrow_usd: decision.max_borrow_usd
      };
    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);
      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 5
  }
);

// Event listeners
underwritingWorker.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

underwritingWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

underwritingWorker.on('error', (err) => {
  console.error('Worker error:', err);
});

underwritingQueue.on('error', (err) => {
  console.error('Queue error:', err);
});

// Graceful shutdown
export async function closeQueue() {
  await underwritingWorker.close();
  await underwritingQueue.close();
  await redis.quit();
}
