import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const AdminLayout = () => {
  const { user } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/admin", icon: "📊" },
    { name: "Users", href: "/admin/users", icon: "👥" },
    { name: "Videos", href: "/admin/videos", icon: "🎬" },
    { name: "Comments", href: "/admin/comments", icon: "💬" },
    { name: "Reports", href: "/admin/reports", icon: "🚩" },
    { name: "Jobs", href: "/admin/processing-jobs", icon: "⚙️" },
    { name: "Analytics", href: "/admin/analytics", icon: "📈" }
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-800 shadow-lg hidden md:block">
        <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-700">
          <Link to="/" className="text-xl font-bold text-primary-600 dark:text-primary-500">
            StreamHub Admin
          </Link>
        </div>
        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || (item.href !== "/admin" && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-md ${
                  isActive
                    ? "bg-primary-50 text-primary-700 dark:bg-gray-700 dark:text-primary-400"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                }`}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white dark:bg-gray-800 shadow-sm flex items-center justify-between px-4 sm:px-6 lg:px-8 border-b border-gray-200 dark:border-gray-700">
          <div className="md:hidden">
            <Link to="/" className="text-xl font-bold text-primary-600 dark:text-primary-500">
              StreamHub Admin
            </Link>
          </div>
          <div className="flex items-center ml-auto">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {user?.username} (Admin)
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
