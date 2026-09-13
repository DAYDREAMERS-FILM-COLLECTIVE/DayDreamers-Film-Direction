import { createHmac, timingSafeEqual } from 'crypto';

const TICKET_SECRET = process.env.TICKET_SECRET || 'fps-default-development-ticket-secret-hmac-sha256-key';

/**
 * Generates an HMAC-SHA256 forge-proof signature for a ticket
 */
export function generateTicketHash(ticketId: string, showtimeId: string, seatId: string): string {
  return createHmac('sha256', TICKET_SECRET)
    .update(`${ticketId}|${showtimeId}|${seatId}`)
    .digest('hex');
}

/**
 * Constant-time comparison to prevent timing attacks on hash verification
 */
export function verifyTicketHash(ticketId: string, showtimeId: string, seatId: string, candidateHash: string): boolean {
  const expectedHash = generateTicketHash(ticketId, showtimeId, seatId);
  try {
    const expectedBuffer = Buffer.from(expectedHash, 'hex');
    const candidateBuffer = Buffer.from(candidateHash, 'hex');
    if (expectedBuffer.length !== candidateBuffer.length) {
      return false;
    }
    return timingSafeEqual(expectedBuffer, candidateBuffer);
  } catch {
    return false;
  }
}
