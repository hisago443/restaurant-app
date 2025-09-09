
'use server';

/**
 * @fileOverview A flow to dynamically generate a receipt preview based on applied discounts.
 *
 * - generateReceipt - A function that generates the receipt preview with dynamic discount information.
 * - GenerateReceiptInput - The input type for the generateReceipt function, including order details and discount.
 * - GenerateReceiptOutput - The return type for the generateReceipt function, containing the receipt preview.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateReceiptInputSchema = z.object({
  items: z.array(
    z.object({
      name: z.string().describe('Name of the item.'),
      quantity: z.number().describe('Quantity of the item.'),
      price: z.number().describe('Price of the item.'),
    })
  ).describe('List of items in the order.'),
  discount: z.number().describe('Discount percentage (0-20).'),
  subtotal: z.number().describe('The subtotal of the items before the discount.'),
  total: z.number().describe('The total cost of the order after applying the discount.'),
});

export type GenerateReceiptInput = z.infer<typeof GenerateReceiptInputSchema>;

const GenerateReceiptOutputSchema = z.object({
  receiptPreview: z.string().describe('Dynamically formatted receipt preview.'),
});

export type GenerateReceiptOutput = z.infer<typeof GenerateReceiptOutputSchema>;

export async function generateReceipt(input: GenerateReceiptInput): Promise<GenerateReceiptOutput> {
  return generateReceiptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateReceiptPrompt',
  input: {schema: GenerateReceiptInputSchema},
  output: {schema: GenerateReceiptOutputSchema},
  prompt: `You are a point-of-sale (POS) assistant for a cafe. Generate a receipt preview that is well-formatted, easy to read, and professional.

The receipt should have the following structure:
1.  A header.
2.  A numbered list of items with quantity, name, and total price for that line item.
3.  A summary section with Subtotal, Discount (if applicable), and Total.
4.  A footer.

Use proper spacing and alignment to make it look like a real receipt.
- The item lines should be numbered.
- The prices should be aligned to the right.
- The summary section should be clearly separated.
- If the discount is 0, do not show the "Discount" line.

Here are the order details:
- Items: {{json items}}
- Subtotal: {{subtotal}}
- Discount: {{discount}}%
- Total: {{total}}

Example of a good format:
*************************
    Up & Above Cafe
*************************

Order Details:
1. 2 x Latte             ₹178.00
2. 1 x Croissant          ₹90.00

-------------------------
Subtotal:              ₹268.00
Discount (10%):        -₹26.80
-------------------------
Total:                 ₹241.20

   Thank you for dining!
*************************
`,
});

const generateReceiptFlow = ai.defineFlow(
  {
    name: 'generateReceiptFlow',
    inputSchema: GenerateReceiptInputSchema,
    outputSchema: GenerateReceiptOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
