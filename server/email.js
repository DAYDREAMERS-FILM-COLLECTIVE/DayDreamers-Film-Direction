import { Resend } from 'resend';

export async function sendTicketEmail({ recipientEmail, attendeeName, filmTitle, showDate, showTime, hall, seats, refCode, qrDataUri }) {
    const resendApiKey = process.env.RESEND_API_KEY;
    const senderEmail = process.env.SENDER_EMAIL || 'tickets@daydreamers.club';

    if (!resendApiKey) {
        console.log(`[Email Dispatch] RESEND_API_KEY not configured. Simulated email delivery to ${recipientEmail} for ticket ${refCode}`);
        return { success: true, simulated: true };
    }

    try {
        const resend = new Resend(resendApiKey);

        // Convert data URI to buffer for email attachment
        let attachments = [];
        if (qrDataUri && qrDataUri.includes(',')) {
            const base64Data = qrDataUri.split(',')[1];
            attachments.push({
                filename: `ticket-${refCode}-pass.png`,
                content: base64Data,
                contentType: 'image/png',
                disposition: 'inline',
                cid: 'qrcode'
            });
        }

        const seatList = Array.isArray(seats) ? seats.join(', ') : seats;

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { background-color: #08090d; color: #f3ead8; font-family: 'Helvetica Neue', Arial, sans-serif; padding: 20px; }
                .ticket-box { max-width: 500px; margin: 0 auto; background: #11131a; border: 1px solid #e3b94e; border-radius: 12px; padding: 30px; }
                .header { text-align: center; border-bottom: 1px solid rgba(227,185,78,0.25); padding-bottom: 20px; margin-bottom: 25px; }
                .brand { font-size: 14px; letter-spacing: 0.2em; text-transform: uppercase; color: #e3b94e; }
                .title { font-size: 26px; font-weight: bold; margin: 10px 0 5px 0; color: #fff; }
                .row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; }
                .label { color: #8b8778; text-transform: uppercase; letter-spacing: 0.05em; }
                .val { font-weight: 600; color: #f3ead8; }
                .qr-wrap { text-align: center; margin: 30px 0 10px 0; padding: 20px; background: #fff; border-radius: 8px; display: inline-block; }
                .foot { font-size: 12px; color: #8b8778; text-align: center; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="ticket-box">
                <div class="header">
                    <div class="brand">Daydreamers Film Club</div>
                    <div class="title">${filmTitle}</div>
                    <div style="color: #e3b94e; font-size: 12px; letter-spacing: 0.1em;">OFFICIAL ADMISSION PASS</div>
                </div>

                <div class="row"><span class="label">Attendee</span><span class="val">${attendeeName}</span></div>
                <div class="row"><span class="label">Reference</span><span class="val" style="font-family: monospace;">${refCode}</span></div>
                <div class="row"><span class="label">Date & Time</span><span class="val">${showDate} | ${showTime}</span></div>
                <div class="row"><span class="label">Venue</span><span class="val">${hall}</span></div>
                <div class="row"><span class="label">Seats Reserved</span><span class="val" style="color: #e3b94e;">${seatList}</span></div>

                <div style="text-align: center;">
                    <div class="qr-wrap">
                        <img src="cid:qrcode" alt="QR Ticket" width="180" height="180" style="display: block; margin: 0 auto;" />
                    </div>
                </div>

                <div class="foot">
                    Present this cryptographic QR pass at the entrance scanner.<br>
                    Single-use only. Valid for RVU Film Club members.
                </div>
            </div>
        </body>
        </html>
        `;

        const { data, error } = await resend.emails.send({
            from: senderEmail,
            to: recipientEmail,
            subject: `🎟️ Your Ticket for ${filmTitle} [${refCode}]`,
            html: htmlContent,
            attachments
        });

        if (error) {
            console.error('[Email Dispatch] Resend API Error:', error);
            return { success: false, error };
        }

        console.log('[Email Dispatch] Sent successfully to', recipientEmail, 'ID:', data?.id);
        return { success: true, data };
    } catch (err) {
        console.error('[Email Dispatch] Unexpected error:', err);
        return { success: false, error: err.message };
    }
}
