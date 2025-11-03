import LoginForm from '@/components/LoginForm';
import Logo from '@/components/Logo';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-md w-full mx-auto p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <div className="flex justify-center mb-4">
          <Logo size="lg" className="text-gray-900 dark:text-gray-100" />
        </div>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
          Shared Clipboard Platform
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
