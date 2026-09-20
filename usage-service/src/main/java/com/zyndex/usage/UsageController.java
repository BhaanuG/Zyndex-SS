package com.zyndex.usage;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/usage")
public class UsageController {

    private final JdbcTemplate jdbc;

    public UsageController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @PostMapping("/events")
    public Map<String, Object> logEvent(@RequestBody Map<String, Object> body) {
        Long userId = getLong(body.get("userId"));
        Long resourceId = getLong(body.get("resourceId"));
        String eventType = String.valueOf(body.getOrDefault("eventType", "VIEW")).toUpperCase();

        if (userId == null || resourceId == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "userId and resourceId are required.");
        }

        if ("DOWNLOAD".equals(eventType)) {
            jdbc.update("INSERT INTO downloads (resource_id, user_id, downloaded_at) VALUES (?, ?, NOW())", resourceId, userId);
        } else {
            jdbc.update("INSERT INTO resource_views (resource_id, user_id, viewed_at) VALUES (?, ?, NOW())", resourceId, userId);
        }

        return Map.of("message", "Usage event logged successfully.");
    }

    @GetMapping("/downloads/user/{userId}")
    public Map<String, Object> getUserDownloads(
            @PathVariable("userId") long userId,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "10") int size) {
        int offset = page * size;
        var rows = jdbc.queryForList("""
                SELECT resource_id, downloaded_at
                FROM downloads WHERE user_id = ? ORDER BY downloaded_at DESC LIMIT ? OFFSET ?
                """, userId, size, offset);
        long total = jdbc.queryForObject("SELECT COUNT(*) FROM downloads WHERE user_id = ?", Long.class, userId);

        return Map.of("resources", rows, "totalElements", total);
    }

    @GetMapping("/views/user/{userId}")
    public Map<String, Object> getUserViews(
            @PathVariable("userId") long userId,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "10") int size) {
        int offset = page * size;
        var rows = jdbc.queryForList("""
                SELECT resource_id, viewed_at
                FROM resource_views WHERE user_id = ? ORDER BY viewed_at DESC LIMIT ? OFFSET ?
                """, userId, size, offset);
        long total = jdbc.queryForObject("SELECT COUNT(*) FROM resource_views WHERE user_id = ?", Long.class, userId);

        return Map.of("resources", rows, "totalElements", total);
    }

    @GetMapping("/views/count")
    public long getViewCount(@RequestParam("resourceId") long resourceId) {
        Long count = jdbc.queryForObject("SELECT COUNT(*) FROM resource_views WHERE resource_id = ?", Long.class, resourceId);
        return count != null ? count : 0;
    }

    @GetMapping("/stats/user/{userId}")
    public Map<String, Object> getUserStats(@PathVariable("userId") long userId) {
        long downloads = jdbc.queryForObject("SELECT COUNT(*) FROM downloads WHERE user_id = ?", Long.class, userId);
        long views = jdbc.queryForObject("SELECT COUNT(*) FROM resource_views WHERE user_id = ?", Long.class, userId);
        return Map.of("downloads", downloads, "views", views);
    }

    @GetMapping("/views/user/{userId}/today")
    public Map<String, Object> getViewsToday(@PathVariable("userId") long userId) {
        List<Long> resourceIds = jdbc.queryForList("""
                SELECT DISTINCT resource_id 
                FROM resource_views 
                WHERE user_id = ? AND viewed_at >= CURRENT_DATE()
                """, Long.class, userId);
        return Map.of("count", resourceIds.size(), "resourceIds", resourceIds);
    }

    @GetMapping("/metrics")
    public Map<String, Object> getMetrics() {
        long totalDownloads = jdbc.queryForObject("SELECT COUNT(*) FROM downloads", Long.class);
        long totalViews = jdbc.queryForObject("SELECT COUNT(*) FROM resource_views", Long.class);
        List<Map<String, Object>> popularDownloads = jdbc.queryForList("""
                SELECT resource_id, COUNT(*) AS count
                FROM downloads GROUP BY resource_id ORDER BY count DESC LIMIT 10
                """);
        List<Map<String, Object>> popularViews = jdbc.queryForList("""
                SELECT resource_id, COUNT(*) AS count
                FROM resource_views GROUP BY resource_id ORDER BY count DESC LIMIT 10
                """);

        Map<String, Object> metrics = new HashMap<>();
        metrics.put("totalDownloads", totalDownloads);
        metrics.put("totalViews", totalViews);
        metrics.put("popularDownloads", popularDownloads);
        metrics.put("popularViews", popularViews);
        return metrics;
    }

    @PostMapping("/records")
    public Map<String, Object> logDuration(@RequestBody Map<String, Object> body) {
        Long userId = getLong(body.get("userId"));
        Long contentId = getLong(body.get("contentId"));
        if (contentId == null) {
            contentId = getLong(body.get("resourceId"));
        }
        Integer duration = body.get("duration") != null ? Integer.parseInt(String.valueOf(body.get("duration"))) : 0;

        if (userId == null || contentId == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "userId and contentId are required.");
        }

        jdbc.update("INSERT INTO usages (user_id, content_id, duration) VALUES (?, ?, ?)", userId, contentId, duration);
        return Map.of("message", "Reading duration logged successfully.");
    }

    @GetMapping("/records/user/{userId}")
    public List<Map<String, Object>> getUserRecords(@PathVariable("userId") long userId) {
        return jdbc.queryForList("SELECT usage_id, user_id, content_id, duration, created_at FROM usages WHERE user_id = ? ORDER BY created_at DESC", userId);
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
