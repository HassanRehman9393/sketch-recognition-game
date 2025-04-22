from flask import Blueprint, request, jsonify, current_app
import time
import logging
import json
import traceback

from app.services.recognition import get_recognition_service

# Configure logging
logger = logging.getLogger('recognition_routes')

# Create blueprint
recognition_bp = Blueprint('recognition', __name__, url_prefix='/api')

@recognition_bp.route('/recognize', methods=['POST'])
def recognize_sketch():
    """
    Recognize a sketch from canvas data
    
    Accepts:
        - JSON object with 'image_data' (base64 encoded image)
        - JSON object with 'strokes' (array of stroke points)
    
    Returns:
        JSON with recognition results and confidence scores
    """
    try:
        if not request.json:
            return jsonify({
                'success': False,
                'error': 'Invalid request: no JSON data'
            }), 400
            
        sketch_data = request.json
        
        # Check for required fields
        if not ('image_data' in sketch_data or 'strokes' in sketch_data):
            return jsonify({
                'success': False,
                'error': 'Invalid request: missing image_data or strokes'
            }), 400
        
        # Get recognition service
        recognition_service = get_recognition_service()
        
        # Check if model is loaded
        model_info = recognition_service.get_model_info()
        if model_info['status'] != 'loaded':
            return jsonify({
                'success': False,
                'error': 'Model not loaded, please try again later',
                'model_status': model_info['status']
            }), 503
        
        # Run recognition
        start_time = time.time()
        result = recognition_service.predict(sketch_data)
        processing_time = time.time() - start_time
        
        # Add processing time
        result['processing_time'] = processing_time
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in recognition endpoint: {str(e)}")
        logger.error(traceback.format_exc())
        
        return jsonify({
            'success': False,
            'error': f"Recognition failed: {str(e)}",
            'timestamp': time.time()
        }), 500

@recognition_bp.route('/status', methods=['GET'])
def recognition_status():
    """
    Get the status of the recognition service
    
    Returns:
        JSON with service status and model information
    """
    try:
        # Get recognition service
        recognition_service = get_recognition_service()
        
        # Get model info
        model_info = recognition_service.get_model_info()
        
        return jsonify({
            'success': True,
            'status': 'ready' if model_info['status'] == 'loaded' else 'initializing',
            'model_info': model_info,
            'timestamp': time.time()
        })
        
    except Exception as e:
        logger.error(f"Error in status endpoint: {str(e)}")
        
        return jsonify({
            'success': False,
            'status': 'error',
            'error': str(e),
            'timestamp': time.time()
        }), 500

def register_routes(app):
    """
    Register the blueprint with the Flask app
    
    Args:
        app: Flask app instance
    """
    app.register_blueprint(recognition_bp)
