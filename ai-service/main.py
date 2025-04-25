#!/usr/bin/env python
"""
Sketch Recognition AI Service - Main Entry Point
"""
import os
import argparse
import logging
import sys
from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS
from pathlib import Path

# Load environment variables from .env file if present
load_dotenv()

# Configure logging - adjust level based on environment
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Suppress TensorFlow logging - significantly reduces terminal noise
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # 0=all, 1=info, 2=warning, 3=error

# Suppress deprecation warnings
import warnings
warnings.filterwarnings('ignore', category=DeprecationWarning)
warnings.filterwarnings('ignore', category=FutureWarning)

logger = logging.getLogger('ai_service')

def create_app():
    """Create and configure the Flask application"""
    app = Flask(__name__)
    
    # Enable CORS
    CORS(app)
    
    # Import and register blueprints
    from app.routes.recognition_routes import recognition_bp
    app.register_blueprint(recognition_bp, url_prefix='/api')
    
    # Root endpoint for health check
    @app.route('/', methods=['GET'])
    def health_check():
        return jsonify({
            "status": "ok",
            "service": "sketch-recognition-ai-service"
        })
        
    return app

def main():
    """Main entry point for the AI service"""
    # Load environment variables from .env file
    if os.path.exists('.env'):
        load_dotenv()
        print("Loaded environment variables from .env file")
    
    # Parse command-line arguments
    parser = argparse.ArgumentParser(description='Start the sketch recognition AI service')
    parser.add_argument('--host', type=str, default='0.0.0.0', help='Host address to bind')
    parser.add_argument('--port', type=int, default=5002, help='Port to listen on')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    parser.add_argument('--quiet', action='store_true', help='Reduce output verbosity')
    args = parser.parse_args()
    
    # Adjust logging based on arguments
    if args.quiet:
        logging.getLogger().setLevel(logging.WARNING)
        # Suppress Flask development server logs
        logging.getLogger('werkzeug').setLevel(logging.ERROR)
    
    try:
        app = create_app()
        
        # Print available routes
        logger.info("Available routes:")
        for rule in sorted(app.url_map.iter_rules(), key=lambda x: x.endpoint):
            methods = ','.join(sorted(rule.methods - {'HEAD', 'OPTIONS'}))
            logger.info(f"  {rule.endpoint:<26} {methods:<20} {rule.rule}")
        
        # Log service start information
        logger.info(f"Starting AI service on {args.host}:{args.port}")
        
        # Run the Flask app
        app.run(host=args.host, port=args.port, debug=args.debug, use_reloader=args.debug)
        
    except ImportError as e:
        logger.error(f"Error importing application: {e}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Error starting application: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
