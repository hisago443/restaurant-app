'use server';
/**
 * @fileOverview An AI flow to scan a menu from an image and extract structured data.
 *
 * - scanMenu - A function that takes an image data URI and returns a structured menu.
 * - ScanMenuInput - The input type for the scanMenu function.
 * - ScanMenuOutput - The return type for the scanMenu function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { MenuCategorySchema } from '@/lib/types';

const ScanMenuInputSchema = z.object({
  photoDataUri: z.string().describe(
    "A photo of a restaurant menu, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
});
export type ScanMenuInput = z.infer<typeof ScanMenuInputSchema>;

const ScanMenuOutputSchema = z.object({
  menu: z.array(MenuCategorySchema).describe('An array of menu categories, each containing a list of items.'),
});
export type ScanMenuOutput = z.infer<typeof ScanMenuOutputSchema>;

export async function scanMenu(input: ScanMenuInput): Promise<ScanMenuOutput> {
  return scanMenuFlow(input);
}

const prompt = ai.definePrompt({
  name: 'scanMenuPrompt',
  input: { schema: ScanMenuInputSchema },
  output: { schema: ScanMenuOutputSchema },
  prompt: `You are an expert menu digitizer. Analyze the provided image of a restaurant menu. Extract all categories, items, and their corresponding prices.

**Instructions:**
1.  Identify distinct sections or categories on the menu (e.g., "Appetizers", "Pizzas", "Main Courses", "Beverages").
2.  For each category, list all the items you can find.
3.  For each item, extract its name and price.
4.  If an item has multiple sizes or options with different prices, create a separate item for each (e.g., "Margherita Pizza (Medium)" and "Margherita Pizza (Large)").
5.  Ignore any descriptions, symbols, or extra text that is not the item name or price.
6.  The output must be a structured JSON object. Ensure all prices are numbers, not strings.

**Here is the menu image to analyze:**
{{media url=photoDataUri}}
`,
});

const scanMenuFlow = ai.defineFlow(
  {
    name: 'scanMenuFlow',
    inputSchema: ScanMenuInputSchema,
    outputSchema: ScanMenuOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('The AI failed to generate a response for the menu.');
    }
    return output;
  }
);
