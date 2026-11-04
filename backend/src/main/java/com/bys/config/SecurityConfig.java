package com.bys.config;

import com.bys.security.JwtAuthFilter;
import com.bys.security.JwtService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * The security rules for the whole API, in one place.
 * A @Configuration class contains @Bean methods: objects Spring creates once
 * and injects wherever they're needed.
 */
@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtService jwtService) throws Exception {
        http
            // CSRF protection defends cookie-based sessions. We don't use cookies:
            // the browser must explicitly attach the token, so CSRF doesn't apply.
            .csrf(AbstractHttpConfigurer::disable)
            // STATELESS: never create an HTTP session. Every request proves itself with its JWT.
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                    .requestMatchers(HttpMethod.POST, "/api/auth/signup", "/api/auth/login").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/events/**", "/api/shows/**").permitAll()
                    .requestMatchers("/actuator/health/**", "/actuator/info", "/error").permitAll()
                    .anyRequest().authenticated()) // everything else (bookings, /me) needs a valid token
            // When an anonymous request hits a protected URL, reply 401 with JSON (default is an HTML page).
            .exceptionHandling(e -> e.authenticationEntryPoint((req, res, ex) -> {
                res.setStatus(401);
                res.setContentType(MediaType.APPLICATION_JSON_VALUE);
                res.getWriter().write("{\"status\":401,\"error\":\"Unauthorized\",\"message\":\"Please log in first.\"}");
            }))
            // Plug our JWT check in before Spring's own login filter.
            // (Created with `new` instead of as a @Bean so Spring Boot doesn't ALSO
            //  register it as a global servlet filter.)
            .addFilterBefore(new JwtAuthFilter(jwtService), UsernamePasswordAuthenticationFilter.class)
            // No browser login form / basic-auth popup: this is a JSON API.
            .httpBasic(AbstractHttpConfigurer::disable)
            .formLogin(AbstractHttpConfigurer::disable);
        return http.build();
    }

    /**
     * BCrypt hashes passwords with a random salt and is deliberately SLOW,
     * so if the DB leaks, attackers can't cheaply guess passwords.
     * The same password hashes differently every time; matches() still works.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
