
import fs from 'fs/promises';
import path from 'path';
import type { MenuCategory } from './types';

// This function runs on the server to safely read the menu.json file.
export async function loadMenu(): Promise<MenuCategory[]> {
  const filePath = path.join(process.cwd(), 'src', 'data', 'menu.json');
  const fileContents = await fs.readFile(filePath, 'utf8');
  const menuData = JSON.parse(fileContents);
  
  // Flatten the structure from subCategories to a direct items array
  const structuredMenu = (menuData as any[]).map(category => {
      const items = (category.items || []).concat(
        (category.subCategories || []).flatMap((sub: any) => sub.items || [])
      );
      
      return {
        category: category.category,
        items: items.map((item: any) => ({
          ...item,
          history: item.history || [],
          ingredients: item.ingredients || [],
        })),
      };
    });

  return structuredMenu;
}
