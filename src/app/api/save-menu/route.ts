
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const menuData = await request.json();
    
    // Path to your menu.json file in the src directory
    const filePath = path.join(process.cwd(), 'src', 'data', 'menu.json');

    // Pretty-print the JSON with an indentation of 2 spaces
    const jsonString = JSON.stringify(menuData, null, 2);
    
    await fs.writeFile(filePath, jsonString, 'utf-8');

    return NextResponse.json({ success: true, message: 'Menu updated successfully.' });
  } catch (error) {
    console.error('Failed to save menu:', error);
    return new NextResponse(
        JSON.stringify({ success: false, message: 'Failed to update menu.' }),
        { status: 500 }
    );
  }
}
