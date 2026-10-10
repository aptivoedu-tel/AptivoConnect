import { Resend } from 'resend';

export async function sendEmail({
    to,
    subject,
    html,
    from,
    replyTo,
}: {
    to: string;
    subject: string;
    html: string;
    from?: string;           // optional — defaults to noreply@aptivo.tech
    replyTo?: string;        // optional — useful for contact form replies
}) {
    // Initialize inside the function to ensure process.env is loaded
    const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy');

    // Parse sender name & address from optional `from` string
    // Expected format: '"Name" <email@domain.com>' or 'email@domain.com'
    const senderEmail = from
        ? (from.match(/<(.+)>/) ?? [null, from])[1]
        : 'career@aptivo.tech';
    const senderName = from
        ? (from.match(/^"?([^"<]+)"?\s*</) ?? [null, 'APTIVO Team'])[1].trim()
        : 'APTIVO Team';

    try {
        const { data, error } = await resend.emails.send({
            from: from ?? 'APTIVO Team <noreply@aptivo.tech>',
            to,
            subject,
            html,
            ...(replyTo ? { reply_to: replyTo } : {}),
        });

        if (error) {
            throw new Error(error.message);
        }

        return data;
    } catch (error: any) {
        console.error('[RESEND] Email send error:', error.message || error);
        console.log('[BREVO] Attempting to send via Brevo REST API fallback...');

        // Use Brevo REST API — NOT SMTP.
        // SMTP triggers IP-whitelist verification on every new AWS/Vercel server IP.
        // REST API authenticates by API key only — no IP restrictions, no re-verification prompts.
        try {
            const brevoApiKey = process.env.BREVO_API_KEY;
            if (!brevoApiKey) throw new Error('BREVO_API_KEY env var is not set');

            const payload = {
                sender: { name: senderName, email: senderEmail },
                to: [{ email: to }],
                subject,
                htmlContent: html,
                ...(replyTo ? { replyTo: { email: replyTo } } : {}),
            };

            const response = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'content-type': 'application/json',
                    'api-key': brevoApiKey,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errBody = await response.text();
                throw new Error(`Brevo API responded ${response.status}: ${errBody}`);
            }

            const result = await response.json();
            console.log('[BREVO] Fallback email sent successfully via REST API. messageId:', result.messageId);
            return result;
        } catch (brevoError: any) {
            console.error('[BREVO] Fallback failed:', brevoError.message || brevoError);
            throw new Error(
                `Email sending failed (Resend & Brevo). Resend Error: ${error.message}. Brevo Error: ${brevoError.message}`
            );
        }
    }
}
