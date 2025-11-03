
import fs from 'fs/promises';
import path from 'path';

async function generateManifest() {
  const templatePath = path.join(process.cwd(), 'src', 'data', 'manifest.template.json');
  const outputPath = path.join(process.cwd(), 'public', 'site.webmanifest');

  // Vercel provides this environment variable. Fallback for local development.
  const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000';

  console.log(`Using base URL for manifest: ${baseUrl}`);

  try {
    const templateContents = await fs.readFile(templatePath, 'utf8');
    const manifestTemplate = JSON.parse(templateContents);

    // Update icon paths to be absolute
    if (manifestTemplate.icons && Array.isArray(manifestTemplate.icons)) {
      manifestTemplate.icons.forEach(icon => {
        if (icon.src && icon.src.startsWith('/')) {
          icon.src = `${baseUrl}${icon.src}`;
        }
      });
    }

    const finalManifest = JSON.stringify(manifestTemplate, null, 2);
    await fs.writeFile(outputPath, finalManifest);

    console.log(`Successfully generated site.webmanifest at ${outputPath}`);
  } catch (error) {
    console.error('Failed to generate manifest file:', error);
    process.exit(1);
  }
}

generateManifest();
