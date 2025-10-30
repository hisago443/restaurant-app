
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'site.webmanifest');
    const fileContents = await fs.readFile(filePath, 'utf8');
    const manifest = JSON.parse(fileContents);
    
    return NextResponse.json(manifest, {
      headers: {
        'Content-Type': 'application/manifest+json',
      },
    });
  } catch (error) {
    return new NextResponse(
      JSON.stringify({ message: 'Manifest not found.' }),
      { status: 404 }
    );
  }
}
