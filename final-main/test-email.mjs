import { Resend } from 'resend';
import 'dotenv/config'; // Loads from .env automatically if run with env files, or just uses system env vars

const resend = new Resend(process.env.RESEND_API_KEY || 'MISSING_RESEND_KEY');
const brevoKey = process.env.BREVO_API_KEY || 'MISSING_BREVO_KEY';
const toEmail = 'email@gmai.com';

async function testEmail() {
    console.log("1. Testing Resend...");
    try {
        const { data, error } = await resend.emails.send({
            from: 'APTIVO Team <noreply@aptivo.tech>',
            to: toEmail,
            subject: 'Test Email Verification',
            html: '<h1>This is a test email</h1>'
        });
        if (error) throw new Error(error.message);
        console.log("Resend Success:", data);
    } catch (e) {
        console.error("Resend Failed:", e.message);
        console.log("2. Testing Brevo Fallback...");
        try {
            const payload = {
                sender: { name: 'APTIVO Team', email: 'career@aptivo.tech' },
                to: [{ email: toEmail }],
                subject: 'Test Email Verification',
                htmlContent: '<h1>This is a test email</h1>'
            };
            const response = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'content-type': 'application/json',
                    'api-key': brevoKey,
                },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const errBody = await response.text();
                throw new Error(`Brevo API responded ${response.status}: ${errBody}`);
            }
            const result = await response.json();
            console.log('Brevo Success:', result);
        } catch (be) {
            console.error("Brevo Failed:", be.message);
        }
    }
}
testEmail();
