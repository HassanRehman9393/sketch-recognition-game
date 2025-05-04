from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import json
import random
import time
import os
import logging
from pathlib import Path
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('ai_service')

# Create necessary directories
def create_app_directories():
    # Define base paths
    base_dir = Path(__file__).parent.parent
    
    # Create dataset directories
    datasets_dir = base_dir / "data"  # Changed from app/datasets to data
    raw_dir = datasets_dir / "raw"
    processed_dir = datasets_dir / "processed"
    backup_dir = raw_dir / "backup"
    
    # Create directories if they don't exist
    for directory in [datasets_dir, raw_dir, processed_dir, backup_dir]:
        directory.mkdir(parents=True, exist_ok=True)
    
    # Create models directory 
    models_dir = base_dir / "models" / "quickdraw"  # Changed from app/models to models
    models_dir.mkdir(parents=True, exist_ok=True)
    
    return {
        'datasets_dir': str(datasets_dir),
        'raw_dir': str(raw_dir),
        'processed_dir': str(processed_dir),
        'backup_dir': str(backup_dir),
        'models_dir': str(models_dir)
    }

# Create directories when module is imported
app_directories = create_app_directories()

def create_app(test_config=None):
    """Create and configure the Flask application"""
    app = Flask(__name__, static_url_path='/static', static_folder='static')
    
    # Enable CORS for all routes and origins
    CORS(app)
    
    # Configure app
    app.config.from_mapping(
        SECRET_KEY=os.environ.get('SECRET_KEY', 'dev_key_replace_in_production'),
        MODELS_DIR=app_directories['models_dir'],
        MAX_CONTENT_LENGTH=2 * 1024 * 1024,  # Limit request size to 2MB
    )
    
    # Import recognition service
    try:
        # Changed from app.services to app.core
        from app.core.recognition import get_recognition_service
        
        # Initialize the recognition service
        logger.info("Initializing recognition service...")
        recognition_service = get_recognition_service(model_dir=app_directories['models_dir'])
        model_info = recognition_service.get_model_info()
        if model_info['status'] == 'loaded':
            logger.info(f"Recognition service initialized successfully with {len(recognition_service.class_names)} classes")
        else:
            logger.warning("Recognition service initialized but model not loaded")
    except Exception as e:
        logger.error(f"Error initializing recognition service: {str(e)}")
    
    # Register routes from the routes package
    try:
        # Changed from app.routes to app.api
        from app.api import register_routes
        register_routes(app)
    except Exception as e:
        logger.error(f"Error starting application: {str(e)}")
        
        # Set up minimal routes on failure
        @app.route('/')
        def index():
            return jsonify({
                'message': 'Sketch Recognition AI Service',
                'status': 'error',
                'error': str(e)
            })
    
    # Define root endpoint for basic health check if not registered
    if app.view_functions.get('index') is None:
        @app.route('/')
        def index():
            return jsonify({
                'message': 'Sketch Recognition AI Service is running',
                'status': 'online',
                'version': '1.0.0',
                'timestamp': time.time(),
                'endpoints': {
                    '/api/recognize': 'Main recognition endpoint (POST)',
                    '/api/status': 'Service status and health check',
                    '/upload-test': 'Test page for image uploads'
                }
            })
    
    # Add a route to serve the upload test page
    @app.route('/upload-test')
    def upload_test():
        return app.send_static_file('upload.html')
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Not found', 'status_code': 404}), 404
    
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({'error': 'Bad request', 'status_code': 400}), 400
    
    @app.errorhandler(500)
    def server_error(e):
        logger.error(f"Server error: {str(e)}")
        return jsonify({'error': 'Internal server error', 'status_code': 500}), 500
    
    @app.errorhandler(413)
    def request_entity_too_large(e):
        return jsonify({'error': 'Request entity too large (max 2MB)', 'status_code': 413}), 413
    
    return app

# This file ensures the app directory is treated as a Python package
