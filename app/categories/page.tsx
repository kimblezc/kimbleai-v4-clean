import CategoryDashboard from '@/components/CategoryDashboard';

export default function CategoriesPage() {
  // TODO: Get userId from auth context
  const userId = 'zach-admin-001'; // Temporary hardcoded

  return (
    <div className="min-h-screen bg-gray-50">
      <CategoryDashboard userId={userId} />
    </div>
  );
}
