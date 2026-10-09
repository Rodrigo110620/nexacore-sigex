import { Check, Mail } from 'lucide-react';

interface Props {
  email: string;
  onClose: () => void;
}

export default function RegisterUserSuccess({ email, onClose }: Props) {
  return (
    <div className="absolute inset-0 z-[60] flex items-end justify-center bg-black/40 pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:items-center sm:p-4">
      <div className="w-full max-w-md overflow-hidden rounded-t-2xl border border-[#BFDBFE] bg-[#f0f5ff] shadow-2xl sm:rounded-2xl">
        <div className="flex flex-col items-center px-5 pb-4 pt-8 sm:px-6">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 sm:h-16 sm:w-16">
            <Check className="text-green-600" size={34} />
          </div>
          <h3 className="mb-1 text-center text-xs font-bold text-[#011140] sm:text-sm">
            Usuario registrado correctamente
          </h3>
          <p className="text-center text-xs text-gray-600">
            La cuenta fue creada. Las credenciales se enviaron por correo.
          </p>
        </div>

        <div className="px-5 pb-4 sm:px-6">
          <div className="rounded-lg border border-[#BFDBFE] bg-white p-4">
            <div className="mb-2 flex items-center justify-center gap-2 text-[#0439D9]">
              <Mail size={18} aria-hidden="true" />
              <p className="text-center text-xs font-medium text-[#011140]">
                Contraseña enviada a:
              </p>
            </div>
            <p className="break-all text-center text-xs font-semibold text-[#011140]">
              {email}
            </p>
            <p className="mt-2 text-center text-xs text-gray-500">
              Revisa Mailtrap (o el buzón institucional) para entregar la clave al usuario.
            </p>
          </div>
        </div>

        <div className="px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-[#0439D9] px-6 py-3 text-xs font-bold text-white transition-colors hover:bg-[#0027a2]"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}