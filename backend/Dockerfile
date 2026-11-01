# ==========================================
# SIGEX backend — Spring Boot (Java 21)
# Etapa 1 compila el .jar con Maven; etapa 2 solo trae el JRE y el .jar.
# ==========================================
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
# Primero el pom: las dependencias quedan en caché mientras no cambie.
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q -DskipTests package && cp target/*.jar app.jar

FROM eclipse-temurin:21-jre
WORKDIR /app
# Hora de Bolivia también en los logs. La aplicación la fija igual (APP_TIMEZONE, ver ZonaHoraria).
ENV TZ=America/La_Paz
# Cliente de PostgreSQL para el respaldo de la base (IMP-10; el laboratorio no respalda las bases).
# Se instala la versión 18 del repositorio oficial: pg_dump no respalda un servidor más nuevo que él
# y la base del laboratorio es PostgreSQL 18. Sí respalda versiones anteriores (la local es 15).
RUN apt-get update \
    && apt-get install -y --no-install-recommends postgresql-common ca-certificates \
    && /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y \
    && apt-get install -y --no-install-recommends postgresql-client-18 \
    && rm -rf /var/lib/apt/lists/*
RUN useradd --system --uid 1001 sigex \
    && mkdir -p /respaldos && chown sigex /respaldos
COPY --from=build /app/app.jar app.jar
USER sigex
EXPOSE 8080
# Heap: como máximo el 60 % del límite de memoria del contenedor (docker-compose.yml);
# el resto lo necesita la JVM fuera del heap (metaspace, hilos, GC).
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=60", "-jar", "/app/app.jar"]
