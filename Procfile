web: python manage.py migrate && python manage.py collectstatic --no-input && gunicorn conf.wsgi:application --bind 0.0.0.0:${PORT:-8080}
