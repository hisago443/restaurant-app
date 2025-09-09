
'use server';
/**
 * @fileOverview A flow to generate and email sales and staff reports by fetching data from Firestore.
 *
 * - generateAndSendReport - A function that fetches data, compiles a report, and emails it.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { sendEmailReceipt } from './send-email-receipt';
import { GenerateReportInputSchema, GenerateReportOutputSchema, type GenerateReportInput, type GenerateReportOutput, type Bill, type Employee } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';


// We have to create a wrapper because the frontend cannot pass complex types like `Date`
// to the backend flow. We convert them to JSON-serializable formats here.
export async function generateAndSendReport(
  input: {
    reportType: 'daily' | 'monthly' | 'yearly';
    recipientEmail: string;
  }
): Promise<GenerateReportOutput> {
  // Fetch data from Firestore
  const billsSnapshot = await getDocs(collection(db, "bills"));
  const billHistory: Bill[] = billsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
          ...data,
          id: doc.id,
          timestamp: data.timestamp.toDate(), // Convert Firestore Timestamp to Date
      } as Bill;
  });
  
  const employeesSnapshot = await getDocs(collection(db, "employees"));
  const employees: Employee[] = employeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
  
  const serializableInput: GenerateReportInput = {
    ...input,
    billHistory: billHistory.map(bill => ({
      id: bill.id,
      total: bill.total,
      timestamp: bill.timestamp.toISOString(),
    })),
    employees,
  };
  return generateReportFlow(serializableInput);
}


const ReportOutputSchema = z.object({
  reportTitle: z.string().describe('The title of the report (e.g., "Daily Sales Report").'),
  reportContent: z.string().describe('The full report content, formatted nicely for an email body.'),
  totalRevenue: z.number().describe('The total revenue for the period.'),
});

const generateReportPrompt = ai.definePrompt({
  name: 'generateReportPrompt',
  input: { schema: GenerateReportInputSchema },
  output: { schema: ReportOutputSchema },
  prompt: `You are an expert financial analyst for a restaurant. Your task is to generate a sales and staff report based on the provided data. The report should be clear, concise, and ready to be emailed.

Report Type: {{{reportType}}}
Recipient: {{{recipientEmail}}}
Current Date: ${new Date().toDateString()}

Filter the bill history based on the report type.
- For a 'daily' report, only include bills from today.
- For a 'monthly' report, only include bills from the current month.
- For a 'yearly' report, only include bills from the current year.

Your report should contain the following sections:
1.  **Sales Summary**:
    *   Total number of bills.
    *   Total revenue from all bills in the period.
    *   A list of all bills with their ID and total amount.
2.  **Staff Summary**:
    *   A list of all employees with their name, role, and salary.

Analyze the provided bill history and employee list to generate the report.

Bill History (JSON):
{{{json billHistory}}}

Employee Data (JSON):
{{{json employees}}}

Generate the report title and content. The content should be well-formatted for an email. Calculate the total revenue and include it in the designated field.
`,
});

const generateReportFlow = ai.defineFlow(
  {
    name: 'generateReportFlow',
    inputSchema: GenerateReportInputSchema,
    outputSchema: GenerateReportOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await generateReportPrompt(input);

      if (!output) {
        throw new Error('Failed to generate the report content.');
      }
      
      const emailResult = await sendEmailReceipt({
          customerEmail: input.recipientEmail,
          receiptContent: output.reportContent,
          totalAmount: output.totalRevenue,
          subject: output.reportTitle,
      });

      if (!emailResult.success) {
        throw new Error(emailResult.message || 'An unknown error occurred while sending the email.');
      }

      return {
        success: true,
        message: 'Report generated and sent successfully.',
      };
    } catch (error: any) {
      console.error("Error in generateReportFlow:", error);
      return {
        success: false,
        message: error.message || 'An unexpected error occurred.',
      };
    }
  }
);
