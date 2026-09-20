package com.zyndex.auth;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
class AccountEmailService {
    private final JavaMailSender mailSender;
    private final AppProperties properties;

    AccountEmailService(JavaMailSender mailSender, AppProperties properties) {
        this.mailSender = mailSender;
        this.properties = properties;
    }

    void sendSignupConfirmationEmail(String name, String email) {
        if (properties.otpMailFrom() == null || properties.otpMailFrom().isBlank()) {
            // If email is not configured, we don't crash, we just return so users can still sign up locally!
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
            helper.setFrom(properties.otpMailFrom());
            helper.setTo(email);
            helper.setSubject("Welcome to Zyndex");
            helper.setText(signupConfirmationText(name), signupConfirmationHtml(name));
            mailSender.send(message);
        } catch (Exception error) {
            // Log error and proceed so developer setup does not block signup
            System.err.println("Failed to send signup confirmation email: " + error.getMessage());
        }
    }

    private String signupConfirmationText(String name) {
        return """
                Dear %s,

                Welcome to Zyndex!

                We're delighted to inform you that your account has been created successfully. You can now log in using your registered email address and password to access our Educational Resource Library.

                If you have any questions or need assistance, please feel free to reach out to our support team through the Contact Us page - we're always here to help.

                We're excited to have you on board and wish you a rewarding and enriching learning experience with Zyndex!

                Best regards,
                Team Zyndex
                """.formatted(name);
    }

    private String signupConfirmationHtml(String name) {
        return """
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #172033;">
                  <p>Dear %s,</p>
                  <p>Welcome to <strong>Zyndex</strong>!</p>
                  <p>We're delighted to inform you that your account has been created successfully. You can now log in using your registered email address and password to access our <strong>Educational Resource Library</strong>.</p>
                  <p>If you have any questions or need assistance, please feel free to reach out to our support team through the <strong>Contact Us</strong> page - we're always here to help.</p>
                  <p>We're excited to have you on board and wish you a rewarding and enriching learning experience with Zyndex!</p>
                  <p>Best regards,<br/><strong>Team Zyndex</strong></p>
                </div>
                """.formatted(escapeHtml(name));
    }

    void sendSubscriptionConfirmationEmail(String name, String email, String plan, double amount, int durationDays) {
        if (properties.otpMailFrom() == null || properties.otpMailFrom().isBlank()) {
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
            helper.setFrom(properties.otpMailFrom());
            helper.setTo(email);
            helper.setSubject("ScholarSphere Subscription Activated - " + plan);
            
            String text = """
                    Dear %s,

                    Thank you for your payment of INR %.2f.

                    Your ScholarSphere subscription plan "%s" has been successfully activated for %d days.
                    
                    Lifespan Details:
                    Plan: %s
                    Duration: %d Days
                    Amount Charged: INR %.2f
                    Status: ACTIVE
                    
                    You now have full access matching your plan tier!

                    Best regards,
                    ScholarSphere Team
                    """.formatted(name, amount, plan, durationDays, plan, durationDays, amount);

            String html = """
                    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #172033; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                      <h2 style="color: #ea580c; border-bottom: 2px solid #ea580c; padding-bottom: 10px;">ScholarSphere Payment Receipt</h2>
                      <p>Dear %s,</p>
                      <p>Thank you for subscribing to ScholarSphere. Your subscription plan is now active!</p>
                      <table style="width: 100%%; border-collapse: collapse; margin: 20px 0;">
                        <tr style="background-color: #f8fafc;"><td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">Plan Name</td><td style="padding: 10px; border: 1px solid #e2e8f0;">%s</td></tr>
                        <tr><td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">Amount Paid</td><td style="padding: 10px; border: 1px solid #e2e8f0; color: #ea580c; font-weight: bold;">INR %.2f</td></tr>
                        <tr style="background-color: #f8fafc;"><td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">Lifespan / Validity</td><td style="padding: 10px; border: 1px solid #e2e8f0;">%d Days</td></tr>
                        <tr><td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">Status</td><td style="padding: 10px; border: 1px solid #e2e8f0; color: #16a34a; font-weight: bold;">ACTIVE</td></tr>
                      </table>
                      <p>Access control rules are successfully applied. You can now download and view content corresponding to your plan.</p>
                      <p>Best regards,<br/><strong>ScholarSphere Team</strong></p>
                    </div>
                    """.formatted(escapeHtml(name), escapeHtml(plan), amount, durationDays);

            helper.setText(text, html);
            mailSender.send(message);
        } catch (Exception error) {
            System.err.println("Failed to send subscription confirmation email: " + error.getMessage());
        }
    }

    private String escapeHtml(String value) {
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
