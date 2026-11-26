import AppRouter from './routes/AppRouter';
import MesaAyudaGlobal from './components/ayuda/MesaAyudaGlobal';
import ControlOfflineSync from './components/control/ControlOfflineSync';

export default function App() {
  return (
    <>
      <AppRouter />
      <MesaAyudaGlobal />
      <ControlOfflineSync />
    </>
  );
}
