import createAppHostingHandler from '@genkit-ai/next';
import '@/ai/flows/dynamic-receipt-discount-reasoning';
import '@/ai/flows/send-email-receipt';
import '@/ai/flows/generate-report';
import '@/ai/flows/scan-menu-flow';

export const { GET, POST } = createAppHostingHandler();
