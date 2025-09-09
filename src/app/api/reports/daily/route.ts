
import { generateAndSendReport } from '@/ai/flows/generate-report';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const result = await generateAndSendReport({
      reportType: 'daily',
      recipientEmail: 'upandabove.bir@gmail.com',
    });

    if (result.success) {
      return NextResponse.json({ message: 'Daily report sent successfully.' });
    } else {
      throw new Error(result.message);
    }
  } catch (error: any) {
    console.error('Failed to send daily report:', error);
    return new NextResponse(
      JSON.stringify({ message: error.message || 'Failed to send daily report.' }),
      { status: 500 }
    );
  }
}
