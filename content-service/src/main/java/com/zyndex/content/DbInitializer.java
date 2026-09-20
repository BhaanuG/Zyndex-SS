package com.zyndex.content;

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
                CREATE TABLE IF NOT EXISTS resources (
                  id BIGINT NOT NULL AUTO_INCREMENT,
                  approved BOOLEAN NOT NULL DEFAULT TRUE,
                  downloads_count BIGINT NOT NULL DEFAULT 0,
                  rating DOUBLE NOT NULL DEFAULT 0,
                  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                  updated_at DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                  uploaded_by BIGINT NOT NULL,
                  description TEXT NULL,
                  author VARCHAR(190) NULL,
                  category VARCHAR(120) NOT NULL,
                  file_url VARCHAR(500) NULL,
                  image_url VARCHAR(500) NULL,
                  title VARCHAR(255) NOT NULL,
                  type VARCHAR(40) NOT NULL DEFAULT 'TEXTBOOK',
                  PRIMARY KEY (id)
                )
                """);
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS saved_resources (
                  resource_id BIGINT NOT NULL,
                  saved_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                  user_id BIGINT NOT NULL,
                  PRIMARY KEY (resource_id, user_id),
                  CONSTRAINT fk_saved_resource FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
                )
                """);
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS feedback (
                  id BIGINT NOT NULL AUTO_INCREMENT,
                  rating INT NOT NULL DEFAULT 0,
                  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                  resource_id BIGINT NOT NULL,
                  user_id BIGINT NOT NULL,
                  comment TEXT NULL,
                  PRIMARY KEY (id),
                  CONSTRAINT fk_feedback_resource FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
                )
                """);
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS contacts (
                  id BIGINT NOT NULL AUTO_INCREMENT,
                  name VARCHAR(120) NOT NULL,
                  email VARCHAR(190) NOT NULL,
                  subject VARCHAR(255) NOT NULL,
                  message TEXT NOT NULL,
                  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                  PRIMARY KEY (id)
                )
                """);
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS download_tokens (
                  token VARCHAR(100) NOT NULL,
                  resource_id BIGINT NOT NULL,
                  user_id BIGINT NOT NULL,
                  role VARCHAR(50) NOT NULL,
                  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  PRIMARY KEY (token)
                )
                """);
    }
}
