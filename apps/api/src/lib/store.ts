import type {
  ArciumEncryptedSession,
  AttestationRecord,
  AuditLog,
  UnderwritingRequestRecord
} from "@lendveil/types";

export const attestations = new Map<string, AttestationRecord>();
export const requests = new Map<string, UnderwritingRequestRecord>();
export const arciumSessions = new Map<
  string,
  ArciumEncryptedSession & {
    client_secret_key_hex: string;
  }
>();
export const auditLogs: AuditLog[] = [];
