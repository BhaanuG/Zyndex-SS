package com.zyndex.subscription;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DbInitializer implements CommandLineRunner {
    private final JdbcTemplate jdbc;

    public DbInitializer(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(String... args) {
        // 1. Create plans table
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS plans (
                  id VARCHAR(50) NOT NULL,
                  name VARCHAR(100) NOT NULL,
                  description TEXT NULL,
                  price_paise BIGINT NOT NULL,
                  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
                  billing_interval VARCHAR(20) NOT NULL DEFAULT 'MONTH',
                  active BOOLEAN NOT NULL DEFAULT TRUE,
                  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                  PRIMARY KEY (id)
                )
                """);

        // 2. Create subscriptions table
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS subscriptions (
                  id VARCHAR(50) NOT NULL,
                  user_id BIGINT NOT NULL,
                  plan_id VARCHAR(50) NOT NULL,
                  status VARCHAR(30) NOT NULL DEFAULT 'FREE',
                  start_date DATETIME(6) NULL,
                  end_date DATETIME(6) NULL,
                  auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
                  gateway_customer_id VARCHAR(100) NULL,
                  gateway_subscription_id VARCHAR(100) NULL,
                  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                  PRIMARY KEY (id)
                )
                """);

        // 3. Create payments table
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS payments (
                  id VARCHAR(50) NOT NULL,
                  user_id BIGINT NOT NULL,
                  subscription_id VARCHAR(50) NULL,
                  gateway_payment_id VARCHAR(100) NOT NULL,
                  gateway_order_id VARCHAR(100) NULL,
                  amount_paise BIGINT NOT NULL,
                  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
                  payment_method VARCHAR(30) NOT NULL,
                  status VARCHAR(30) NOT NULL,
                  paid_at DATETIME(6) NULL,
                  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                  PRIMARY KEY (id),
                  UNIQUE KEY uq_gateway_payment (gateway_payment_id)
                )
                """);

        // Run migrations for existing payments table columns
        addColumnIfNotExists("payments", "gateway", "VARCHAR(50) NULL");
        addColumnIfNotExists("payments", "gateway_qr_id", "VARCHAR(100) NULL");
        addColumnIfNotExists("payments", "gateway_event_id", "VARCHAR(100) NULL");
        addColumnIfNotExists("payments", "plan_id", "VARCHAR(50) NULL");
        addColumnIfNotExists("payments", "expires_at", "DATETIME(6) NULL");
        addColumnIfNotExists("payments", "receipt_email_sent", "BOOLEAN NOT NULL DEFAULT FALSE");
        addColumnIfNotExists("payments", "updated_at", "TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)");
        addUniqueIndexIfNotExists("payments", "uq_gateway_event", "gateway_event_id");

        // 4. Seed default plans
        seedPlan("FREE", "Free / Demo", "Explore the platform with limited previews", 0L, "Forever");
        seedPlan("STUDENT_BASIC", "Student Basic", "Online reading for individual students", 9900L, "MONTH");
        seedPlan("STUDENT_PLUS", "Student Plus", "Entire catalog with offline browser saving", 19900L, "MONTH");
        seedPlan("RESEARCHER_PRO", "PhD Scholar / Researcher", "Complete research collection and downloads", 49900L, "MONTH");
        seedPlan("UNIVERSITY", "University", "Institutional campus-wide access", 10000000L, "YEAR");
        seedPlan("ENTERPRISE", "Enterprise / Institution", "Organization-wide access with custom rules", 30000000L, "YEAR");
    }

    private void addColumnIfNotExists(String tableName, String columnName, String columnDefinition) {
        try {
            String sql = "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = ? AND column_name = ? AND table_schema = DATABASE()";
            Integer count = jdbc.queryForObject(sql, Integer.class, tableName, columnName);
            if (count == null || count == 0) {
                jdbc.execute("ALTER TABLE " + tableName + " ADD COLUMN " + columnName + " " + columnDefinition);
            }
        } catch (Exception e) {
            System.err.println("Migration warning: failed to add column " + columnName + " to " + tableName + ": " + e.getMessage());
        }
    }

    private void addUniqueIndexIfNotExists(String tableName, String indexName, String columns) {
        try {
            String sql = "SELECT COUNT(*) FROM information_schema.statistics WHERE table_name = ? AND index_name = ? AND table_schema = DATABASE()";
            Integer count = jdbc.queryForObject(sql, Integer.class, tableName, indexName);
            if (count == null || count == 0) {
                jdbc.execute("ALTER TABLE " + tableName + " ADD UNIQUE INDEX " + indexName + " (" + columns + ")");
            }
        } catch (Exception e) {
            System.err.println("Migration warning: failed to add unique index " + indexName + " to " + tableName + ": " + e.getMessage());
        }
    }

    private void seedPlan(String id, String name, String desc, long price, String interval) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM plans WHERE id = ?", Integer.class, id);
        if (count == null || count == 0) {
            jdbc.update("INSERT INTO plans (id, name, description, price_paise, billing_interval) VALUES (?, ?, ?, ?, ?)",
                    id, name, desc, price, interval);
        }
    }
}
