import React, { useState, useEffect } from 'react';

// 1. Definimos la estructura de los datos que vamos a recibir
export interface Usuario {
  id: number;
  nombres: string;
  apellidos: string;
  dni: string;
  email: string;
  rol: string;
  activo: boolean;
}

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  usuarioSeleccionado: Usuario | null; // Recibimos el usuario a editar
}

const EditUserModal: React.FC<EditUserModalProps> = ({ isOpen, onClose, usuarioSeleccionado }) => {
  
  // 2. Estado local para manejar los campos del formulario
  const [formData, setFormData] = useState<Usuario>({
    id: 0, 
    nombres: '', 
    apellidos: '', 
    dni: '', 
    email: '', 
    rol: 'DOCENTE', 
    activo: true
  });

  // 3. Efecto para precargar los datos cuando se abre el modal
  useEffect(() => {
    if (usuarioSeleccionado && isOpen) {
      setFormData(usuarioSeleccionado);
    }
  }, [usuarioSeleccionado, isOpen]);

  // 4. Manejador para actualizar el estado cuando el usuario escribe o cambia opciones
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

// Función para enviar los datos al backend
  const handleSave = async () => {
    try {
      // Aquí conectaremos con tu services/api.ts en el siguiente paso
      console.log("🚀 Datos listos para enviar por PUT al backend:", formData);
      alert('Datos capturados. Revisa la consola (F12).');
      
      // onClose(); // Descomentaremos esto cuando la API guarde con éxito
    } catch (error) {
      console.error("Error al guardar el usuario:", error);
    }
  };

  // Si el modal está cerrado, no dibujamos nada
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
        
        {/* Encabezado */}
        <div className="flex justify-between items-center border-b p-6">
          <h2 className="text-2xl font-bold text-gray-800">Editar Usuario</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Cuerpo del Formulario */}
        <div className="p-6">
          <form className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* COLUMNA 1: Información Personal */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Información Personal</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombres <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  name="nombres" 
                  value={formData.nombres} 
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ej. Juan Carlos"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Apellidos <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  name="apellidos" 
                  value={formData.apellidos} 
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ej. Pérez Gómez"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  DNI <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  name="dni" 
                  value={formData.dni} 
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Documento de Identidad"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Correo Institucional <span className="text-red-500">*</span>
                </label>
                <input 
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="correo@institucion.edu"
                />
              </div>
            </div>

            {/* COLUMNA 2: Credenciales y Acceso */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Credenciales y Acceso</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Rol del Usuario <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input 
                      type="radio" 
                      name="rol" 
                      value="ADMIN" 
                      checked={formData.rol === 'ADMIN'} 
                      onChange={handleChange} 
                      className="w-4 h-4 text-blue-600" 
                    />
                    <span className="ml-3 font-medium text-gray-700">Administrador (ADMIN)</span>
                  </label>
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input 
                      type="radio" 
                      name="rol" 
                      value="DOCENTE" 
                      checked={formData.rol === 'DOCENTE'} 
                      onChange={handleChange} 
                      className="w-4 h-4 text-green-600" 
                    />
                    <span className="ml-3 font-medium text-gray-700">Docente (DOCENTE)</span>
                  </label>
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input 
                      type="radio" 
                      name="rol" 
                      value="CONTROL" 
                      checked={formData.rol === 'CONTROL'} 
                      onChange={handleChange} 
                      className="w-4 h-4 text-orange-500" 
                    />
                    <span className="ml-3 font-medium text-gray-700">Control de Estudios (CONTROL)</span>
                  </label>
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Estado de la Cuenta <span className="text-red-500">*</span>
                </label>
                <label className="inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="activo" 
                    checked={formData.activo} 
                    onChange={handleChange} 
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  <span className="ml-3 text-sm font-medium text-gray-700">
                    {formData.activo ? 'Cuenta Activa' : 'Cuenta Inactiva'}
                  </span>
                </label>
              </div>
            </div>

          </form>
        </div>

        {/* Footer con Botones */}
        <div className="border-t p-6 flex justify-end gap-4 bg-gray-50 rounded-b-xl">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors"
          >
            Cancelar
          </button>
          <button 
            type="button" 
            onClick={handleSave}
            className="px-6 py-2.5 bg-blue-600 rounded-lg text-white hover:bg-blue-700 font-medium transition-colors shadow-sm"
          >
            Guardar Cambios
          </button>
        </div>

      </div>
    </div>
  );
};

export default EditUserModal;