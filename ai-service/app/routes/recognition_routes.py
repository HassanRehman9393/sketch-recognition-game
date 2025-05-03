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

@recognition_bp.before_app_first_request
def init_recognition_service():
    """Initialize the recognition service before the first request"""
    global recognition_service
    
    # Get model path from environment variable or use default
    model_path = os.environ.get('MODEL_PATH', None)
    
    try:
        recognition_service = SketchRecognitionService(model_path)
        logger.info(f"Recognition service initialized with classes: {recognition_service.class_names}")
    except Exception as e:
        logger.error(f"Error initializing recognition service: {e}")
        logger.error(traceback.format_exc())

@recognition_bp.route('/api/recognize', methods=['POST'])
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
        
        # Check if recognition service is initialized
        if 'recognition_service' not in globals() or recognition_service is None:
            init_recognition_service()
            if 'recognition_service' not in globals() or recognition_service is None:
                return jsonify({
                    "success": False,
                    "error": "Recognition service not available"
                }), 503
        
        # Get image data from request
        image_data = None
        
        try:
            # Try to parse the request JSON
            if request.is_json:
                req_data = request.get_json()
                logger.debug(f"JSON data keys: {req_data.keys() if req_data else 'None'}")
                
                # Check for various possible field names
                if 'image_data' in req_data:
                    image_data = req_data['image_data']
                elif 'imageData' in req_data:
                    image_data = req_data['imageData']
                
            # If not JSON or image_data not found in JSON
            if image_data is None:
                # Try multipart form
                if 'image' in request.files:
                    file = request.files['image']
                    image_data = file.read()
                # Try raw body (direct base64)
                elif request.data:
                    try:
                        # Try to parse as JSON one more time
                        data = json.loads(request.data)
                        if 'image_data' in data:
                            image_data = data['image_data']
                        elif 'imageData' in data:
                            image_data = data['imageData']
                        else:
                            # Assume the whole body is the base64 data
                            image_data = request.data.decode('utf-8')
                    except:
                        # Assume the whole body is the base64 data
                        image_data = request.data.decode('utf-8')
        except Exception as parse_error:
            logger.warning(f"Error parsing request: {parse_error}")
            logger.warning(f"Request content type: {request.content_type}")
            logger.warning(f"Request data sample: {str(request.data)[:100]}...")
            
            return jsonify({
                "success": False,
                "error": f"Invalid JSON payload: {str(parse_error)}",
                "predictions": []
            }), 400
            
        if image_data is None:
            logger.warning("No image data found in request")
            return jsonify({
                "success": False,
                "error": "No image data provided",
                "predictions": []
            }), 400
            
        # Perform recognition
        results = recognition_service.recognize_sketch(image_data)
        
        # Add processing time
        results['processing_time_ms'] = round((time.time() - start_time) * 1000, 2)
        
        return jsonify(results)
        
    except Exception as e:
        logger.error(f"Error in recognize_sketch endpoint: {e}")
        logger.error(traceback.format_exc())
        return jsonify({
            "success": False,
            "error": str(e),
            "predictions": []
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
