import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-navy-900">
      <div className="text-center space-y-4">
        <p className="text-6xl font-bold text-gray-200 dark:text-navy-600">404</p>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Page Not Found</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-600"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
