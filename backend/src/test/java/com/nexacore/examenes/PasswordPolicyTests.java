package com.nexacore.examenes;

import com.nexacore.examenes.security.PasswordPolicy;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class PasswordPolicyTests {

    @Test
    void aceptaContrasenasFuertes() {
        assertDoesNotThrow(() -> PasswordPolicy.validate("Segura1!"));
        assertDoesNotThrow(() -> PasswordPolicy.validate("Frase larga 2026!"));
    }

    @Test
    void rechazaContrasenasDebiles() {
        String[] invalidas = {
                "Aa1!", "segura12!", "SEGURA12!", "Seguraxx!", "Segura12", "Segura1 ",
                "Áa1!" + "é".repeat(35)
        };
        for (String password : invalidas) {
            assertThrows(IllegalArgumentException.class, () -> PasswordPolicy.validate(password));
        }
    }
}
