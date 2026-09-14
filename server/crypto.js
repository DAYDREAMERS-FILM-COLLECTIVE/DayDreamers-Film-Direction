import crypto from 'crypto';

const SECRET = process.env.TICKET_SECRET || 'fps-cryptographic-ticket-secret-2026-key';

export function signTicket(bookingId, refCode, usn, showingId, seats) {
    const seatStr = Array.isArray(seats) ? seats.slice().sort().join(',') : String(seats);
    const dataToSign = `${bookingId}:${refCode}:${usn}:${showingId}:${seatStr}`;
    const hmac = crypto.createHmac('sha256', SECRET);
    hmac.update(dataToSign);
    const signature = hmac.digest('hex');

    const payload = {
        bId: bookingId,
        ref: refCode,
        usn: usn,
        shId: showingId,
        seats: Array.isArray(seats) ? seats : [seats]
    };

    const tokenObj = {
        p: payload,
        s: signature
    };

    // Return URL-safe base64 string
    const jsonStr = JSON.stringify(tokenObj);
    return Buffer.from(jsonStr).toString('base64url');
}

export function verifyTicket(tokenString) {
    try {
        let jsonStr = '';
        if (tokenString.startsWith('{') && tokenString.endsWith('}')) {
            jsonStr = tokenString;
        } else {
            jsonStr = Buffer.from(tokenString, 'base64url').toString('utf8');
        }
        const tokenObj = JSON.parse(jsonStr);
        if (!tokenObj.p || !tokenObj.s) {
            return { valid: false, error: 'Invalid token structure' };
        }

        const { bId, ref, usn, shId, seats } = tokenObj.p;
        const seatStr = Array.isArray(seats) ? seats.slice().sort().join(',') : String(seats);
        const dataToSign = `${bId}:${ref}:${usn}:${shId}:${seatStr}`;

        const hmac = crypto.createHmac('sha256', SECRET);
        hmac.update(dataToSign);
        const expectedSignature = hmac.digest('hex');

        // Timing-safe comparison to prevent timing attacks
        const sigBuf = Buffer.from(tokenObj.s, 'hex');
        const expBuf = Buffer.from(expectedSignature, 'hex');

        if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
            return { valid: false, error: 'Cryptographic signature mismatch' };
        }

        return {
            valid: true,
            payload: tokenObj.p
        };
    } catch (err) {
        return { valid: false, error: 'Malformed ticket token: ' + err.message };
    }
}
