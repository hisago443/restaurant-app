
'use server';
/**
 * @fileOverview An AI flow to extract menu items from an image.
 *
 * - extractMenuFromImage - A function that takes an image of a menu and returns a structured JSON object.
 * - ExtractMenuInput - The input type for the extractMenuFromImage function.
 * - ExtractMenuOutput - The return type for the extractMenuFromImage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { MenuCategorySchema } from '@/lib/types';

const ExtractMenuInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "An image of a restaurant menu, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractMenuInput = z.infer<typeof ExtractMenuInputSchema>;

const ExtractMenuOutputSchema = z.object({
  menu: z.array(MenuCategorySchema).describe("The extracted menu, structured into categories and items."),
});
export type ExtractMenuOutput = z.infer<typeof ExtractMenuOutputSchema>;

export async function extractMenuFromImage(input: ExtractMenuInput): Promise<ExtractMenuOutput> {
  return extractMenuFromImageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractMenuFromImagePrompt',
  input: { schema: ExtractMenuInputSchema },
  output: { schema: ExtractMenuOutputSchema },
  prompt: `You are an expert menu digitizer. Analyze the provided menu image and extract all categories, items, and prices.
  
- Identify main sections of the menu as 'categories'.
- Extract each menu 'item' with its 'name' and 'price'. The price must be a number.
- Assign a 'code' for each item, starting from "1" and incrementing for each item across the entire menu.
- Your final output must be a valid JSON object that strictly follows the provided output schema. Do not create sub-categories.

Image of the menu to process:
{{media url=imageDataUri}}`,
});

const extractMenuFromImageFlow = ai.defineFlow(
  {
    name: 'extractMenuFromImageFlow',
    inputSchema: ExtractMenuInputSchema,
    outputSchema: ExtractMenuOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("The AI failed to generate a valid menu structure.");
    }
    // Ensure every item has an empty recipe and history array
    const menuWithDefaults = output.menu.map(category => ({
        ...category,
        items: category.items.map(item => ({
            ...item,
            recipe: item.recipe || [],
            history: item.history || [],
        }))
    }));

    return { menu: menuWithDefaults };
  }
);
