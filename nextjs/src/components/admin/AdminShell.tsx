import AdminSidebar from './AdminSidebar';

/** Sidebar + content column. Wrap every admin page except /admin/login. */
export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-cream">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
