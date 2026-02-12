"""Logging configuration for the application"""
import logging
import sys
from app.core.config import settings

# Create logger
logger = logging.getLogger("echoai")

# Set log level
log_level = logging.DEBUG if settings.DEBUG else logging.INFO
logger.setLevel(log_level)

# Create console handler
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setLevel(log_level)

# Create formatter
formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
console_handler.setFormatter(formatter)

# Add handler to logger
logger.addHandler(console_handler)


def get_logger(name: str) -> logging.Logger:
    """Get a logger instance with the given name"""
    return logging.getLogger(f"echoai.{name}")
