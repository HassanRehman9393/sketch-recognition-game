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
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger('recognition_routes')

# Create blueprint
recognition_bp = Blueprint('recognition', __name__, url_prefix='/api')

# Allowed image file extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp'}

def allowed_file(filename):
    """Check if the file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@recognition_bp.route('/recognize', methods=['POST'])
def recognize_sketch():
    """
    Recognize a sketch from canvas data
    
    Accepts:
        - JSON object with 'image_data' (base64 encoded image)
        - JSON object with 'strokes' (array of stroke points)
        - Multipart form with 'image' file
    
    Returns:
        JSON with recognition results and confidence scores
    """
    try:
        start_time = time.time()
        logger.debug(f"New recognition request received: {request.content_type}")
        
        # Get recognition service instance
        recognition_service = get_recognition_service()
        
        # Check if model is loaded
        model_info = recognition_service.get_model_info()
        if model_info['status'] != 'loaded':
            return jsonify({
                'success': False,
                'error': 'Model not loaded, please try again later',
                'model_status': model_info['status'],
                'timestamp': time.time()
            }), 503
            
        logger.debug(f"Model is loaded with {model_info.get('num_classes', 0)} classes")
        
        # Handle file upload case
        if 'image' in request.files:
            file = request.files['image']
            logger.debug(f"Received file upload: {file.filename}")
            
            # Check if file is provided and valid
            if file.filename == '':
                logger.warning("Empty filename provided")
                return jsonify({
                    'success': False,
                    'error': 'No file selected',
                    'timestamp': time.time()
                }), 400
                
            if not allowed_file(file.filename):
                logger.warning(f"Invalid file extension: {file.filename}")
                return jsonify({
                    'success': False,
                    'error': f'Invalid file format. Allowed formats: {", ".join(ALLOWED_EXTENSIONS)}',
                    'timestamp': time.time()
                }), 400
                
            try:
                # Read and process the image
                img_bytes = file.read()
                img = Image.open(io.BytesIO(img_bytes))
                logger.debug(f"Image loaded from file upload: {img.size} {img.mode}")
                
                # Save a copy for debugging if needed
                debug_dir = Path(current_app.config.get('DEBUG_DIR', 'debug_images'))
                debug_dir.mkdir(exist_ok=True)
                debug_path = debug_dir / f"debug_upload_{time.time()}.png"
                img.save(debug_path)
                logger.debug(f"Debug image saved to {debug_path}")
                
                # Run inference
                result = recognition_service.predict(img)
                
            except Exception as e:
                logger.error(f"Error processing uploaded image: {str(e)}")
                logger.error(traceback.format_exc())
                return jsonify({
                    'success': False,
                    'error': f"Error processing image: {str(e)}",
                    'timestamp': time.time()
                }), 400
                
        # Handle JSON data case (image_data or strokes)
        elif request.is_json:
            # Get request data
            sketch_data = request.get_json()
            logger.debug(f"Received JSON data with keys: {sketch_data.keys()}")
            
            # Validate request data
            if not sketch_data:
                logger.warning("Empty JSON payload")
                return jsonify({
                    'success': False,
                    'error': 'Invalid request: No data provided',
                    'timestamp': time.time()
                }), 400
            
            # Check required fields (either image_data or strokes should be present)
            if not ('image_data' in sketch_data or 'strokes' in sketch_data):
                logger.warning("Missing required fields in JSON payload")
                return jsonify({
                    'success': False,
                    'error': 'Invalid request: Missing required field - must include either image_data or strokes',
                    'timestamp': time.time()
                }), 400
            
            # Run inference
            result = recognition_service.predict(sketch_data)
            
        else:
            logger.warning(f"Unsupported content type: {request.content_type}")
            return jsonify({
                'success': False,
                'error': 'Invalid request: Must provide either multipart/form-data with image file or application/json with sketch data',
                'timestamp': time.time()
            }), 400
        
        # Add processing time
        processing_time = time.time() - start_time
        result['processing_time'] = round(processing_time, 4)
        
        # Safety check to ensure we have predictions with proper structure
        if not result.get('success', False):
            # Create a valid response with error information
            logger.warning(f"Prediction failed: {result.get('error', 'unknown error')}")
            return jsonify({
                'success': False,
                'error': result.get('error', 'Unknown prediction error'),
                'processing_time': round(processing_time, 4),
                'timestamp': time.time()
            }), 500
            
        # Ensure the predictions structure is valid
        if 'predictions' not in result or 'top_predictions' not in result['predictions']:
            # Fix the response structure
            logger.warning("Missing predictions in result, using fallback")
            result['predictions'] = {
                'top_predictions': [{"class": "unknown", "confidence": 1.0}],
                'inference_time': result.get('predictions', {}).get('inference_time', 0.01)
            }
            
        # Ensure top_predictions is not empty
        if not result['predictions']['top_predictions']:
            logger.warning("Empty top_predictions list, using fallback")
            result['predictions']['top_predictions'] = [{"class": "unknown", "confidence": 1.0}]
        
        # Log successful recognition
        try:
            top_class = result['predictions']['top_predictions'][0]['class']
            confidence = result['predictions']['top_predictions'][0]['confidence']
            logger.info(f"Successfully recognized sketch as '{top_class}' with {confidence:.2f} confidence in {processing_time:.4f}s")
        except (KeyError, IndexError):
            # Handle any unexpected structure issues
            logger.warning("Recognition succeeded but with unexpected result format")
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in recognition endpoint: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Ensure we return a valid response even on exceptions
        return jsonify({
            'success': False,
            'error': f"Recognition failed: {str(e)}",
            'predictions': {
                'top_predictions': [{"class": "error", "confidence": 1.0}],
                'inference_time': 0
            },
            'timestamp': time.time()
        }), 500

@recognition_bp.route('/recognize/debug', methods=['POST'])
def debug_recognition():
    """
    Debug endpoint for recognition service 
    Returns detailed information about the input and processing steps
    """
    try:
        # Get request data based on content type
        if request.is_json:
            sketch_data = request.get_json()
            logger.debug(f"Debug request with JSON data: {sketch_data.keys()}")
        elif 'image' in request.files:
            file = request.files['image']
            img_bytes = file.read()
            img = Image.open(io.BytesIO(img_bytes))
            logger.debug(f"Debug request with image file: {file.filename}")
            
            # Save a debug copy
            debug_dir = Path(current_app.config.get('DEBUG_DIR', 'debug_images'))
            debug_dir.mkdir(exist_ok=True)
            debug_path = debug_dir / f"debug_upload_{time.time()}.png"
            img.save(debug_path)
            
            # Convert to grayscale and get stats
            if img.mode != 'L':
                img_gray = img.convert('L')
            else:
                img_gray = img
                
            img_np = np.array(img_gray)
            sketch_data = {
                'debug_image': True,
                'image_file': file.filename,
                'debug_path': str(debug_path),
                'shape': img_np.shape,
                'min': int(img_np.min()),
                'max': int(img_np.max()),
                'mean': float(img_np.mean()),
                'dtype': str(img_np.dtype)
            }
        else:
            return jsonify({
                'success': False,
                'error': 'No valid input data found'
            }), 400
            
        # Get recognition service
        recognition_service = get_recognition_service()
        
        # Additional debug information
        debug_info = {
            'success': True,
            'input': sketch_data,
            'model_info': recognition_service.get_model_info(),
            'timestamp': time.time()
        }
        
        # Try preprocessing if we have image_data or strokes
        if 'image_data' in sketch_data:
            from app.utils.image_utils import base64_to_image
            img = base64_to_image(sketch_data['image_data'])
            debug_info['image_size'] = img.size
            debug_info['image_mode'] = img.mode
            
            # Try to preprocess
            processed = recognition_service.preprocess_image(img, debug=True)
            debug_info['processed_shape'] = processed.shape
            debug_info['processed_min'] = float(processed.min())
            debug_info['processed_max'] = float(processed.max())
            debug_info['processed_mean'] = float(processed.mean())
            
        elif 'strokes' in sketch_data:
            debug_info['num_strokes'] = len(sketch_data['strokes'])
            debug_info['total_points'] = sum(len(stroke) for stroke in sketch_data['strokes'])
            
            # Try preprocess
            processed, features = recognition_service.preprocess_canvas_data(sketch_data)
            debug_info['processed_shape'] = processed.shape
            debug_info['processed_min'] = float(processed.min())
            debug_info['processed_max'] = float(processed.max())
            debug_info['processed_mean'] = float(processed.mean())
            debug_info['features'] = features
            
        return jsonify(debug_info)
        
    except Exception as e:
        logger.error(f"Error in debug endpoint: {str(e)}")
        logger.error(traceback.format_exc())
        
        return jsonify({
            'success': False,
            'error': str(e)
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
