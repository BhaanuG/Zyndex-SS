package com.zyndex.access;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/access")
public class AccessController {

    private final JdbcTemplate jdbc;
    private final RestTemplate restTemplate;

    public AccessController(JdbcTemplate jdbc, RestTemplate restTemplate) {
        this.jdbc = jdbc;
        this.restTemplate = restTemplate;
    }

    @GetMapping("/check")
    public Map<String, Object> check(
            @RequestParam(name = "userId", required = false) Long userId,
            @RequestParam(name = "resourceId", required = false) Long resourceId,
            @RequestParam(name = "permission", required = false, defaultValue = "READ") String permission,
            @RequestParam(name = "role", required = false) String role,
            @RequestParam(name = "category", required = false, defaultValue = "") String category,
            @RequestParam(name = "type", required = false, defaultValue = "") String type) {

        if (userId == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "userId is required.");
        }

        // If user is admin, they are automatically authorized
        if ("admin".equalsIgnoreCase(role)) {
            return Map.of("authorized", true);
        }

        // 1. Check if there is an active matching direct entitlement for this resource
        if (resourceId != null && resourceId > 0) {
            String directSql = """
                    SELECT COUNT(*) FROM access_entitlements
                    WHERE user_id = ?
                      AND resource_id = ?
                      AND (LOWER(permission) = LOWER(?) OR LOWER(permission) = 'all')
                      AND status = 'ACTIVE'
                      AND (expires_at IS NULL OR expires_at > NOW())
                    """;
            Integer directCount = jdbc.queryForObject(directSql, Integer.class, userId, resourceId, permission);
            if (directCount != null && directCount > 0) {
                return Map.of("authorized", true);
            }
        }

        // 2. Query user's current active global plan entitlement (permission stores plan name)
        String planSql = """
                SELECT permission FROM access_entitlements
                WHERE user_id = ?
                  AND (resource_id IS NULL OR resource_id = 0)
                  AND status = 'ACTIVE'
                  AND (expires_at IS NULL OR expires_at > NOW())
                ORDER BY id DESC LIMIT 1
                """;
        List<String> plans = jdbc.queryForList(planSql, String.class, userId);
        String activePlan = plans.isEmpty() ? "FREE" : plans.get(0).toUpperCase();

        // 3. Evaluate plan-based gating rules
        boolean isDownload = "DOWNLOAD".equalsIgnoreCase(permission);

        if ("FREE".equals(activePlan) || "FREE / DEMO".equals(activePlan)) {
            if (isDownload) {
                return Map.of("authorized", false, "reason", "Downloads are not available on the Free/Demo plan. Please upgrade to a paid plan.");
            }
            boolean isPublic = "Public".equalsIgnoreCase(category) || "Demo".equalsIgnoreCase(category) || "Public".equalsIgnoreCase(type) || "Demo".equalsIgnoreCase(type);
            if (isPublic) {
                int limit = System.getenv("FREE_DAILY_READ_LIMIT") != null 
                        ? Integer.parseInt(System.getenv("FREE_DAILY_READ_LIMIT")) 
                        : 5;
                try {
                    Map<?, ?> usageStats = restTemplate.getForObject("http://usage-service/api/usage/views/user/" + userId + "/today", Map.class);
                    if (usageStats != null) {
                        int todayCount = ((Number) usageStats.get("count")).intValue();
                        List<?> viewedResourceIds = (List<?>) usageStats.get("resourceIds");
                        
                        boolean alreadyViewed = false;
                        if (resourceId != null && viewedResourceIds != null) {
                            for (Object idObj : viewedResourceIds) {
                                if (idObj != null && ((Number) idObj).longValue() == resourceId.longValue()) {
                                    alreadyViewed = true;
                                    break;
                                }
                            }
                        }
                        
                        if (todayCount >= limit && !alreadyViewed) {
                            return Map.of("authorized", false, "reason", "Daily free reading limit reached (" + limit + " documents/day). Please upgrade your plan to continue reading new books.");
                        }
                    }
                } catch (Exception e) {
                    System.err.println("Failed to check daily limit from usage-service: " + e.getMessage());
                }
                return Map.of("authorized", true, "pageLimit", 10);
            } else {
                return Map.of("authorized", false, "reason", "This content requires a Student Basic or higher subscription plan.");
            }
        }

        if ("STUDENT_BASIC".equals(activePlan) || "STUDENT BASIC".equals(activePlan)) {
            if (isDownload) {
                return Map.of("authorized", false, "reason", "Downloads are not available on the Student Basic plan. Upgrade to PhD Scholar/Researcher to download.");
            }
            boolean isResearch = "Research".equalsIgnoreCase(category) || "Research Paper".equalsIgnoreCase(category) || "Preprint".equalsIgnoreCase(category) ||
                                 "Research".equalsIgnoreCase(type) || "Research Paper".equalsIgnoreCase(type) || "Preprint".equalsIgnoreCase(type);
            if (isResearch) {
                return Map.of("authorized", false, "reason", "Research documents are not available on the Student Basic plan. Upgrade to Student Plus.");
            }
            return Map.of("authorized", true);
        }

        if ("STUDENT_PLUS".equals(activePlan) || "STUDENT PLUS".equals(activePlan)) {
            if (isDownload) {
                return Map.of("authorized", false, "reason", "Downloads are not available on the Student Plus plan. Upgrade to PhD Scholar/Researcher to download.");
            }
            return Map.of("authorized", true);
        }

        // Researcher Pro, University, Enterprise/Institution all have full access
        return Map.of("authorized", true);
    }

    @PostMapping("/subscribe")
    public Map<String, Object> subscribe(@RequestBody Map<String, Object> body) {
        Long userId = getLong(body.get("userId"));
        String plan = String.valueOf(body.getOrDefault("plan", "FREE")).toUpperCase();
        Integer durationDays = body.get("durationDays") != null ? Integer.parseInt(String.valueOf(body.get("durationDays"))) : 30;

        if (userId == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "userId is required.");
        }

        // Revoke any previous active global plan entitlements for this user
        jdbc.update("UPDATE access_entitlements SET status = 'REVOKED' WHERE user_id = ? AND (resource_id IS NULL OR resource_id = 0)", userId);

        // Grant new plan entitlement
        jdbc.update("INSERT INTO access_entitlements (user_id, resource_id, permission, status, expires_at) VALUES (?, 0, ?, 'ACTIVE', DATE_ADD(NOW(), INTERVAL ? DAY))",
                userId, plan, durationDays);

        // Notify user via email
        try {
            Map<String, Object> userProfile = restTemplate.getForObject("http://auth-service/api/users/" + userId + "/profile", Map.class);
            if (userProfile != null) {
                String name = String.valueOf(userProfile.get("name"));
                String email = String.valueOf(userProfile.get("email"));
                
                double amount = 0.0;
                if (plan.contains("STUDENT_BASIC") || plan.contains("STUDENT BASIC")) {
                    amount = 99.0;
                } else if (plan.contains("STUDENT_PLUS") || plan.contains("STUDENT PLUS")) {
                    amount = 199.0;
                } else if (plan.contains("RESEARCHER_PRO") || plan.contains("RESEARCHER PRO")) {
                    amount = 399.0;
                } else if (plan.contains("UNIVERSITY")) {
                    amount = 100000.0;
                } else if (plan.contains("ENTERPRISE")) {
                    amount = 300000.0;
                }

                Map<String, Object> emailRequest = Map.of(
                    "name", name,
                    "email", email,
                    "plan", plan.replace("_", " "),
                    "amount", amount,
                    "durationDays", durationDays
                );
                restTemplate.postForObject("http://auth-service/api/users/send-subscription-email", emailRequest, Map.class);
            }
        } catch (Exception e) {
            System.err.println("Failed to fetch user or send subscription email: " + e.getMessage());
        }

        return Map.of("message", "Subscribed to plan " + plan + " successfully.", "plan", plan, "durationDays", durationDays);
    }

    @PostMapping("/entitlements")
    public Map<String, Object> grant(HttpServletRequest request, @RequestBody Map<String, Object> body) {
        requireAdmin(request);

        Long userId = getLong(body.get("userId"));
        Long resourceId = getLong(body.get("resourceId"));
        String permission = String.valueOf(body.getOrDefault("permission", "READ")).toUpperCase();
        String expiresAt = body.containsKey("expiresAt") ? String.valueOf(body.get("expiresAt")) : null;

        if (userId == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "userId is required.");
        }

        if (expiresAt != null && !expiresAt.isBlank()) {
            jdbc.update("INSERT INTO access_entitlements (user_id, resource_id, permission, expires_at) VALUES (?, ?, ?, ?)",
                    userId, resourceId, permission, expiresAt);
        } else {
            jdbc.update("INSERT INTO access_entitlements (user_id, resource_id, permission) VALUES (?, ?, ?)",
                    userId, resourceId, permission);
        }

        return Map.of("message", "Entitlement granted successfully.");
    }

    @DeleteMapping("/entitlements/{id}")
    public Map<String, Object> revoke(HttpServletRequest request, @PathVariable("id") long id) {
        requireAdmin(request);

        int count = jdbc.update("UPDATE access_entitlements SET status = 'REVOKED' WHERE id = ?", id);
        if (count == 0) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Entitlement not found.");
        }
        return Map.of("message", "Entitlement revoked successfully.");
    }

    @GetMapping("/entitlements/user/{userId}")
    public List<Map<String, Object>> listUserEntitlements(@PathVariable("userId") long userId) {
        return jdbc.queryForList("SELECT * FROM access_entitlements WHERE user_id = ? ORDER BY created_at DESC", userId);
    }

    private void requireAdmin(HttpServletRequest request) {
        String role = request.getHeader("X-User-Role");
        if (!"admin".equalsIgnoreCase(role)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Admin access required.");
        }
    }

    private Long getLong(Object obj) {
        if (obj == null) return null;
        if (obj instanceof Number) return ((Number) obj).longValue();
        try {
            return Long.parseLong(String.valueOf(obj));
        } catch (Exception e) {
            return null;
        }
    }
}
