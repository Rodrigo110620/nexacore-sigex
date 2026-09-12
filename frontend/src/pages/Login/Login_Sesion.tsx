import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircleAlert } from 'lucide-react';

export default function Login__Sesion() {

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [generalError, setGeneralError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const validateEmail = (value: string): string => {
        if (!value.trim()) return 'El correo es obligatorio';
        if (!emailRegex.test(value)) return 'Formato de correo inválido';
        return '';
    };

    const validatePassword = (value: string): string => {
        if (!value.trim()) return 'La contraseña es obligatoria';
        if (value.length < 6) return 'Mínimo 6 caracteres';
        return '';
    };

    const handleEmailBlur = () => {
        if (email.trim()) {
            setEmailError(validateEmail(email));
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

        const emailErr = validateEmail(email);
        const passwordErr = validatePassword(password);
        setEmailError(emailErr);
        setPasswordError(passwordErr);

        if (emailErr || passwordErr) return;

        //BACKEND
        setLoading(true);
        try {
            console.log('Enviando:', { email, password });
            
            await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (err) {
            setGeneralError('Credenciales no válidas. Verifica tu correo o contraseña.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-3 py-10 px-16 border-t-4 border-t-[#0439D9] bg-white border shadow-lg shadow-[#92aad2] rounded-md">
            <div className="flex flex-col gap-1">
                <h1 className="text-[#011140] font-bold text-2xl">Bienvenido de Vuelta</h1>
                <p className="text-gray-500 text-xs mb-6">
                    Ingresa con tus credenciales institucionales para acceder a la plataforma
                </p>
            </div>

            <div className="flex flex-col gap-2">
                <label className="text-[#011140] font-medium text-[0.70rem]">CORREO ELECTRONICO</label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) setEmailError('');
                        if (generalError) setGeneralError('');
                    }}
                    onBlur={handleEmailBlur}
                    placeholder="usuario.umss.edu.bo"
                    className={`text-xs border rounded-md py-2.5 px-2 focus:outline-none focus:ring-1 transition-colors ${
                        emailError
                            ? 'border-[#FECACA] bg-[#FEF2F2] focus:ring-[#FECACA]'
                            : 'border-gray-300 focus:ring-[#E1ECFF]'
                    }`} />
                {emailError && (
                    <p className="text-[#B91C1C] text-[0.70rem] flex items-center gap-1">
                        <CircleAlert size={12} /> {emailError}
                    </p>
                )}
            </div>

            <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center font-medium text-[0.70rem]">
                    <label className="text-[#011140]">CONTRASEÑA</label>
                    <button
                        type="button"
                        className="text-[#0439D9] hover:text-[#5086F2] hover:underline transition-colors">
                        ¿Olvidaste tu contraseña?
                    </button>
                </div>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                        setPassword(e.target.value);
                        if (passwordError) setPasswordError('');
                        if (generalError) setGeneralError('');
                    }}
                    onBlur={handlePasswordBlur}
                    placeholder="••••••••"
                    className={`text-xs border rounded-md py-2.5 px-2 focus:outline-none focus:ring-1 transition-colors ${
                        passwordError
                            ? 'border-[#FECACA] bg-[#FEF2F2] focus:ring-[#FECACA]'
                            : 'border-gray-300 focus:ring-[#E1ECFF]'
                    }`} />
                {passwordError && (
                    <p className="text-[#B91C1C] text-[0.70rem] flex items-center gap-1">
                        <CircleAlert size={12} /> {passwordError}
                    </p>
                )}
            </div>

            <div className="flex items-center">
                <label className="text-xs text-[#6f7884] font-medium flex items-center">
                    <input type="checkbox" className="mr-2" />
                    Recordar este dispositivo
                </label>
            </div>

            {generalError && (
                <div className="flex items-center mr-2 border border-[#FECACA] bg-[#FEF2F2] p-2 rounded-md">
                    <CircleAlert className="text-[#B91C1C] mr-2" size={20} />
                    <div className="flex flex-col gap-0">
                        <p className="text-[#7F1D1D] text-xs font-bold">Credenciales no válidas</p>
                        <p className="text-[#B91C1C] text-xs">{generalError}</p>
                    </div>
                </div>
            )}

            <div className="flex justify-center mt-8">
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex items-center text-sm border py-3 px-24 bg-[#0439D9] text-white font-bold rounded-xl hover:bg-[#0027a2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    {loading ? 'INGRESANDO...' : 'INGRESAR'}
                    {!loading && <ArrowRight className="ml-3" size={16} />}
                </button>
            </div>
        </div>
    )
}