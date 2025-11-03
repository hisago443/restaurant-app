
import fs from 'fs/promises';
import path from 'path';

// This script runs during the build process on Vercel
async function generateManifest() {
  const isVercel = process.env.VERCEL === '1';
  // VERCEL_URL includes the domain, no need to add https:// again.
  const baseUrl = isVercel
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  const templatePath = path.join(process.cwd(), 'src', 'data', 'manifest.template.json');
  const templateContents = await fs.readFile(templatePath, 'utf8');
  const manifestTemplate = JSON.parse(templateContents);

  // Correctly add the base URL to icon paths
  manifestTemplate.icons.forEach((icon) => {
    // Check if the src is a relative path before prepending baseUrl
    if (icon.src && icon.src.startsWith('/')) {
      icon.src = `${baseUrl}${icon.src}`;
    }
  });

  const outputPath = path.join(process.cwd(), 'public', 'site.webmanifest');
  await fs.writeFile(outputPath, JSON.stringify(manifestTemplate, null, 4));
  console.log(`Generated manifest with absolute URLs at ${outputPath}`);
}

generateManifest();
