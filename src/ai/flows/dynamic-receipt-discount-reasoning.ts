
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
  venueName: z.string().describe('The name of the restaurant/cafe.'),
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
  prompt: `You are a point-of-sale (POS) assistant for a cafe. Your task is to generate a receipt preview. The receipt must be well-formatted, easy to read, and professional.

The receipt should have the following structure:
1. A header, which is the name of the venue: {{{venueName}}}.
2. A section for "Order Details" with a numbered list of items. Each line should show: quantity, item name, and the total price for that line item (quantity * price).
3. A summary section showing the "Subtotal", "Discount" (only if applicable), and the final "Total".
4. A footer (e.g., a thank you message).

**Formatting Rules:**
- Use a monospaced font style for alignment.
- Ensure all prices are right-aligned for a clean look.
- The summary section should be clearly separated with lines.
- **CRITICAL**: If the discount percentage is 0, you MUST NOT show the "Discount" line in the summary.

**Order Data:**
- **Venue Name**: {{{venueName}}}
- **Items**: I will provide an array of item objects. For each item, you must calculate the line total (item.price * item.quantity).
- **Discount Percentage**: {{discount}}%
- **Subtotal**: ₹{{subtotal}}
- **Total**: ₹{{total}}

**Here are the items for the current order:**
{{#each items}}
- {{quantity}} x {{name}} (at ₹{{price}} each)
{{/each}}


**Example of a correctly formatted receipt with a discount (using "Up & Above Cafe" as venue name):**
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

**Example of a correctly formatted receipt without a discount (using "Up & Above Cafe" as venue name):**
*************************
    Up & Above Cafe
*************************

Order Details:
1. 1 x Espresso           ₹95.00
2. 1 x Muffin             ₹80.00

-------------------------
Subtotal:              ₹175.00
-------------------------
Total:                 ₹175.00

   Thank you for dining!
*************************

Now, please generate the receipt for the provided order data, using {{{venueName}}} as the header.
`,
});

const generateReceiptFlow = ai.defineFlow(
  {
    name: 'generateReceiptFlow',
    inputSchema: GenerateReceiptInputSchema,
    outputSchema: GenerateReceiptOutputSchema,
  },
  async input => {
    try {
      const {output} = await prompt(input);
      if (!output) {
        // This case handles if the AI returns a null/undefined response.
        return { receiptPreview: '' };
      }
      return output;
    } catch (error) {
      console.error("AI receipt generation failed, falling back to local format. Error:", error);
      // Return an empty preview so the client-side knows to use its local fallback.
      return { receiptPreview: '' };
    }
  }
);
