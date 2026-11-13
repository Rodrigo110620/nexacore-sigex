package com.nexacore.examenes.services;

import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.concurrent.CompletableFuture;

/**
 * Ejecuta un envío (p. ej. un correo) en segundo plano y solo si la transacción en curso se confirma: si la operación
 * falla no se envía nada, y quien hizo la petición no espera al servidor de correo (Gmail puede tardar segundos).
 */
public final class EnvioDiferido {
    private EnvioDiferido() {}

    /** Las pruebas lo apagan (app.correo.en-segundo-plano=false) para comprobar el envío en el momento. */
    static volatile boolean enSegundoPlano = true;

    public static void alConfirmar(Runnable envio) {
        if (!enSegundoPlano) {
            envio.run();
            return;
        }
        Runnable enSegundoPlano = () -> CompletableFuture.runAsync(envio);
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    enSegundoPlano.run();
                }
            });
        } else {
            enSegundoPlano.run();
        }
    }

    /** Lee app.correo.en-segundo-plano (por defecto, sí). */
    @org.springframework.stereotype.Component
    static class Configuracion {
        Configuracion(@org.springframework.beans.factory.annotation.Value("${app.correo.en-segundo-plano:true}") boolean valor) {
            enSegundoPlano = valor;
        }
    }
}
