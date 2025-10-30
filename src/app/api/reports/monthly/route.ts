
import { generateAndSendReport } from '@/ai/flows/generate-report';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const result = await generateAndSendReport({
      reportType: 'monthly',
      recipientEmail: 'panshulsharma93@gmail.com',
    });

    if (result.success) {
      return NextResponse.json({ message: 'Monthly report sent successfully.' });
    } else {
      throw new Error(result.message);
    }
  } catch (error: any) {
    console.error('Failed to send monthly report:', error);
    return new NextResponse(
      JSON.stringify({ message: error.message || 'Failed to send monthly report.' }),
      { status: 500 }
    );
  }
}
