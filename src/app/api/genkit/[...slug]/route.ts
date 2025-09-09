import { createApiHandler } from '@genkit-ai/next';
import '@/ai/flows/dynamic-receipt-discount-reasoning';
import '@/ai/flows/send-email-receipt';

export const { GET, POST } = createApiHandler();
