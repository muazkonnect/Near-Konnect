The retry is failing because the project is configured to use `www.nearkonnect.com`, while the retry screen is checking the send path for `notify.www.nearkonnect.com`. The email subdomain itself is verified, and the backend is healthy, so this is most likely a project email configuration/path mismatch rather than DNS still being broken.

Plan:
1. Re-run the email infrastructure setup so the project’s email send path is reconciled with the verified domain.
2. Redeploy the email queue worker so the latest deployed backend function is available.
3. If auth emails are part of this setup, redeploy the auth email handler as well.
4. Verify recent email logs/queue status after setup to confirm sends are no longer blocked.

Expected result: the Cloud Emails retry should stop showing “Send path not ready,” and auth/app emails should be able to send once triggered.