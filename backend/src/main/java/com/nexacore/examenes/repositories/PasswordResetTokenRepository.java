package com.nexacore.examenes.repositories;

import com.nexacore.examenes.models.PasswordResetToken;
import com.nexacore.examenes.models.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Integer> {

    Optional<PasswordResetToken> findByTokenHashAndUsedAtIsNull(String tokenHash);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE PasswordResetToken t SET t.usedAt = CURRENT_TIMESTAMP "
            + "WHERE t.usuario = :usuario AND t.usedAt IS NULL")
    int invalidatePendingForUsuario(@Param("usuario") Usuario usuario);
}
