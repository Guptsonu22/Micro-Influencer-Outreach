"""Production SMTP provider with TLS, timeout guards, and ambiguous outcome handling."""

import asyncio
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import smtplib
import socket
from typing import Optional
from backend.app.core.config import settings
from backend.app.core.logging import get_logger
from backend.app.services.email.base import BaseEmailProvider, EmailDeliveryResult

logger = get_logger("outreach.email.smtp")


class SMTPEmailProvider(BaseEmailProvider):
    """Dispatches real emails using a secure SMTP relay (e.g. Amazon SES, SendGrid, Mailgun)."""

    def __init__(self, timeout_seconds: int = 10):
        self.host = settings.SMTP_HOST
        self.port = settings.SMTP_PORT
        self.username = settings.SMTP_USERNAME
        self.password = settings.SMTP_PASSWORD
        self.from_email = settings.SMTP_FROM_EMAIL
        self.from_name = settings.SMTP_FROM_NAME
        self.timeout = timeout_seconds
        self.provider_name = f"SMTP ({self.host}:{self.port})"

    def _sync_send(
        self,
        to_email: str,
        subject: str,
        body_text: str,
        body_html: Optional[str] = None
    ) -> EmailDeliveryResult:
        """Executes synchronous SMTP handshake with defensive error handling."""
        if not self.host or not self.from_email:
            return EmailDeliveryResult(
                success=False,
                status="failed",
                provider_name=self.provider_name,
                error="SMTP host or sender email is not configured in server environment.",
                retryable=False
            )

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{self.from_name} <{self.from_email}>" if self.from_name else self.from_email
        msg["To"] = to_email

        # Attach text and optional HTML alternative
        part_text = MIMEText(body_text, "plain", "utf-8")
        msg.attach(part_text)
        if body_html:
            part_html = MIMEText(body_html, "html", "utf-8")
            msg.attach(part_html)

        server = None
        data_sent_started = False
        try:
            if self.port == 465:
                server = smtplib.SMTP_SSL(self.host, self.port, timeout=self.timeout)
            else:
                server = smtplib.SMTP(self.host, self.port, timeout=self.timeout)
                server.ehlo()
                if server.has_extn("STARTTLS"):
                    server.starttls()
                    server.ehlo()

            if self.username and self.password:
                server.login(self.username, self.password)

            data_sent_started = True
            send_response = server.sendmail(self.from_email, [to_email], msg.as_string())

            # smtplib.sendmail returns an empty dict on full success
            if isinstance(send_response, dict) and send_response:
                return EmailDeliveryResult(
                    success=False,
                    status="failed",
                    provider_name=self.provider_name,
                    error=f"Recipient rejected: {send_response}",
                    retryable=False
                )

            server_quit_code, server_quit_msg = server.quit()
            provider_resp = f"Code: {server_quit_code} Message: {server_quit_msg.decode('utf-8', errors='ignore')}"

            return EmailDeliveryResult(
                success=True,
                status="sent",
                provider_name=self.provider_name,
                provider_message_id=f"smtp_{abs(hash(to_email + subject))}",
                provider_response=provider_resp,
                error=None,
                is_ambiguous=False,
                retryable=False
            )

        except (socket.timeout, TimeoutError) as exc:
            logger.error("SMTP timeout encountered for %s: %s", to_email, str(exc))
            # If timeout occurred after DATA started, remote server might have received it.
            # Do NOT blindly resend. Flag as ambiguous.
            return EmailDeliveryResult(
                success=False,
                status="ambiguous",
                provider_name=self.provider_name,
                error=f"Network timeout occurred after message transmission started: {str(exc)}",
                is_ambiguous=True,
                retryable=False
            )

        except smtplib.SMTPAuthenticationError as exc:
            logger.error("SMTP authentication failed: %s", str(exc))
            return EmailDeliveryResult(
                success=False,
                status="failed",
                provider_name=self.provider_name,
                error=f"SMTP authentication failed: {str(exc)}",
                retryable=False
            )

        except (smtplib.SMTPException, OSError) as exc:
            logger.error("SMTP delivery failure for %s: %s", to_email, str(exc))
            status_val = "ambiguous" if data_sent_started else "failed"
            return EmailDeliveryResult(
                success=False,
                status=status_val,
                provider_name=self.provider_name,
                error=f"SMTP error ({type(exc).__name__}): {str(exc)}",
                is_ambiguous=(status_val == "ambiguous"),
                retryable=False
            )
        finally:
            if server:
                try:
                    server.close()
                except Exception:
                    pass

    async def send_email(
        self,
        to_email: str,
        subject: str,
        body_text: str,
        body_html: Optional[str] = None,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
    ) -> EmailDeliveryResult:
        """Asynchronously wraps synchronous SMTP operations."""
        return await asyncio.to_thread(
            self._sync_send,
            to_email,
            subject,
            body_text,
            body_html
        )
