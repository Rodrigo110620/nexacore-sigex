export type ExamSession = {
  id: string
  materia: string
  aula: string
  hora: string
  inscritos: number
  estado: 'En curso' | 'Por iniciar' | 'Cerrado'
}

export type AttendanceRow = {
  codigo: string
  estudiante: string
  materia: string
  hora: string
  resultado: 'Admitido' | 'Tarde' | 'Incidencia'
}

export const upcomingExams: ExamSession[] = [
  { id: 'EX-104', materia: 'Cálculo II', aula: 'A-201', hora: '08:00', inscritos: 186, estado: 'En curso' },
  { id: 'EX-105', materia: 'Programación I', aula: 'Lab-3', hora: '10:30', inscritos: 142, estado: 'Por iniciar' },
  { id: 'EX-106', materia: 'Física General', aula: 'B-110', hora: '14:00', inscritos: 210, estado: 'Por iniciar' },
  { id: 'EX-107', materia: 'Álgebra Lineal', aula: 'C-04', hora: '16:15', inscritos: 98, estado: 'Por iniciar' },
]

export const attendanceFeed: AttendanceRow[] = [
  { codigo: '2024-18421', estudiante: 'Ana Gutiérrez', materia: 'Cálculo II', hora: '07:52', resultado: 'Admitido' },
  { codigo: '2024-17602', estudiante: 'Luis Romero', materia: 'Cálculo II', hora: '07:58', resultado: 'Admitido' },
  { codigo: '2023-15490', estudiante: 'María Quispe', materia: 'Cálculo II', hora: '08:07', resultado: 'Tarde' },
  { codigo: '2024-19110', estudiante: 'Diego Vargas', materia: 'Cálculo II', hora: '08:11', resultado: 'Incidencia' },
  { codigo: '2024-16333', estudiante: 'Camila Soto', materia: 'Cálculo II', hora: '08:13', resultado: 'Admitido' },
]
