package com.bys.controller;

import com.bys.dto.AuthDtos.AuthResponse;
import com.bys.dto.AuthDtos.LoginRequest;
import com.bys.dto.AuthDtos.SignupRequest;
import com.bys.dto.AuthDtos.UserDto;
import com.bys.security.AuthUser;
import com.bys.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * CONTROLLER layer = the HTTP front door.
 * Its only jobs: map URL + method to a Java method, turn JSON into objects
 * (@RequestBody), validate (@Valid), call the service, and pick a status code.
 * No business logic lives here.
 *
 * @RestController = every return value is written as JSON in the response body.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /** POST /api/auth/signup  {email, password, fullName}  ->  201 {token, user} */
    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED) // 201 = "a new resource was created"
    public AuthResponse signup(@Valid @RequestBody SignupRequest request) {
        return authService.signup(request);
    }

    /** POST /api/auth/login  {email, password}  ->  200 {token, user} */
    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    /** GET /api/auth/me  (needs token)  ->  the logged-in user. Lets the frontend check a stored token. */
    @GetMapping("/me")
    public UserDto me(@AuthenticationPrincipal AuthUser user) {
        return authService.me(user.id());
    }
}
