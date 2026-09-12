import AuthLayout from '../../components/layout/AuthLayout';
import Login_Information from './Login_Information';
import Login_Sesion from './Login_Sesion';

export default function LoginPage() {
  return (
    <AuthLayout>
      <div className="h-full grid grid-cols-[1.5fr_1.5fr] w-full">
        
        <div className="flex items-center justify-end">
          <Login_Sesion />
        </div>

        <div className="h-full w-full py-5 px-12">
          <Login_Information />
        </div>

      </div>
    </AuthLayout>
  );
}