# 🎓 Sistema de Control de Ingreso a Exámenes Masivos (NexaCore)

Bienvenido al repositorio del proyecto. Este documento contiene todas las instrucciones necesarias para que cualquier desarrollador del equipo pueda levantar el entorno de trabajo local rápidamente, sin importar su sistema operativo (Windows, macOS o Linux).

## 📋 Requisitos Previos (Instalar en tu PC)
Asegúrate de tener instalado lo siguiente en tu sistema antes de empezar:
- [Git](https://git-scm.com/)
- [Java 17 (JDK)](https://adoptium.net/es/)
- [Node.js (v20.19.0 estrictamente)](https://nodejs.org/es/)
- [pnpm](https://pnpm.io/es/) (Lo instalas ejecutando `npm install -g pnpm` en tu terminal)
- [Docker Desktop](https://www.docker.com/) (Para levantar la base de datos localmente de forma automática)

---

## 🚀 Pasos para inicializar el proyecto

### 1. Clonar el repositorio
Abre tu terminal (Símbolo del sistema, PowerShell o Bash) y descarga el código ubicándote en la rama de desarrollo (`develop`):

```bash
git clone <URL_DE_TU_REPOSITORIO>
cd nexacore-sigex
git checkout develop
```

### 2. Configurar las Variables de Entorno (¡Muy importante!)
El proyecto necesita credenciales para conectarse a la base de datos, las cuales **nunca** se suben a Git por seguridad. Debes crear tu propio archivo `.env` local a partir de la plantilla.

**En Windows (CMD o PowerShell):**
```cmd
copy .env.example .env
```
**En Mac o Linux (Terminal):**
```bash
cp .env.example .env
```
*(Una vez copiado, abre tu nuevo archivo `.env` en cualquier editor de texto y configura las contraseñas que vas a usar en tu base de datos local, o coloca la URL de Supabase).*

### 3. Levantar la Base de Datos (PostgreSQL)
Abre tu terminal en la raíz del proyecto y ejecuta el siguiente comando. Esto levantará PostgreSQL y PgAdmin de fondo:

```bash
docker-compose up -d
```

### 4. Ejecutar el Backend (Spring Boot / Java)
Abre una nueva terminal, entra a la carpeta del backend y levanta el servidor de Java:

```bash
cd backend
mvn spring-boot:run
```
*(💡 **Tip para IDEs:** Si usas IntelliJ IDEA, Eclipse o VS Code, simplemente abre la carpeta `backend` en tu editor y presiona el botón de "Play" para arrancar el proyecto de forma visual, sin usar la terminal).*

### 5. Ejecutar el Frontend (React / Vite)
Abre una tercera terminal, entra a la carpeta del frontend, instala las librerías necesarias y arranca el entorno gráfico:

```bash
cd frontend
pnpm install
pnpm dev
```

---

## 🌐 Enlaces de Acceso Local
Una vez que hayas completado los pasos 3, 4 y 5, el sistema entero estará corriendo en tu PC. Accede a los siguientes enlaces desde tu navegador web:

- 💻 **Frontend (Interfaz de React):** http://localhost:3000
- ⚙️ **Backend (API REST):** http://localhost:8080
- 🐘 **PgAdmin (Gestor Visual de BD):** http://localhost:5050 (Las credenciales están en tu archivo `.env`)
