
import MainLayout from '@/components/main-layout';
import { loadMenu } from '@/lib/menu-loader';

export default async function Home() {
  const menuData = await loadMenu();
  return <MainLayout initialMenu={menuData} />;
}
