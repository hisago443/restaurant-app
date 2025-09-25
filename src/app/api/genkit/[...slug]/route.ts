import createAppHostingHandler from '@genkit-ai/next';
import '@/ai/flows/dynamic-receipt-discount-reasoning';
import '@/ai/flows/send-email-receipt';
import '@/ai/flows/generate-report';
import '@/ai/flows/extract-menu-from-image';

export const { GET, POST } = createAppHostingHandler();
