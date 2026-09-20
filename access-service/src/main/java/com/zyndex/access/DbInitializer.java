package com.zyndex.access;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
class DbInitializer implements CommandLineRunner {
    private final JdbcTemplate jdbc;

    DbInitializer(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(String... args) {
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS access_entitlements (
                  id BIGINT NOT NULL AUTO_INCREMENT,
                  user_id BIGINT NOT NULL,
                  resource_id BIGINT NULL,
                  permission VARCHAR(50) NOT NULL,
                  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
                  expires_at DATETIME(6) NULL,
                  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                  PRIMARY KEY (id)
                )
                """);
    }
}
