package com.bys.security;

/**
 * Who is making the current request. The JWT filter builds this from the token
 * and controllers receive it via @AuthenticationPrincipal.
 *
 * WHY not load the full User from the DB on every request? The signed token
 * already proves who you are -- that's the point of a JWT (no DB/session lookup).
 */
public record AuthUser(Long id, String email) {}
