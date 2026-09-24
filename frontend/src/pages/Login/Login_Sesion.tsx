import { ArrowRight, CircleAlert, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { validateEmailFormat, buildLoginEmail } from '../../utils/validators';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import LoginEmailField from '../../components/auth/LoginEmailField';

interface LoginSesionProps {
    isMobile?: boolean;
}

export default function Login__Sesion({ isMobile = false }: LoginSesionProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [generalError, setGeneralError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const navigate = useNavigate();
    const { login } = useAuth();

    const validatePassword = (value: string): string => {
        if (!value.trim()) return 'La contraseña es obligatoria';
        if (value.length < 6) return 'Mínimo 6 caracteres';
        return '';
    };

    const handleEmailBlur = () => {
        if (email.trim()) {
            setEmailError(validateEmailFormat(buildLoginEmail(email)));
        }
    };

    const handlePasswordBlur = () => {
        if (password.trim()) {
            setPasswordError(validatePassword(password));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setGeneralError('');
        setEmailError('');
        setPasswordError('');

        if (!email.trim() && !password.trim()) {
            setGeneralError('Por favor, completa todos los campos para continuar');
            return;
        }

        const emailErr = validateEmailFormat(buildLoginEmail(email));
        const passwordErr = validatePassword(password);
        setEmailError(emailErr);
        setPasswordError(passwordErr);

        if (emailErr || passwordErr) return;

        setLoading(true);
        try {
            const data = await loginUser({ email: buildLoginEmail(email), password });
            login(data.token, data.nombre, data.roles);
            navigate('/dashboard', { replace: true });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Error inesperado. Intenta más tarde.';
            setGeneralError(message);
        } finally {
            setLoading(false);
        }
    };

    const formClass = isMobile
        ? 'w-full bg-white'
        : 'h-full w-full rounded-md border border-t-4 border-t-[#0439D9] bg-white px-8 py-10 shadow-lg shadow-[#92aad2] xl:px-12 xl:py-12';

    return (
        <form onSubmit={handleSubmit} noValidate className={formClass}>
            <div className={`mb-2 flex flex-col gap-1 ${isMobile ? 'text-center' : 'text-left'}`}>
                <h1 className="mt-1 text-2xl font-extrabold text-[#092068]">INICIAR SESIÓN</h1>
                <p className={`text-sm text-gray-500 ${isMobile ? 'mb-8' : 'mb-10'}`}>
                    Ingresa con tus credenciales para acceder a la plataforma.
                </p>
            </div>

            <div className="flex flex-col gap-4">
                <LoginEmailField
                    value={email}
                    error={emailError}
                    onChange={(value) => {
                        setEmail(value);
                        if (emailError) setEmailError('');
                        if (generalError) setGeneralError('');
                    }}
                    onBlur={handleEmailBlur}
                />

                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-[0.70rem] font-medium">
                        <label className="text-[#011140]">CONTRASEÑA</label>
                        <Link
                            to="/forgot-password"
                            className="text-[#0439D9] transition-colors hover:text-[#5086F2] hover:underline"
                        >
                            ¿Olvidaste tu contraseña?
                        </Link>
                    </div>
                    <div className="relative">
                        <LockKeyhole
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]"
                            size={17}
                            aria-hidden="true"
                        />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                if (passwordError) setPasswordError('');
                                if (generalError) setGeneralError('');
                            }}
                            onBlur={handlePasswordBlur}
                            placeholder="••••••••"
                            className={`w-full rounded-xl border py-3 pl-11 pr-11 text-sm transition-colors focus:outline-none focus:ring-1 ${
                                passwordError
                                    ? 'border-[#FECACA] bg-[#FEF2F2] focus:ring-[#FECACA]'
                                    : 'border-[#D8E3F5] focus:ring-[#E1ECFF]'
                            }`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((visible) => !visible)}
                            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748B]"
                        >
                            {showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
                        </button>
                    </div>
                    {passwordError && (
                        <p className="flex items-center gap-1 text-[0.70rem] text-[#B91C1C]">
                            <CircleAlert size={12} /> {passwordError}
                        </p>
                    )}
                </div>

                {generalError && (
                    <div className="mr-2 flex items-start rounded-xl border border-[#EF4444] bg-[#FFF1F2] p-3">
                        <CircleAlert className="mr-2 text-[#B91C1C]" size={20} />
                        <div className="flex flex-col gap-0">
                            <p className="text-xs font-bold text-[#7F1D1D]">
                                {generalError.includes('conectar')
                                    ? 'Sin conexión al servidor'
                                    : 'Credenciales no válidas'}
                            </p>
                            <p className="text-xs text-[#B91C1C]">{generalError}</p>
                        </div>
                    </div>
                )}

                <div className="mt-9 flex justify-center">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex w-full max-w-md items-center justify-center rounded-xl border bg-[#0439D9] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#0027a2] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading ? 'INGRESANDO...' : 'INGRESAR'}
                        {!loading && <ArrowRight className="ml-3" size={16} />}
                    </button>
                </div>
            </div>
        </form>
    );
}
