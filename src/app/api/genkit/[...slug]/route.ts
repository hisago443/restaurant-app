import createAppHostingHandler from '@genkit-ai/next';
import '@/ai/flows/dynamic-receipt-discount-reasoning';
import '@/ai/flows/send-email-receipt';
import '@/ai/flows/generate-report';

export const { GET, POST } = createAppHostingHandler();
