RAHAT CORPORATE MANAGEMENT - ONLINE CENTRAL DATABASE
=====================================================

1. All users open the same public web link and use one shared database.
2. Entries made by any authorized user are immediately available to all other authorized users.
3. Existing packaged data, users, password hashes and rights are copied to the persistent disk only on the first deployment.
4. Later code updates never overwrite the persistent database.
5. render.yaml includes a persistent disk at /var/data. Do not remove this disk or change DATABASE_PATH after going live.
6. Before every major update, download a database backup from Settings & Backup.
7. Keep the web service at one Gunicorn worker. Multiple threads are supported; multiple workers are intentionally avoided for SQLite consistency.
8. The public link works from office, home and mobile internet; the same Wi-Fi or IP is not required.

IMPORTANT: Render persistent disks require a paid web-service plan. The included Blueprint uses the Starter plan because a free ephemeral service can lose database files after restart/redeploy.
