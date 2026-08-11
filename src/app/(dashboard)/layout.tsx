import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1">
      <Sidebar />
      <main className="min-w-0 flex-1 px-4 pb-16 pt-20 sm:px-6 lg:px-8 lg:pt-8">
        <div className="mx-auto max-w-275">{children}</div>
      </main>
    </div>
  );
}
