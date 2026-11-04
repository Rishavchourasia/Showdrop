package com.bys.dto;

import java.time.Instant;
import java.util.Map;

/**
 * Every error the API returns has this same JSON shape, so the frontend can
 * always do `error.message` without guessing.
 */
public record ErrorResponse(int status, String error, String message, Instant timestamp,
                            Map<String, String> fieldErrors) {
    public static ErrorResponse of(int status, String error, String message) {
        return new ErrorResponse(status, error, message, Instant.now(), Map.of());
    }
}
