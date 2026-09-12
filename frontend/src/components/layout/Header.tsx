import { MessageCircleQuestionMark } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-100 shadow-sm shadow-[#92aad2] px-6 py-1.5 flex items-center justify-between">
      <div className="flex flex-col items-start">
        <img src="/logo_app.png" alt="NexaCore" className="h-8" />
         <p className="text-[0.65rem] text-gray-600 px-2 font-semibold">SISTEMA DE CONTROL & INGRESO A EXÁMENES</p>
      </div>

      <button className="flex items-center gap-2 px-4 py-1.5 border bg-gray-100 shadow-sm rounded-lg text-sm font-semibold  text-[#011140] hover:bg-[#e9f1ff] ">
        <MessageCircleQuestionMark className = "text-[#0A2B99] h-6 w-6" />
        Mesa de Ayuda
      </button>
    </header>
  );
}