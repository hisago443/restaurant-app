import { createApiHandler } from '@genkit-ai/next/api';
import '@/ai/flows/dynamic-receipt-discount-reasoning';
import '@/ai/flows/send-email-receipt';
import '@/ai/flows/generate-report';

export const { GET, POST } = createApiHandler();
