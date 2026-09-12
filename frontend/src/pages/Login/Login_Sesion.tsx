import { ArrowRight } from 'lucide-react';
export default function Login__Sesion() {
    return (
        <div className="flex flex-col gap-3 py-10 px-16 border-t-4 border-t-[#0439D9]  bg-white border shadow-lg shadow-[#92aad2] rounded-md">
            <div className="flex flex-col gap-1">
                <h1 className="text-[#011140] font-bold text-2xl">Bienvenido de Vuelta</h1>
                <p className="text-gray-500 text-xs mb-6">Ingresa con tus credenciales institucionales para acceder a la plataforma</p>
            </div>
            <div className="flex flex-col gap-2">
                <label className="text-[#011140] font-medium text-[0.70rem]">CORREO ELECTRONICO</label>
                <input
                    type="email"
                    className="text-xs border border-gray-300 rounded-md py-2.5 px-2 focus:outline-none focus:ring-1 focus:ring-[#E1ECFF]" />
            </div>
            <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center font-medium text-[0.70rem]">
                    <label className="text-[#011140] ">CONTRASEÑA</label>
                    <button
                        className="text-[#0439D9] hover:text-[#5086F2] hover:underline transition-colors">
                        ¿Olvidaste tu contraseña?
                    </button>
                </div>
                <input
                    type="password"
                    className="text-xs border border-gray-300 rounded-md py-2.5 px-2 focus:outline-none focus:ring-1 focus:ring-[#E1ECFF]" />
            </div>
            <div className=" flex items-center">
                <label className="text-xs text-[#6f7884] font-medium flex items-center">
                    <input type="checkbox" className="mr-2" />
                    Recordar este dispositivo
                </label>
            </div>
            <div className="flex justify-center mt-8">
                <button
                    className="flex items-center text-sm border py-3 px-24 bg-[#0439D9] text-white font-bold rounded-xl hover:bg-[#0027a2]">
                    INGRESAR
                    <ArrowRight className="ml-3" size={16} />
                </button>
            </div>
        </div>

    )
}