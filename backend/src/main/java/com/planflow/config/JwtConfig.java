package com.planflow.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "planflow.jwt")
public class JwtConfig {

    private String secret;
    private long expiration = 86400000L;
    private long rememberExpiration = 2592000000L;
}
