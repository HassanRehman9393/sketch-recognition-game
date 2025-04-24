"""
Configuration settings for the AI Service
"""
import os
from pathlib import Path

# Try to load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
    print("Loaded environment variables from .env file")
except ImportError:
    print("python-dotenv package not installed. Using default settings.")
    # You can install it with: pip install python-dotenv

# Base paths
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = os.getenv('DATA_DIR', 'data')
MODEL_DIR = os.getenv('MODEL_DIR', 'models/quickdraw')

# Derived paths
RAW_DATA_DIR = os.path.join(BASE_DIR, os.getenv('RAW_DATA_DIR', 'data/raw'))
PROCESSED_DATA_DIR = os.path.join(BASE_DIR, os.getenv('PROCESSED_DATA_DIR', 'data/processed'))
MODEL_PATH = os.getenv('MODEL_PATH', '')

# If MODEL_PATH is not fully specified, make it relative to MODEL_DIR
if MODEL_PATH and not os.path.isabs(MODEL_PATH) and not MODEL_PATH.startswith(MODEL_DIR):
    MODEL_PATH = os.path.join(BASE_DIR, MODEL_DIR, MODEL_PATH)

# API settings
PORT = int(os.getenv('PORT', 5002))
DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'
