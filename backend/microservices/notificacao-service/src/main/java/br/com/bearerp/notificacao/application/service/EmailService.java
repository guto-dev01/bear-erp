package br.com.bearerp.notificacao.application.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;

    @Value("${notificacao.remetente.nome:Bear ERP}")
    private String remetenteNome;

    @Value("${notificacao.remetente.email:noreply@bearerp.com.br}")
    private String remetenteEmail;

    @Async
    public void enviarEmail(String destinatario, String assunto, String templateName, Map<String, Object> variaveis) {
        try {
            Context context = new Context();
            context.setVariables(variaveis);
            String html = templateEngine.process(templateName, context);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(remetenteEmail, remetenteNome);
            helper.setTo(destinatario);
            helper.setSubject(assunto);
            helper.setText(html, true);

            mailSender.send(message);
            log.info("Email enviado para {} - assunto: {}", destinatario, assunto);
        } catch (MessagingException e) {
            log.error("Erro ao enviar email para {}: {}", destinatario, e.getMessage());
            throw new RuntimeException("Falha ao enviar email", e);
        } catch (Exception e) {
            log.error("Erro inesperado ao enviar email: {}", e.getMessage());
            throw new RuntimeException("Falha ao enviar email", e);
        }
    }

    public void enviarEmailSimples(String destinatario, String assunto, String corpo) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(remetenteEmail, remetenteNome);
            helper.setTo(destinatario);
            helper.setSubject(assunto);
            helper.setText(corpo, true);
            mailSender.send(message);
            log.info("Email simples enviado para {}", destinatario);
        } catch (Exception e) {
            log.error("Erro ao enviar email simples: {}", e.getMessage());
            throw new RuntimeException("Falha ao enviar email", e);
        }
    }
}
