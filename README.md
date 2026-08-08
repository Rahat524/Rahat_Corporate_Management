# Rahat Corporate Finance Management — Online Edition

This folder is ready for GitHub and Render deployment.

## Included
- Flask application (`app.py`)
- Frontend (`index.html`, `static/`)
- Initial database and seed files (`data/`)
- Render deployment configuration (`render.yaml`, `Procfile`)

## Deploy on Render
1. Upload every file and folder in this directory to a private GitHub repository.
2. In Render, choose **New > Blueprint** and connect the repository.
3. Render will read `render.yaml` and create the web service.
4. Open the generated `.onrender.com` URL.

## Login
Use the same administrator login configured in the application.

## Important data note
The free Render filesystem is temporary. Download a database backup after important work. For permanent multi-device use, attach persistent storage or migrate the database to PostgreSQL.

## Do not upload
- `.venv/`
- `__pycache__/`
- old ZIP files
- local temporary files
