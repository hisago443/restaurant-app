
import type { MenuCategory } from './types';

export async function saveMenu(menuData: MenuCategory[]) {
  try {
    const response = await fetch('/api/save-menu', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(menuData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to save menu.');
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving menu:', error);
    throw error;
  }
}
