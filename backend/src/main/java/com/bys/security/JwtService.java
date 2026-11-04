package com.bys.security;

import com.bys.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;

/**
 * Creates and verifies JSON Web Tokens.
 *
 * HOW A JWT WORKS (like a tamper-proof wristband at a concert):
 *   A token looks like  xxxxx.yyyyy.zzzzz
 *     header  . payload (e.g. {"sub":"42","email":"a@b.com","exp":...}) . signature
 *   The signature = HMAC(header+payload, SECRET). Only the server knows SECRET.
 *   The payload is only base64 -- anyone can READ it -- but nobody can CHANGE it
 *   without breaking the signature. So: never put secrets in it, but trust its
 *   contents once the signature checks out.
 *
 * WHY JWT instead of server sessions? The server stores nothing per user, so any
 * backend instance (we'll run several in Kubernetes) can verify any token.
 */
@Service
public class JwtService {

    private final SecretKey key;
    private final Duration ttl;

    public JwtService(@Value("${app.jwt.secret}") String secret,
                      @Value("${app.jwt.expiration-minutes}") long expirationMinutes) {
        // hmacShaKeyFor throws if the secret is too short to be safe (< 256 bits).
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.ttl = Duration.ofMinutes(expirationMinutes);
    }

    public String generateToken(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(user.getId()))   // "sub": who this token is about
                .claim("email", user.getEmail())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(ttl)))     // tokens must expire, in case one leaks
                .signWith(key)
                .compact();
    }

    /** Returns the user if the token is valid (good signature, not expired); empty otherwise. */
    public Optional<AuthUser> parse(String token) {
        try {
            Claims claims = Jwts.parser().verifyWith(key).build()
                    .parseSignedClaims(token)
                    .getPayload();
            return Optional.of(new AuthUser(Long.valueOf(claims.getSubject()), claims.get("email", String.class)));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
