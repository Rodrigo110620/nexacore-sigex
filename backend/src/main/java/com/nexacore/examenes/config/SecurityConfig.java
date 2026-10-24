package com.nexacore.examenes.config;

import com.nexacore.examenes.models.Rol;
import com.nexacore.examenes.security.AuthRateLimitFilter;
import com.nexacore.examenes.security.JwtAuthFilter;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import jakarta.servlet.DispatcherType;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authorization.AuthenticatedAuthorizationManager;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;

/**
 * Seguridad HTTP: JWT, rate limit en auth, headers y Swagger condicional.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private static final String[] AUTH_PUBLIC_PATHS = {
        "/auth/login",
        "/auth/forgot-password",
        "/auth/reset-password",
        "/auth/estudiante/activacion/solicitar",
        "/auth/estudiante/activacion/confirmar",
        "/health",
    };

    private static final String[] SWAGGER_PATHS = {
        "/swagger-ui/**",
        "/swagger-ui.html",
        "/v3/api-docs/**",
    };

    @Value("${app.security.swagger-enabled:true}")
    private boolean swaggerEnabled;

    @Value("${app.security.require-https:false}")
    private boolean requireHttps;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            CorsConfig corsConfig,
            JwtAuthFilter jwtAuthFilter,
            AuthRateLimitFilter authRateLimitFilter) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfig.corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .headers(headers -> {
                headers
                    .contentTypeOptions(Customizer.withDefaults())
                    .frameOptions(frame -> frame.deny())
                    .referrerPolicy(referrer ->
                        referrer.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                    .permissionsPolicy(permissions ->
                        permissions.policy("geolocation=(), microphone=(), camera=()"));
                if (requireHttps) {
                    headers.httpStrictTransportSecurity(hsts ->
                        hsts.includeSubDomains(true).maxAgeInSeconds(31536000));
                } else {
                    headers.httpStrictTransportSecurity(hsts -> hsts.disable());
                }
            })
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint((request, response, exception) ->
                    response.sendError(HttpServletResponse.SC_UNAUTHORIZED)))
            .authorizeHttpRequests(auth -> {
                auth.requestMatchers(AUTH_PUBLIC_PATHS).permitAll();
                // /error sin JWT: OncePerRequestFilter no revalida el token en el
                // dispatch de error y un 500 acababa respondiendo 401.
                auth.requestMatchers("/error").permitAll();
                // Continuación asíncrona de una petición ya autorizada (notificaciones en vivo, SSE):
                // el JWT no se revalida en ese despacho y sin esto Spring Security la cortaría.
                auth.dispatcherTypeMatchers(DispatcherType.ASYNC).permitAll();
                if (swaggerEnabled) {
                    auth.requestMatchers(SWAGGER_PATHS).permitAll();
                }
                // Sesión propia: cualquier usuario autenticado, también el estudiante.
                auth.requestMatchers("/auth/me", "/auth/cambiar-password", "/tiempo").authenticated();
                // Panel del estudiante: solo su cuenta (rol ESTUDIANTE).
                auth.requestMatchers("/mi/**").hasRole(Rol.ESTUDIANTE);
                // El resto de la API es del personal. El rol ESTUDIANTE (cuenta del estudiante)
                // recibe 403 aquí; sus propios endpoints se deben habilitar de forma explícita.
                auth.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                    .anyRequest().access(soloPersonal());
            })
            .addFilterBefore(authRateLimitFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        if (requireHttps) {
            http.requiresChannel(channel -> channel.anyRequest().requiresSecure());
        }

        return http.build();
    }

    /** Sesión iniciada y sin el rol ESTUDIANTE. */
    private static AuthorizationManager<RequestAuthorizationContext> soloPersonal() {
        AuthorizationManager<RequestAuthorizationContext> autenticado =
            AuthenticatedAuthorizationManager.authenticated();
        return (authentication, contexto) -> {
            AuthorizationDecision decision = autenticado.check(authentication, contexto);
            boolean esEstudiante = authentication.get().getAuthorities().stream()
                .anyMatch(autoridad -> ("ROLE_" + Rol.ESTUDIANTE).equals(autoridad.getAuthority()));
            return new AuthorizationDecision(decision != null && decision.isGranted() && !esEstudiante);
        };
    }
}
