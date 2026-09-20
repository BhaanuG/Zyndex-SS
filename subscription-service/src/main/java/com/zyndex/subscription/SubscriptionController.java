package com.zyndex.subscription;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/subscriptions")
public class SubscriptionController {

    private final JdbcTemplate jdbc;
    private final RestTemplate restTemplate;
    private final JavaMailSender mailSender;

    @Value("${razorpay.key-id:}")
    private String razorpayKeyId;

    @Value("${razorpay.key-secret:}")
    private String razorpayKeySecret;

    @Value("${razorpay.webhook-secret:}")
    private String razorpayWebhookSecret;

    @Value("${payment.mode:SIMULATED}")
    private String paymentMode;

    @Value("${zyndex.otp-mail-from:}")
    private String mailFrom;

    public SubscriptionController(JdbcTemplate jdbc, RestTemplate restTemplate, JavaMailSender mailSender) {
        this.jdbc = jdbc;
        this.restTemplate = restTemplate;
        this.mailSender = mailSender;
    }

    @GetMapping("/plans")
    public List<Map<String, Object>> getPlans() {
        return jdbc.queryForList("SELECT * FROM plans WHERE active = TRUE ORDER BY price_paise ASC");
    }

    @GetMapping("/me")
    public Map<String, Object> getMySubscription(HttpServletRequest request) {
        Long userId = getUserIdHeader(request);
        if (userId == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }

        List<Map<String, Object>> subs = jdbc.queryForList(
                "SELECT s.*, p.name as plan_name, p.price_paise, p.currency, p.billing_interval FROM subscriptions s " +
                "JOIN plans p ON s.plan_id = p.id WHERE s.user_id = ? ORDER BY s.created_at DESC LIMIT 1", 
                userId
        );

        if (subs.isEmpty()) {
            return buildFreeSubscriptionResponse();
        }

        Map<String, Object> sub = subs.get(0);
        String status = String.valueOf(sub.get("status")).toUpperCase();
        Object endObj = sub.get("end_date");
        java.time.Instant endInstant = null;

        if (endObj instanceof java.sql.Timestamp) {
            endInstant = ((java.sql.Timestamp) endObj).toInstant();
        } else if (endObj instanceof java.time.LocalDateTime) {
            endInstant = ((java.time.LocalDateTime) endObj).toInstant(java.time.ZoneOffset.UTC);
        } else if (endObj instanceof java.time.Instant) {
            endInstant = (java.time.Instant) endObj;
        }

        boolean isExpired = endInstant != null && java.time.Instant.now().isAfter(endInstant);

        if (isExpired && ("ACTIVE".equals(status) || "CANCELLED".equals(status))) {
            try {
                jdbc.update("UPDATE subscriptions SET status = 'EXPIRED' WHERE id = ?", sub.get("id"));
            } catch (Exception ignored) {}
            status = "EXPIRED";
        }

        // If expired or revoked, resolve to FREE according to business rules
        if (isExpired || "REVOKED".equals(status) || "EXPIRED".equals(status) || "FREE".equals(status)) {
            return buildFreeSubscriptionResponse();
        }

        String planId = String.valueOf(sub.get("plan_id"));
        String planName = String.valueOf(sub.get("plan_name"));
        long pricePaise = sub.get("price_paise") != null ? ((Number) sub.get("price_paise")).longValue() : 0L;
        String currency = sub.get("currency") != null ? String.valueOf(sub.get("currency")) : "INR";
        String billingInterval = sub.get("billing_interval") != null ? String.valueOf(sub.get("billing_interval")) : "MONTH";
        boolean autoRenew = Boolean.TRUE.equals(sub.get("auto_renew"));

        Map<String, Object> res = new java.util.LinkedHashMap<>();
        res.put("id", sub.get("id"));
        res.put("userId", sub.get("user_id"));
        res.put("planId", planId);
        res.put("plan_id", planId);
        res.put("planName", planName);
        res.put("plan_name", planName);
        res.put("status", status);
        res.put("price", pricePaise / 100.0);
        res.put("pricePaise", pricePaise);
        res.put("price_paise", pricePaise);
        res.put("currency", currency);
        res.put("billingInterval", billingInterval);
        res.put("billing_interval", billingInterval);
        res.put("startDate", sub.get("start_date") != null ? sub.get("start_date").toString() : null);
        res.put("start_date", sub.get("start_date") != null ? sub.get("start_date").toString() : null);
        res.put("endDate", sub.get("end_date") != null ? sub.get("end_date").toString() : null);
        res.put("end_date", sub.get("end_date") != null ? sub.get("end_date").toString() : null);
        res.put("expiresAt", sub.get("end_date") != null ? sub.get("end_date").toString() : null);
        res.put("autoRenew", autoRenew);
        res.put("auto_renew", autoRenew);
        return res;
    }

    private Map<String, Object> buildFreeSubscriptionResponse() {
        Map<String, Object> free = new java.util.LinkedHashMap<>();
        free.put("id", null);
        free.put("planId", "FREE");
        free.put("plan_id", "FREE");
        free.put("planName", "Free / Demo");
        free.put("plan_name", "Free / Demo");
        free.put("status", "FREE");
        free.put("price", 0.0);
        free.put("pricePaise", 0L);
        free.put("price_paise", 0L);
        free.put("currency", "INR");
        free.put("billingInterval", "Forever");
        free.put("billing_interval", "Forever");
        free.put("startDate", null);
        free.put("start_date", null);
        free.put("endDate", null);
        free.put("end_date", null);
        free.put("expiresAt", null);
        free.put("autoRenew", false);
        free.put("auto_renew", false);
        return free;
    }

    @PostMapping("/checkout")
    public Map<String, Object> createCheckout(HttpServletRequest request, @RequestBody Map<String, Object> body) {
        Long userId = getUserIdHeader(request);
        if (userId == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }

        String planId = String.valueOf(body.get("planId")).toUpperCase();
        String paymentMethod = String.valueOf(body.getOrDefault("paymentMethod", "CARD")).toUpperCase();

        List<Map<String, Object>> plans = jdbc.queryForList("SELECT * FROM plans WHERE id = ? AND active = TRUE", planId);
        if (plans.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid or inactive plan selection.");
        }

        long pricePaise = ((Number) plans.get(0).get("price_paise")).longValue();

        String paymentId = "PAY_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);

        String gatewayOrderId = "";
        String gatewayQrId = "";
        String gatewayQrUrl = "";
        boolean isRealGateway = false;

        // Try Razorpay real gateway order & dynamic QR generation
        if (paymentMode.equalsIgnoreCase("LIVE") || (razorpayKeyId != null && !razorpayKeyId.isBlank() && !razorpayKeyId.startsWith("mock"))) {
            if (paymentMode.equalsIgnoreCase("LIVE") && (razorpayKeyId == null || razorpayKeyId.isBlank() || razorpayKeySecret == null || razorpayKeySecret.isBlank())) {
                throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Payment gateway configuration error: Razorpay credentials missing for LIVE payment mode.");
            }
            try {
                com.razorpay.RazorpayClient client = new com.razorpay.RazorpayClient(razorpayKeyId, razorpayKeySecret);

                // 1. Create Razorpay Order
                org.json.JSONObject orderRequest = new org.json.JSONObject();
                orderRequest.put("amount", pricePaise);
                orderRequest.put("currency", "INR");
                orderRequest.put("receipt", paymentId);

                com.razorpay.Order order = client.orders.create(orderRequest);
                gatewayOrderId = order.get("id");

                // 2. Create dynamic UPI QR Code (Part 4)
                org.json.JSONObject qrRequest = new org.json.JSONObject();
                qrRequest.put("type", "upi_qr");
                qrRequest.put("name", "ScholarSphere Digital");
                qrRequest.put("usage", "single_use");
                qrRequest.put("fixed_amount", true);
                qrRequest.put("amount", pricePaise);
                qrRequest.put("description", "Subscription for " + planId);
                // close_by timestamp: 3 minutes (180 seconds) from now (Part 5)
                long closeByTimestamp = (System.currentTimeMillis() / 1000) + 180;
                qrRequest.put("close_by", closeByTimestamp);

                com.razorpay.QrCode qrCode = client.qrCode.create(qrRequest);
                gatewayQrId = qrCode.get("id");
                gatewayQrUrl = qrCode.get("image_url");
                isRealGateway = true;
            } catch (Exception e) {
                if (paymentMode.equalsIgnoreCase("LIVE")) {
                    throw new ApiException(HttpStatus.BAD_GATEWAY, "Razorpay gateway service error: " + e.getMessage());
                }
                System.err.println("Razorpay Client connection failed in dev mode, falling back to simulator: " + e.getMessage());
            }
        }

        // If credentials are empty or failed in dev mode, generate a mock dynamic QR link
        if (!isRealGateway) {
            gatewayOrderId = "order_" + UUID.randomUUID().toString().replace("-", "").substring(0, 14);
            gatewayQrId = "qr_" + UUID.randomUUID().toString().replace("-", "").substring(0, 14);

            double amountRupees = pricePaise / 100.0;
            String receiverUpiId = "gali.7687-7@waaxis";
            String upiUri = "upi://pay?pa=" + receiverUpiId +
                    "&pn=ScholarSphere%20Digital" +
                    "&am=" + String.format("%.2f", amountRupees) +
                    "&tr=" + paymentId +
                    "&tn=Subscription%20" + planId;

            gatewayQrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=" +
                    java.net.URLEncoder.encode(upiUri, java.nio.charset.StandardCharsets.UTF_8);
        }

        // Expires in exactly 180 seconds (3 minutes) (Part 5)
        java.time.Instant expiresAt = java.time.Instant.now().plusSeconds(180);

        jdbc.update(
                "INSERT INTO payments (id, user_id, gateway, gateway_payment_id, gateway_order_id, gateway_qr_id, plan_id, amount_paise, payment_method, status, expires_at, receipt_email_sent) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, FALSE)",
                paymentId, userId, (isRealGateway ? "RAZORPAY" : "SIMULATED"), paymentId, gatewayOrderId, gatewayQrId, planId, pricePaise, paymentMethod, java.sql.Timestamp.from(expiresAt)
        );

        return Map.of(
                "paymentId", paymentId,
                "orderId", gatewayOrderId,
                "qrId", gatewayQrId,
                "qrUrl", gatewayQrUrl,
                "amount", pricePaise,
                "expiresAt", expiresAt.getEpochSecond(),
                "timeLeft", 180
        );
    }

    @GetMapping("/payment-status/{paymentId}")
    public Map<String, Object> getPaymentStatus(HttpServletRequest request, @PathVariable("paymentId") String paymentId) {
        Long userId = getUserIdHeader(request);
        if (userId == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }

        List<Map<String, Object>> payments = jdbc.queryForList(
                "SELECT * FROM payments WHERE id = ? AND user_id = ?",
                paymentId, userId
        );

        if (payments.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Payment transaction not found.");
        }

        try {
            Map<String, Object> payment = payments.get(0);
            String status = String.valueOf(payment.get("status"));
            Object expiresObj = payment.get("expires_at");
            java.time.Instant expiresInstant = null;
            if (expiresObj instanceof java.sql.Timestamp) {
                expiresInstant = ((java.sql.Timestamp) expiresObj).toInstant();
            } else if (expiresObj instanceof java.time.LocalDateTime) {
                expiresInstant = ((java.time.LocalDateTime) expiresObj).toInstant(java.time.ZoneOffset.UTC);
            } else if (expiresObj instanceof java.time.Instant) {
                expiresInstant = (java.time.Instant) expiresObj;
            }

            if ("PENDING".equals(status)) {
                if (expiresInstant != null && java.time.Instant.now().isAfter(expiresInstant)) {
                    status = "EXPIRED";
                    jdbc.update("UPDATE payments SET status = 'EXPIRED' WHERE id = ?", paymentId);
                } else if (razorpayKeyId != null && !razorpayKeyId.isBlank() && !razorpayKeyId.startsWith("mock")) {
                    // Proactive polling check with Razorpay API in case webhook is delayed or running on localhost
                    try {
                        com.razorpay.RazorpayClient client = new com.razorpay.RazorpayClient(razorpayKeyId, razorpayKeySecret);
                        String orderId = String.valueOf(payment.get("gateway_order_id"));
                        String qrId = String.valueOf(payment.get("gateway_qr_id"));

                        boolean isPaid = false;
                        String rzpPaymentId = null;

                        if (orderId != null && !orderId.isBlank() && !orderId.startsWith("order_")) {
                            try {
                                List<com.razorpay.Payment> rzpPayments = client.orders.fetchPayments(orderId);
                                if (rzpPayments != null && !rzpPayments.isEmpty()) {
                                    for (com.razorpay.Payment p : rzpPayments) {
                                        String s = p.get("status");
                                        if ("captured".equalsIgnoreCase(s) || "authorized".equalsIgnoreCase(s)) {
                                            isPaid = true;
                                            rzpPaymentId = p.get("id");
                                            break;
                                        }
                                    }
                                }
                            } catch (Exception ignored) {}
                        }

                        if (isPaid) {
                            activateSuccessfulSubscription(
                                    paymentId, userId, String.valueOf(payment.get("plan_id")),
                                    ((Number) payment.get("amount_paise")).longValue(),
                                    rzpPaymentId, orderId, "rzp_poll_" + System.currentTimeMillis()
                            );
                            status = "SUCCESS";
                        }
                    } catch (Exception e) {
                        System.err.println("Razorpay proactive polling error: " + e.getMessage());
                    }
                }
            }

            return Map.of("status", status);
        } catch (Exception e) {
            e.printStackTrace();
            throw e;
        }
    }

    @PostMapping("/webhook")
    public Map<String, Object> handleWebhook(
            @RequestHeader(name = "X-Razorpay-Signature", required = false) String signature,
            @RequestBody String rawPayload) {

        if (paymentMode.equalsIgnoreCase("LIVE") && (signature == null || signature.isBlank())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Missing X-Razorpay-Signature in LIVE payment mode.");
        }

        // Signature check if header is supplied or running in production
        if (signature != null && !signature.isBlank()) {
            String webhookSecretKey = razorpayWebhookSecret != null && !razorpayWebhookSecret.isBlank()
                    ? razorpayWebhookSecret
                    : "zyndex-secret-key-12345";
            if (!verifyRazorpaySignature(rawPayload, signature, webhookSecretKey)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid webhook signature.");
            }
        }

        Map<String, Object> payload;
        try {
            payload = new com.fasterxml.jackson.databind.ObjectMapper().readValue(rawPayload, Map.class);
        } catch (Exception e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid JSON payload.");
        }

        // Handle simulated webhook events
        if (payload.containsKey("event") && payload.get("event") instanceof Map) {
            if (paymentMode.equalsIgnoreCase("LIVE")) {
                throw new ApiException(HttpStatus.FORBIDDEN, "Simulated webhook events are not allowed in LIVE payment mode.");
            }
            Map<String, Object> mockEvent = (Map<String, Object>) payload.get("event");
            String gatewayPaymentId = String.valueOf(mockEvent.get("paymentId"));
            String gatewayOrderId = String.valueOf(mockEvent.get("orderId"));
            String status = String.valueOf(mockEvent.get("status")).toUpperCase();
            String planId = String.valueOf(mockEvent.get("planId")).toUpperCase();
            return handleMockWebhookFlow(gatewayPaymentId, gatewayOrderId, status, planId);
        }

        String eventType = String.valueOf(payload.get("event"));
        String eventId = String.valueOf(payload.get("id"));

        Map<String, Object> innerPayload = (Map<String, Object>) payload.get("payload");
        if (innerPayload == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Missing payload data.");
        }

        Map<String, Object> paymentObj = (Map<String, Object>) innerPayload.get("payment");
        Map<String, Object> paymentEntity = paymentObj != null ? (Map<String, Object>) paymentObj.get("entity") : null;

        Map<String, Object> orderObj = (Map<String, Object>) innerPayload.get("order");
        Map<String, Object> orderEntity = orderObj != null ? (Map<String, Object>) orderObj.get("entity") : null;

        String gatewayPaymentId = paymentEntity != null ? String.valueOf(paymentEntity.get("id")) : null;
        String gatewayOrderId = paymentEntity != null ? String.valueOf(paymentEntity.get("order_id")) :
                (orderEntity != null ? String.valueOf(orderEntity.get("id")) : null);

        long amountPaise = paymentEntity != null ? ((Number) paymentEntity.get("amount")).longValue() : 0;
        String currency = paymentEntity != null ? String.valueOf(paymentEntity.get("currency")) : "INR";

        if (gatewayOrderId == null || gatewayOrderId.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Missing gateway order ID.");
        }

        // Webhook idempotency check (Part 7: 6)
        if (eventId != null && !eventId.isBlank() && !"null".equals(eventId)) {
            Integer count = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM payments WHERE gateway_event_id = ?",
                    Integer.class, eventId
            );
            if (count != null && count > 0) {
                return Map.of("message", "Duplicate webhook event ignored.");
            }
        }

        List<Map<String, Object>> existing = jdbc.queryForList(
                "SELECT id, user_id, amount_paise, currency, plan_id, status FROM payments WHERE gateway_order_id = ?",
                gatewayOrderId
        );

        if (existing.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Payment transaction record not found.");
        }

        Map<String, Object> dbPayment = existing.get(0);
        String paymentId = String.valueOf(dbPayment.get("id"));
        Long userId = ((Number) dbPayment.get("user_id")).longValue();
        long dbAmount = ((Number) dbPayment.get("amount_paise")).longValue();
        String dbCurrency = String.valueOf(dbPayment.get("currency"));
        String planId = String.valueOf(dbPayment.get("plan_id"));
        String dbStatus = String.valueOf(dbPayment.get("status"));

        if (amountPaise != dbAmount || !dbCurrency.equalsIgnoreCase(currency)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Payment amount/currency mismatch.");
        }

        if ("SUCCESS".equals(dbStatus)) {
            return Map.of("message", "Duplicate event ignored.", "paymentStatus", "SUCCESS");
        }

        String newStatus = "SUCCESS";
        if (eventType.contains("failed")) {
            newStatus = "FAILED";
        }

        if ("SUCCESS".equals(newStatus)) {
            activateSuccessfulSubscription(paymentId, userId, planId, dbAmount, gatewayPaymentId, gatewayOrderId, eventId);
        } else {
            jdbc.update(
                    "UPDATE payments SET status = ?, gateway_payment_id = ?, gateway_event_id = ?, paid_at = NOW() WHERE id = ?",
                    newStatus, gatewayPaymentId, eventId, paymentId
            );
        }

        return Map.of("message", "Webhook event processed successfully.", "paymentStatus", newStatus);
    }

    private Map<String, Object> handleMockWebhookFlow(String gatewayPaymentId, String gatewayOrderId, String status, String planId) {
        List<Map<String, Object>> existing = jdbc.queryForList(
                "SELECT id, user_id, amount_paise, status FROM payments WHERE gateway_payment_id = ? OR id = ?",
                gatewayPaymentId, gatewayPaymentId
        );
        if (existing.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Payment transaction record not found.");
        }

        String paymentId = String.valueOf(existing.get(0).get("id"));
        Long userId = ((Number) existing.get(0).get("user_id")).longValue();
        long amountPaise = ((Number) existing.get(0).get("amount_paise")).longValue();
        String dbStatus = String.valueOf(existing.get(0).get("status"));

        if ("SUCCESS".equals(dbStatus)) {
            return Map.of("message", "Duplicate event ignored.", "paymentStatus", "SUCCESS");
        }

        if ("SUCCESS".equals(status)) {
            activateSuccessfulSubscription(paymentId, userId, planId, amountPaise, gatewayPaymentId, gatewayOrderId, "mock_" + UUID.randomUUID().toString().substring(0, 8));
        } else {
            jdbc.update(
                    "UPDATE payments SET status = ?, paid_at = NOW() WHERE id = ?",
                    status, paymentId
            );
        }
        return Map.of("message", "Mock webhook processed.", "paymentStatus", status);
    }

    private synchronized void activateSuccessfulSubscription(
            String paymentId, Long userId, String planId, long amountPaise,
            String gatewayPaymentId, String gatewayOrderId, String eventId) {

        List<Map<String, Object>> existing = jdbc.queryForList(
                "SELECT status, receipt_email_sent FROM payments WHERE id = ?", paymentId
        );
        if (existing.isEmpty()) return;

        String dbStatus = String.valueOf(existing.get(0).get("status"));
        if ("SUCCESS".equalsIgnoreCase(dbStatus)) {
            return;
        }

        int durationDays = planId.contains("UNIVERSITY") || planId.contains("ENTERPRISE") ? 365 : 30;
        String subId = "SUB_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);

        jdbc.update(
                "UPDATE payments SET status = 'SUCCESS', gateway_payment_id = COALESCE(?, gateway_payment_id), gateway_event_id = COALESCE(?, gateway_event_id), paid_at = NOW() WHERE id = ?",
                gatewayPaymentId, eventId, paymentId
        );

        jdbc.update("UPDATE subscriptions SET status = 'REVOKED' WHERE user_id = ? AND status = 'ACTIVE'", userId);

        jdbc.update(
                "INSERT INTO subscriptions (id, user_id, plan_id, status, start_date, end_date, auto_renew) VALUES (?, ?, ?, 'ACTIVE', NOW(), DATE_ADD(NOW(), INTERVAL ? DAY), TRUE)",
                subId, userId, planId, durationDays
        );

        jdbc.update("UPDATE payments SET subscription_id = ? WHERE id = ?", subId, paymentId);

        try {
            restTemplate.postForObject(
                    "http://access-service/api/access/subscribe",
                    Map.of("userId", userId, "plan", planId, "durationDays", durationDays),
                    Map.class
            );
        } catch (Exception e) {
            System.err.println("Access Service sync failed: " + e.getMessage());
        }

        Integer emailSent = jdbc.queryForObject(
                "SELECT COUNT(*) FROM payments WHERE id = ? AND receipt_email_sent = TRUE",
                Integer.class, paymentId
        );
        if (emailSent == null || emailSent == 0) {
            sendPaymentSuccessEmail(paymentId, userId, planId, amountPaise, gatewayPaymentId, gatewayOrderId, durationDays);
        }
    }

    @GetMapping("/payments")
    public List<Map<String, Object>> getPaymentHistory(HttpServletRequest request) {
        Long userId = getUserIdHeader(request);
        if (userId == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }
        return jdbc.queryForList("SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC", userId);
    }

    @PostMapping("/cancel")
    public Map<String, Object> cancelSubscription(HttpServletRequest request) {
        Long userId = getUserIdHeader(request);
        if (userId == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }

        int updated = jdbc.update(
                "UPDATE subscriptions SET auto_renew = FALSE, status = 'CANCELLED' WHERE user_id = ? AND status = 'ACTIVE'", 
                userId
        );

        if (updated == 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "No active subscription found to cancel.");
        }

        return Map.of("message", "Subscription auto-renew cancelled successfully.");
    }

    private Long getUserIdHeader(HttpServletRequest request) {
        String header = request.getHeader("X-User-Id");
        if (header == null || header.isBlank()) return null;
        try {
            return Long.parseLong(header);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Map<String, Object> getUserDetails(Long userId) {
        try {
            List<Map<String, Object>> users = jdbc.queryForList(
                    "SELECT name, email FROM zyndex_auth.users WHERE id = ?", userId
            );
            if (!users.isEmpty()) {
                return users.get(0);
            }
        } catch (Exception e) {
            System.err.println("Failed to fetch user details from auth db: " + e.getMessage());
        }
        return Map.of("name", "Valued Customer", "email", "support@scholarsphere.com");
    }

    private void sendPaymentSuccessEmail(String paymentId, Long userId, String planId, long amountPaise, String gatewayPaymentId, String gatewayOrderId, int durationDays) {
        Map<String, Object> user = getUserDetails(userId);
        String name = String.valueOf(user.get("name"));
        String email = String.valueOf(user.get("email"));

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailFrom != null && !mailFrom.isBlank() ? mailFrom : "support@scholarsphere.com");
            message.setTo(email);
            message.setSubject("Zyndex Subscription Payment Confirmation");

            double amountRupees = amountPaise / 100.0;
            java.time.LocalDate startDate = java.time.LocalDate.now();
            java.time.LocalDate endDate = startDate.plusDays(durationDays);
            String billingPeriod = durationDays > 30 ? "Annual (365 Days)" : "Monthly (30 Days)";

            String content = String.format(
                    "Hello %s,\n\n" +
                    "Your subscription payment has been processed and verified successfully.\n\n" +
                    "=== PAYMENT RECEIPT ===\n" +
                    "Customer Name: %s\n" +
                    "Customer Email: %s\n" +
                    "Subscription Plan: %s\n" +
                    "Amount Paid: ₹%.2f\n" +
                    "Currency: INR\n" +
                    "Payment ID: %s\n" +
                    "Order ID: %s\n" +
                    "Transaction Date: %s\n" +
                    "Start Date: %s\n" +
                    "Expiry Date: %s\n" +
                    "Billing Period: %s\n" +
                    "Auto-Renew: Active (True)\n\n" +
                    "Your premium digital library access has been activated immediately.\n\n" +
                    "Thank you for choosing Zyndex!\n\n" +
                    "Best regards,\n" +
                    "Zyndex • A ScholarSphere Digital Company",
                    name, name, email, planId.replace("_", " "), amountRupees,
                    (gatewayPaymentId != null ? gatewayPaymentId : paymentId),
                    (gatewayOrderId != null ? gatewayOrderId : "N/A"),
                    java.time.LocalDateTime.now(), startDate, endDate, billingPeriod
            );

            message.setText(content);
            mailSender.send(message);
            jdbc.update("UPDATE payments SET receipt_email_sent = TRUE WHERE id = ?", paymentId);
            System.out.println("Payment confirmation email sent successfully to: " + email);
        } catch (Exception e) {
            System.err.println("Failed to send payment confirmation email: " + e.getMessage());
        }
    }

    private boolean verifyRazorpaySignature(String payload, String signature, String secret) {
        try {
            javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
            javax.crypto.spec.SecretKeySpec secretKey = new javax.crypto.spec.SecretKeySpec(secret.getBytes(), "HmacSHA256");
            mac.init(secretKey);
            byte[] hash = mac.doFinal(payload.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString().equalsIgnoreCase(signature);
        } catch (Exception e) {
            return false;
        }
    }
}
