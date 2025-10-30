
import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const filePath = path.join(process.cwd(), 'public', 'site.webmanifest');
    const fileContents = await fs.readFile(filePath, 'utf8');
    const manifest = JSON.parse(fileContents);
    
    res.setHeader('Content-Type', 'application/manifest+json');
    res.status(200).json(manifest);
  } catch (error) {
    res.status(404).json({ message: 'Manifest not found.' });
  }
}
