
import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Read the template manifest file.
    const templatePath = path.join(process.cwd(), 'src', 'data', 'manifest.template.json');
    const fileContents = await fs.readFile(templatePath, 'utf8');
    const manifest = JSON.parse(fileContents);

    // Get the base URL from Vercel's environment variable or fallback to localhost for local dev.
    const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL 
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` 
      : 'http://localhost:3000';

    // Prepend the base URL to each icon's src path to make them absolute URLs.
    if (manifest.icons && Array.isArray(manifest.icons)) {
      manifest.icons.forEach((icon: { src: string }) => {
        if (icon.src && icon.src.startsWith('/')) {
          icon.src = `${baseUrl}${icon.src}`;
        }
      });
    }
    
    res.setHeader('Content-Type', 'application/manifest+json');
    res.status(200).json(manifest);
  } catch (error) {
    console.error('Error generating manifest:', error);
    res.status(500).json({ message: 'Error generating manifest file.' });
  }
}
