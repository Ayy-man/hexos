import { requireRole } from '@/lib/auth/guards';

export default async function FinancesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(['admin', 'internal']);

  return <>{children}</>;
}
