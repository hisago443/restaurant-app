
'use server';
/**
 * @fileOverview A flow to send an email receipt to a customer using Resend.
 *
 * - sendEmailReceipt - A function that sends the email.
 * - SendEmailReceiptInput - The input type for the sendEmailReceipt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { Resend } from 'resend';

// Initialize Resend with the API key from environment variables.
// Ensure your RESEND_API_KEY is set in your .env file.
const resend = new Resend(process.env.RESEND_API_KEY);

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
    // Check if the API key is available.
    if (!process.env.RESEND_API_KEY) {
      console.error("Resend API key is not configured. Email will not be sent.");
      // Return a failure but don't block the user's flow.
      return { success: false, message: 'Email service is not configured on the server.' };
    }

    try {
      // IMPORTANT: The 'from' address MUST be a verified domain in your Resend account.
      // For testing and new accounts, Resend allows using 'onboarding@resend.dev'.
      // To use your own domain, you must verify it in the Resend dashboard.
      const fromAddress = 'Up & Above Assistant <onboarding@resend.dev>';
      
      await resend.emails.send({
        from: fromAddress,
        to: input.customerEmail,
        subject: input.subject || `Your receipt for ₹${input.totalAmount.toFixed(2)}`,
        // Using 'text' for plain text emails. For HTML, use the 'html' property.
        text: input.receiptContent,
      });

      return { success: true, message: 'Email sent successfully.' };
    } catch (error) {
      console.error("Failed to send email via Resend:", error);
      // Determine the error message to return
      let errorMessage = 'Failed to send email.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      return { success: false, message: errorMessage };
    }
  }
);
