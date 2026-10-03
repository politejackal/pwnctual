"""WSGI entry point for hosts that import `application` (PythonAnywhere, gunicorn wsgi:application)."""
from pwnctual.app import app as application  # noqa: F401
