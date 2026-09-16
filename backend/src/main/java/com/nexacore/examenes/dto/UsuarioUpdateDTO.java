package com.nexacore.examenes.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UsuarioUpdateDTO(
    
    @NotBlank(message = "El campo nombres es obligatorio y no puede estar vacío.") 
    String nombres,
    
    @NotBlank(message = "El campo apellidos es obligatorio y no puede estar vacío.") 
    String apellidos,
    
    @NotBlank(message = "El documento de identidad (DNI) es obligatorio.") 
    String dni,
    
    @NotBlank(message = "El correo institucional es obligatorio.") 
    @Email(message = "El formato del correo institucional no es válido.") 
    String email,
    
    @NotBlank(message = "Debe asignar un rol válido (ADMIN, DOCENTE, CONTROL).") 
    String rol,
    
    @NotNull(message = "El estado de la cuenta es obligatorio.")
    Boolean activo
) {}