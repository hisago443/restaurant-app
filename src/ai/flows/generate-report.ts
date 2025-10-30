
'use server';
/**
 * @fileOverview A flow to generate and email sales and staff reports by fetching data from Firestore.
 *
 * - generateAndSendReport - A function that fetches data, compiles a report, and emails it.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { sendEmailReceipt } from './send-email-receipt';
import { GenerateReportInputSchema, GenerateReportOutputSchema, type GenerateReportInput, type GenerateReportOutput, type Bill, type Employee, type Expense, type PendingBill, type Attendance, type Advance, type Table, type InventoryItem, type Customer } from '@/lib/types';
import { getFirestore, getDoc, doc } from 'firebase/firestore';
import { collection, getDocs } from 'firebase/firestore';
import { app, db } from '@/lib/firebase';

// We have to create a wrapper because the frontend cannot pass complex types like `Date`
// to the backend flow. We convert them to JSON-serializable formats here.
export async function generateAndSendReport(
  input: {
    reportType: 'daily' | 'monthly' | 'yearly';
    recipientEmail?: string;
  }
): Promise<GenerateReportOutput> {
  // Fetch recipient email from settings
  const settingsDoc = await getDoc(doc(db, "settings", "venue"));
  const settingsData = settingsDoc.data();
  const recipientEmail = input.recipientEmail || settingsData?.email || settingsData?.venueEmail;

  if (!recipientEmail) {
    throw new Error("Recipient email not found. Please provide one or complete the setup wizard.");
  }

  // Fetch all necessary data from Firestore
  const billsSnapshot = await getDocs(collection(db, "bills"));
  const billHistory: Bill[] = billsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
          ...data,
          id: doc.id,
          timestamp: data.timestamp.toDate(),
      } as Bill;
  });
  
  const employeesSnapshot = await getDocs(collection(db, "employees"));
  const employees: Employee[] = employeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
  
  const expensesSnapshot = await getDocs(collection(db, "expenses"));
  const expenses: Expense[] = expensesSnapshot.docs.map(doc => {
    const data = doc.data();
    return { ...data, id: doc.id, date: data.date.toDate() } as Expense;
  });

  const pendingBillsSnapshot = await getDocs(collection(db, "pendingBills"));
  const pendingBills: PendingBill[] = pendingBillsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
          id: doc.id,
          ...data,
          transactions: (data.transactions || []).map((tx: any) => ({...tx, date: tx.date.toDate()})),
      } as PendingBill;
  });

  const attendanceSnapshot = await getDocs(collection(db, "attendance"));
  const attendance: Attendance[] = attendanceSnapshot.docs.map(doc => {
    const data = doc.data();
    return { ...data, id: doc.id, date: data.date.toDate() } as Attendance;
  });
  
  const advancesSnapshot = await getDocs(collection(db, "advances"));
  const advances: Advance[] = advancesSnapshot.docs.map(doc => {
    const data = doc.data();
    return { ...data, id: doc.id, date: data.date.toDate() } as Advance;
  });

  const tablesSnapshot = await getDocs(collection(db, "tables"));
  const tables: Table[] = tablesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Table));

  const inventorySnapshot = await getDocs(collection(db, "inventory"));
  const inventory: InventoryItem[] = inventorySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));

  // Aggregate Customer Data
  const customerMap = new Map<string, Customer>();
  billHistory.forEach(bill => {
    if (!bill.customerDetails || !bill.customerDetails.phone) return;
    const { phone, name, email, address } = bill.customerDetails;
    const existing = customerMap.get(phone);
    if (existing) {
      existing.totalSpent += bill.total;
      existing.totalVisits += 1;
      if (bill.timestamp > existing.lastSeen) {
        existing.lastSeen = bill.timestamp;
      }
    } else {
      customerMap.set(phone, {
        id: phone, phone, name, email: email || '', address: address || '',
        firstSeen: bill.timestamp, lastSeen: bill.timestamp,
        totalVisits: 1, totalSpent: bill.total,
      });
    }
  });
  pendingBills.filter(pb => pb.type === 'customer').forEach(pBill => {
    if (pBill.mobile && !customerMap.has(pBill.mobile)) {
      const firstTxDate = pBill.transactions.length > 0 ? pBill.transactions[0].date : new Date();
       customerMap.set(pBill.mobile, {
        id: pBill.mobile, phone: pBill.mobile, name: pBill.name, email: '', address: '',
        firstSeen: firstTxDate, lastSeen: firstTxDate, totalVisits: 1, totalSpent: 0,
      });
    }
  });
  const customerSummary: Customer[] = Array.from(customerMap.values());


  const serializableInput: GenerateReportInput = {
    reportType: input.reportType,
    recipientEmail,
    billHistory: billHistory.map(bill => ({
      ...bill,
      id: bill.id,
      total: bill.total,
      timestamp: bill.timestamp.toISOString(),
      orderItems: bill.orderItems.map(item => ({
        ...item,
        history: (item.history || []).map(h => ({...h, changedAt: h.changedAt.toISOString()}))
      }))
    })),
    employees,
    expenses: expenses.map(e => ({...e, date: e.date.toISOString()})),
    pendingBills: pendingBills.map(pb => ({
      ...pb,
      transactions: pb.transactions.map(tx => ({...tx, date: tx.date.toISOString()}))
    })),
    attendance: attendance.map(a => ({...a, date: a.date.toISOString()})),
    advances: advances.map(adv => ({...adv, date: adv.date.toISOString()})),
    tables,
    inventory,
    customerSummary: customerSummary.map(c => ({
        ...c,
        firstSeen: c.firstSeen.toISOString(),
        lastSeen: c.lastSeen.toISOString(),
    })),
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
  prompt: `You are an expert financial analyst for a restaurant. Your task is to generate a comprehensive business report based on the provided data. The report should be clear, concise, and ready to be emailed.

Report Type: {{{reportType}}}
Recipient: {{{recipientEmail}}}
Current Date: ${new Date().toDateString()}

Filter the provided data based on the report type.
- For a 'daily' report, only include data from today.
- For a 'monthly' report, only include data from the current month.
- For a 'yearly' report, only include data from the current year.

Your report MUST contain the following sections, in this order:

1.  **Sales Summary**:
    *   Total number of bills.
    *   Total revenue from all bills in the period.
    *   A list of all bills with their ID, total amount, and timestamp.

2.  **Table Performance Summary**:
    *   For each table, calculate the total revenue and the number of turnovers (times occupied) during the period.
    *   List tables sorted by revenue in descending order.

3.  **Customer Summary**:
    *   List all customers, sorted by their total spending in descending order.
    *   For each customer, show their name, phone number, total visits, and total amount spent.

4.  **Expense Summary**:
    *   Total expenses for the period.
    *   A breakdown of expenses by category.
    *   A list of all individual expenses with their date, description, and amount.

5.  **Pending Bills Summary**:
    *   A section for "To Collect from Customers": List each person and the total amount pending from them.
    *   A section for "To Pay to Vendors": List each person/vendor and the total amount you need to pay them.

6.  **Staff Report**:
    *   **Attendance Summary**: List employees who were absent or on half-day during the period.
    *   **Salary Advances**: List any salary advances given to employees during the period, including who received it and how much.
    *   **Full Employee List**: A list of all employees with their name, role, and salary.

7.  **Inventory & Reservations Report**:
    *   **Inventory Status**: List all items that are low in stock or out of stock based on their stock and capacity.
    *   **Reservation History**: List all table reservations made, including guest name, mobile, time, and table number.

Analyze all the provided data to generate the report.

DATA (JSON Format):
- Bill History: {{{json billHistory}}}
- Employee Data: {{{json employees}}}
- Expense History: {{{json expenses}}}
- Pending Bills: {{{json pendingBills}}}
- Attendance Records: {{{json attendance}}}
- Salary Advances: {{{json advances}}}
- Table Configuration: {{{json tables}}}
- Inventory Levels: {{{json inventory}}}
- Customer Summary: {{{json customerSummary}}}

Generate the report title and content. The content should be well-formatted for an email. Calculate the total revenue and include it in the designated field. Ensure every section is clearly titled and easy to read.
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
