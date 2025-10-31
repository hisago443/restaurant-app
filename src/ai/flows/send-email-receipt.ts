
'use server';
/**
 * @fileOverview A flow to send an email receipt to a customer using the Gmail API.
 *
 * - sendEmailReceipt - A function that sends the email.
 * - SendEmailReceiptInput - The input type for the sendEmailReceipt function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

const SendEmailReceiptInputSchema = z.object({
  customerEmail: z.string().email().describe('The email address of the customer.'),
  receiptContent: z.string().describe('The text content of the receipt.'),
  totalAmount: z.number().describe('The total amount of the bill.'),
  subject: z.string().optional().describe('The subject of the email.'),
});

export type SendEmailReceiptInput = z.infer<typeof SendEmailReceiptInputSchema>;

export async function sendEmailReceipt(input: SendEmailReceiptInput): Promise<{success: boolean; message: string}> {
  return sendEmailReceiptFlow(input);
}

const sendEmailReceiptFlow = ai.defineFlow(
  {
    name: 'sendEmailReceiptFlow',
    inputSchema: SendEmailReceiptInputSchema,
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string(),
    }),
  },
  async (input) => {
    const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_USER } = process.env;

    if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN || !GMAIL_USER) {
      const errorMessage = "Gmail API credentials are not configured in the .env file. Email will not be sent.";
      console.error(errorMessage);
      return { success: false, message: errorMessage };
    }

    const oauth2Client: OAuth2Client = new google.auth.OAuth2(
      GMAIL_CLIENT_ID,
      GMAIL_CLIENT_SECRET,
      "https://developers.google.com/oauthplayground" // This redirect URI is for the playground
    );

    oauth2Client.setCredentials({
      refresh_token: GMAIL_REFRESH_TOKEN,
    });

    try {
      // Refresh the access token
      const { token } = await oauth2Client.getAccessToken();
      if (!token) {
        throw new Error('Failed to retrieve access token.');
      }
      oauth2Client.setCredentials({ access_token: token });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      const subject = input.subject || `Your receipt for ₹${input.totalAmount.toFixed(2)}`;
      const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
      const messageParts = [
        `From: Up & Above Assistant <${GMAIL_USER}>`,
        `To: ${input.customerEmail}`,
        'Content-Type: text/plain; charset=utf-8',
        'MIME-Version: 1.0',
        `Subject: ${utf8Subject}`,
        '',
        input.receiptContent,
      ];
      const message = messageParts.join('\n');

      // The body needs to be base64url encoded.
      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      return { success: true, message: 'Email sent successfully via Gmail.' };
    } catch (error) {
      console.error("Failed to send email via Gmail:", error);
      let errorMessage = 'Failed to send email.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      return { success: false, message: errorMessage };
    }
  }
);
