#!/bin/bash
set -e

echo "=> Running database migrations..."
cd backend
python manage.py migrate --noinput

echo "=> Starting Gunicorn server..."
exec gunicorn backend.wsgi:application --bind 0.0.0.0:$PORT --workers 3
