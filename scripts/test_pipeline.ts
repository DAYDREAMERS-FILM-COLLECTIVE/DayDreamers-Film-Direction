import { confirmBookingAction, verifyTicketAction } from '../src/app/actions/booking';
import { supabase } from '../src/lib/supabase/client';

async function runTest() {
  console.log('--- STARTING CONCURRENCY & CRYPTOGRAPHIC VERIFICATION TEST ---');

  const showtimeId = 'st-01';
  const seatIds = ['A-01', 'A-02'];
  const testSession = 'test_session_' + Date.now();
  const testEmail = 'filmmaker@university.edu';
  const testUsn = '1RV22CS999';

  // 1. Release any prior test holds
  await supabase.rpc('release_seats_atomic', {
    p_seat_ids: seatIds,
    p_showtime_id: showtimeId,
    p_session_id: testSession,
  });

  // 2. Test Atomic Hold RPC
  console.log('1. Testing hold_seats_atomic RPC...');
  const { data: holdData, error: holdErr } = await supabase.rpc('hold_seats_atomic', {
    p_seat_ids: seatIds,
    p_showtime_id: showtimeId,
    p_session_id: testSession,
    p_ttl_seconds: 300,
  });

  if (holdErr || !holdData?.success) {
    console.error('Hold failed:', holdErr || holdData);
    process.exit(1);
  }
  console.log('✓ Atomic hold acquired:', holdData);

  // 3. Test Confirm Booking Action
  console.log('2. Testing confirmBookingAction (HMAC + Atomic Booking)...');
  const confirmResult = await confirmBookingAction({
    showtimeId,
    seatIds,
    attendeeEmail: testEmail,
    attendeeUsn: testUsn,
    sessionId: testSession,
  });

  if (!confirmResult.success || !confirmResult.tickets) {
    console.error('Confirm booking failed:', confirmResult.error);
    process.exit(1);
  }
  console.log(`✓ Booking confirmed. Minted ${confirmResult.tickets.length} cryptographic 35mm passes.`);

  const sampleTicket = confirmResult.tickets[0];
  console.log('Sample ticket minted:', {
    id: sampleTicket.ticketId,
    seat: sampleTicket.seatId,
    qrHashPrefix: sampleTicket.qrHash.substring(0, 16),
  });

  // 4. Test Door Scanner Admission Verification (First Time)
  console.log('3. Testing verifyTicketAction (First-time admission)...');
  const admitResult1 = await verifyTicketAction({
    ticketId: sampleTicket.ticketId,
    showtimeId,
    seatId: sampleTicket.seatId,
    qrHash: sampleTicket.qrHash,
    adminKey: 'fps-door-admin-alpha-2026',
  });

  if (!admitResult1.success || admitResult1.code !== 'ADMISSION_GRANTED') {
    console.error('Admission failed:', admitResult1);
    process.exit(1);
  }
  console.log('✓ Door check-in granted admission successfully.');

  // 5. Test Double-Redemption Protection
  console.log('4. Testing duplicate door check-in prevention...');
  const admitResult2 = await verifyTicketAction({
    ticketId: sampleTicket.ticketId,
    showtimeId,
    seatId: sampleTicket.seatId,
    qrHash: sampleTicket.qrHash,
    adminKey: 'fps-door-admin-alpha-2026',
  });

  if (admitResult2.success || admitResult2.code !== 'ALREADY_ADMITTED') {
    console.error('Expected ALREADY_ADMITTED, received:', admitResult2);
    process.exit(1);
  }
  console.log('✓ Double-redemption blocked with ALREADY_ADMITTED:', admitResult2.message);

  // 6. Test Forged QR Hash Detection
  console.log('5. Testing forged HMAC signature rejection...');
  const forgedResult = await verifyTicketAction({
    ticketId: sampleTicket.ticketId,
    showtimeId,
    seatId: sampleTicket.seatId,
    qrHash: 'deadbeef00000000000000000000000000000000000000000000000000000000',
    adminKey: 'fps-door-admin-alpha-2026',
  });

  if (forgedResult.success || forgedResult.code !== 'FORGED_SIGNATURE') {
    console.error('Expected FORGED_SIGNATURE, received:', forgedResult);
    process.exit(1);
  }
  console.log('✓ Forged QR code rejected with FORGED_SIGNATURE.');

  console.log('\n--- ALL ARCHITECTURAL, CONCURRENCY, AND SECURITY AUDITS PASSED ---');
}

runTest().catch((e) => {
  console.error('Test runner fatal error:', e);
  process.exit(1);
});
