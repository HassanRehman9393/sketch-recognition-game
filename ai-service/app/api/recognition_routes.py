import os
import io
import base64
import json
import logging
import traceback
import time
from pathlib import Path
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app, Response
from werkzeug.utils import secure_filename
import numpy as np
from PIL import Image, ImageOps

# Import recognition service
from app.core.recognition import get_recognition_service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('recognition_routes')

# Create blueprint
recognition_bp = Blueprint('recognition', __name__, url_prefix='/api')

# Allowed image file extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp'}

def allowed_file(filename):
    """Check if the file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@recognition_bp.route('/recognize', methods=['POST'])
def recognize():
    """
    Endpoint for sketch recognition
    
    Accepts:
    - JSON with 'image_data' (base64 encoded image)
    - JSON with 'strokes' (array of stroke data)
    - Multipart form with 'image' file
    
    Returns:
    - JSON with recognition results and confidence scores
    """
    try:
        # Get recognition service
        recognition_service = get_recognition_service()
        
        # Check if model is loaded
        if not recognition_service.model_loaded:
            logger.error("Model not loaded when attempting recognition")
            return jsonify({
                'success': False,
                'error': 'Model not loaded. Please try again later.',
                'timestamp': time.time()
            }), 503
        
        # Process request
        start_time = time.time()
        
        # Check if the request has JSON data
        if request.is_json:
            data = request.get_json()
            logger.debug(f"Received JSON request with keys: {list(data.keys())}")
            
            # Case 1: Base64 encoded image data
            if 'image_data' in data:
                result = recognition_service.predict({'image_data': data['image_data']})
                logger.info("Processed base64 image data successfully")
                
            # Case 2: Stroke data
            elif 'strokes' in data:
                result = recognition_service.predict({'strokes': data['strokes']})
                logger.info(f"Processed stroke data with {len(data['strokes'])} strokes")
                
            else:
                logger.warning("Invalid JSON payload")
                return jsonify({
                    'success': False,
                    'error': 'Invalid JSON data. Expected "image_data" or "strokes".',
                    'timestamp': time.time()
                }), 400
        
        # Check if the request has form data with file
        elif 'image' in request.files:
            file = request.files['image']
            logger.debug(f"Received file upload: {file.filename}")
            
            if file.filename == '':
                return jsonify({
                    'success': False,
                    'error': 'No selected file',
                    'timestamp': time.time()
                }), 400
            
            # Read and process the image
            try:
                img = Image.open(file.stream)
                logger.debug(f"Loaded image with size {img.size} and mode {img.mode}")
                result = recognition_service.predict(img)
                logger.info("Processed uploaded image successfully")
            except Exception as img_err:
                logger.error(f"Error processing image: {str(img_err)}")
                return jsonify({
                    'success': False,
                    'error': f"Error processing image: {str(img_err)}",
                    'timestamp': time.time()
                }), 400
        
        else:
            logger.warning("No valid input data in request")
            return jsonify({
                'success': False,
                'error': 'Invalid request. Send either JSON with image_data/strokes or an image file.',
                'timestamp': time.time()
            }), 400
        
        # Add processing time
        processing_time = time.time() - start_time
        result['processing_time_ms'] = round(processing_time * 1000, 2)
        result['timestamp'] = time.time()
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Error processing recognition request: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e),
            'detailed_error': traceback.format_exc() if os.getenv('DEBUG') == 'True' else None,
            'timestamp': time.time()
        }), 500

@recognition_bp.route('/recognize/debug', methods=['POST'])
def recognize_debug():
    """Debug endpoint with detailed preprocessing information"""
    try:
        # Get recognition service
        from app.core.recognition import get_recognition_service
        from app.utils.image_utils import enhanced_preprocess_image
        
        recognition_service = get_recognition_service()
        
        # Check if the request has form data with file
        if 'image' in request.files:
            file = request.files['image']
            
            if file.filename == '':
                return jsonify({
                    'success': False,
                    'error': 'No selected file'
                }), 400
            
            # Read the image
            img = Image.open(file.stream)
            
            # Get image info
            response = {
                'success': True,
                'image_size': img.size,
                'image_mode': img.mode
            }
            
            # Perform preprocessing with debug info
            preprocessed, debug_info = enhanced_preprocess_image(img, debug=True)
            
            # Add debug info to response
            response.update(debug_info)
            
            # Add basic processing measurements
            response['processed_shape'] = preprocessed.shape
            response['processed_min'] = float(preprocessed.min())
            response['processed_max'] = float(preprocessed.max())
            response['processed_mean'] = float(preprocessed.mean())
            
            # Perform recognition
            if recognition_service.model_loaded:
                result = recognition_service.predict(preprocessed)
                response['predictions'] = result.get('predictions', {})
            
            # Add image analysis features
            from app.utils.image_utils import analyze_image_content
            features = analyze_image_content(preprocessed[0, :, :, 0])
            response['features'] = features
            
            return jsonify(response)
            
        else:
            return jsonify({
                'success': False,
                'error': 'No image provided in request'
            }), 400
            
    except Exception as e:
        logger.error(f"Error in debug endpoint: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@recognition_bp.route('/status', methods=['GET'])
def status():
    """
    Endpoint to check the status of the recognition service
    
    Returns:
    - JSON with service status and model information
    """
    try:
        # Get recognition service
        recognition_service = get_recognition_service()
        model_info = recognition_service.get_model_info()
        
        # Build response
        response = {
            'success': True,
            'status': 'online',
            'model': model_info,
            'timestamp': time.time()
        }
        
        return jsonify(response)
    
    except Exception as e:
        logger.error(f"Error getting status: {str(e)}")
        return jsonify({
            'success': False,
            'status': 'error',
            'error': str(e),
            'timestamp': time.time()
        }), 500

@recognition_bp.route('/classes', methods=['GET'])
def get_classes():
    """
    Endpoint to get the list of classes supported by the model
    
    Returns:
    - JSON with list of supported classes
    """
    try:
        # Get recognition service
        recognition_service = get_recognition_service()
        
        # Get class names
        class_names = recognition_service.class_names
        
        return jsonify({
            'success': True,
            'classes': class_names,
            'count': len(class_names),
            'timestamp': time.time()
        })
    
    except Exception as e:
        logger.error(f"Error getting class list: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': time.time()
        }), 500

@recognition_bp.route('/debug-image', methods=['GET'])
def debug_image():
    """Return a test pattern image for debugging purposes"""
    try:
        # Create a test pattern with gradients and shapes
        width, height = 28, 28
        img = Image.new('L', (width, height), 255)
        draw = ImageOps.Draw(img)
        
        # Draw a square
        draw.rectangle([5, 5, 23, 23], outline=0)
        
        # Draw a circle
        draw.ellipse([8, 8, 20, 20], outline=0)
        
        # Draw diagonal line
        draw.line([0, 0, 27, 27], fill=0, width=1)
        
        # Convert to array and create a response
        img_io = io.BytesIO()
        img.save(img_io, 'PNG')
        img_io.seek(0)
        
        return Response(img_io.getvalue(), mimetype='image/png')
        
    except Exception as e:
        logger.error(f"Error generating debug image: {str(e)}")
        return jsonify({'error': str(e)}), 500

@recognition_bp.route('/models', methods=['GET'])
def list_models():
    """
    List available trained models
    
    Returns:
        JSON with list of available models
    """
    try:
        # Import model utility function
        from app.utils.model_utils import list_available_models
        
        # Define models directory
        base_dir = Path(__file__).parent.parent.parent
        models_dir = base_dir / "app" / "models" / "quickdraw"
        
        # Get list of available models
        models = list_available_models(models_dir)
        
        return jsonify({
            'success': True,
            'models': models,
            'count': len(models),
            'timestamp': time.time()
        })
        
    except Exception as e:
        logger.error(f"Error listing models: {str(e)}")
        
        return jsonify({
            'success': False,
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
