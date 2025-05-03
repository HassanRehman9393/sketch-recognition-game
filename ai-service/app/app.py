from flask import Flask
from flask_cors import CORS
import logging

from app.routes.recognition_routes import register_routes as register_recognition_routes
from app.routes.debug_routes import register_routes as register_debug_routes

def create_app():
    """Create and configure the Flask app"""
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Create Flask app
    app = Flask(__name__)
    CORS(app)
    
    # Register routes
    register_recognition_routes(app)
    register_debug_routes(app)
    
    # Add a health check route
    @app.route('/health', methods=['GET'])
    def health_check():
        return {'status': 'ok'}, 200
    
    return app
