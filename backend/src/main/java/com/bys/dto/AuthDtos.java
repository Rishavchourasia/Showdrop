package com.bys.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * DTO = Data Transfer Object: the exact JSON shape that goes over the wire.
 *
 * WHY not just return the User entity? It would leak passwordHash, and every
 * DB change would silently change the API. DTOs are the API's public contract;
 * entities are private storage details.
 *
 * Java "records" are perfect for DTOs: immutable, with constructor, getters,
 * equals/hashCode generated. Jackson turns them into JSON automatically.
 */
public final class AuthDtos {
    private AuthDtos() {}

    /* The validation annotations are checked by @Valid in the controller; a bad
       request never reaches the service and gets a 400 with field errors. */
    public record SignupRequest(
            @NotBlank @Email String email,
            @NotBlank @Size(min = 6, max = 100, message = "must be at least 6 characters") String password,
            @NotBlank @Size(max = 100) String fullName) {}

    public record LoginRequest(
            @NotBlank @Email String email,
            @NotBlank String password) {}

    public record UserDto(Long id, String email, String fullName) {}

    /** The token is what the frontend stores and sends back as "Authorization: Bearer <token>". */
    public record AuthResponse(String token, UserDto user) {}
}
