package com.zyndex.auth;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
class DbInitializer implements CommandLineRunner {
    private final JdbcTemplate jdbc;
    private final AppProperties properties;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    DbInitializer(JdbcTemplate jdbc, AppProperties properties) {
        this.jdbc = jdbc;
        this.properties = properties;
    }

    @Override
    public void run(String... args) {
        jdbc.execute("""
                 CREATE TABLE IF NOT EXISTS users (
                   id BIGINT NOT NULL AUTO_INCREMENT,
                   created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                   updated_at DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                   email VARCHAR(190) NOT NULL UNIQUE,
                   password VARCHAR(255) NOT NULL,
                   username VARCHAR(120) NOT NULL,
                   role VARCHAR(30) NOT NULL DEFAULT 'STUDENT',
                   bio TEXT NULL,
                   registration_no VARCHAR(80) NULL,
                   college_name VARCHAR(255) NULL,
                   university_name VARCHAR(255) NULL,
                   active BOOLEAN NOT NULL DEFAULT TRUE,
                   PRIMARY KEY (id)
                 )
                 """);
        try {
            jdbc.execute("ALTER TABLE users ADD COLUMN college_name VARCHAR(255) NULL");
        } catch (Exception ignored) {}
        try {
            jdbc.execute("ALTER TABLE users ADD COLUMN university_name VARCHAR(255) NULL");
        } catch (Exception ignored) {}
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS admin_requests (
                  id BIGINT NOT NULL AUTO_INCREMENT,
                  full_name VARCHAR(120) NOT NULL,
                  display_name VARCHAR(120) NOT NULL,
                  email VARCHAR(190) NOT NULL,
                  password_hash VARCHAR(255) NOT NULL,
                  status VARCHAR(30) NOT NULL DEFAULT 'pending',
                  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                  PRIMARY KEY (id)
                )
                """);
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS password_reset_requests (
                  id BIGINT NOT NULL AUTO_INCREMENT,
                  full_name VARCHAR(120) NOT NULL,
                  email VARCHAR(190) NOT NULL,
                  role VARCHAR(30) NOT NULL,
                  previous_password VARCHAR(255) NULL,
                  new_password_hash VARCHAR(255) NOT NULL,
                  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                  PRIMARY KEY (id)
                )
                """);
        ensureMainAdmin();
    }

    private void ensureMainAdmin() {
        String query = "SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1";
        var rows = jdbc.queryForList(query, properties.mainAdminEmail());
        Long id = null;
        if (!rows.isEmpty()) {
            Object val = rows.get(0).values().iterator().next();
            id = val == null ? null : ((Number) val).longValue();
        }

        String passwordHash = passwordEncoder.encode(properties.mainAdminPassword());
        if (id != null) {
            jdbc.update("UPDATE users SET role = 'ADMIN', password = ? WHERE id = ?", passwordHash, id);
            return;
        }
        jdbc.update("INSERT INTO users (created_at, email, password, username, role) VALUES (NOW(), ?, ?, ?, 'ADMIN')",
                properties.mainAdminEmail(), passwordHash, properties.mainAdminName());
    }
}
