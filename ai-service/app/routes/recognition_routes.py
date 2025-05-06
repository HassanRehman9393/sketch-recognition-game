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
import numpy as np
from PIL import Image, ImageOps
import re

# Import recognition service - FIX: Import from core.recognition_service instead
from app.core.recognition_service import get_recognition_service

# Configure logging
logging.basicConfig(level=os.environ.get('LOG_LEVEL', 'INFO'))
logger = logging.getLogger('recognition_routes')

# Create blueprint
recognition_bp = Blueprint('recognition', __name__)

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
        
        # Get recognition service
        recognition_service = get_recognition_service()
        
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
        
        # Save request sample for debugging (5% of requests)
        if np.random.random() < 0.05:  # 5% of requests
            debug_dir = Path("debug_data")
            debug_dir.mkdir(exist_ok=True)
            
            # If it's a base64 image, try to save it
            if isinstance(image_data, str) and (
                image_data.startswith('data:image') or
                all(c in 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=' for c in image_data[:100])
            ):
                try:
                    # Extract actual base64 data if it's a data URI
                    if image_data.startswith('data:image'):
                        img_data = re.sub(r'^data:image/[^;]+;base64,', '', image_data)
                    else:
                        img_data = image_data

                    # Save for debug purposes
                    img_bytes = base64.b64decode(img_data)
                    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
                    img_path = debug_dir / f"debug_request_{timestamp}.png"
                    with open(img_path, 'wb') as f:
                        f.write(img_bytes)
                        
                    logger.debug(f"Saved debug image to {img_path}")
                except Exception as e:
                    logger.error(f"Error saving debug image: {e}")
        
        # Perform recognition
        logger.info(f"Performing recognition on image data (length={len(image_data) if isinstance(image_data, (str, bytes)) else 'unknown'})")
        results = recognition_service.recognize_sketch(image_data)
        
        # Log the prediction results
        if results and 'predictions' in results and 'top_predictions' in results['predictions']:
            top_predictions = results['predictions']['top_predictions']
            logger.info(f"Recognition found {len(top_predictions)} predictions")
            for i, pred in enumerate(top_predictions[:5]):
                logger.info(f"  Top {i+1}: {pred['class']} ({pred['confidence']:.2f}%)")
        
        # Add processing time
        results['processing_time_ms'] = round((time.time() - start_time) * 1000, 2)
        logger.info(f"Recognition completed in {results['processing_time_ms']}ms")
        
        return jsonify(results)
        
    except Exception as e:
        logger.error(f"Error in recognize_sketch endpoint: {e}")
        logger.error(traceback.format_exc())
        return jsonify({
            "success": False,
            "error": str(e),
            "predictions": []
        }), 500

@recognition_bp.route('/api/status', methods=['GET'])
def status():
    """Check the status of the recognition service"""
    try:
        recognition_service = get_recognition_service()
        model_info = recognition_service.get_model_info()
        
        return jsonify({
            "success": True,
            "service_status": "online",
            "model_status": model_info["status"],
            "model_path": model_info["model_path"],
            "classes": model_info["class_count"],
            "timestamp": time.time()
        })
    except Exception as e:
        logger.error(f"Error in status endpoint: {e}")
        return jsonify({
            "success": False,
            "service_status": "error",
            "error": str(e),
            "timestamp": time.time()
        }), 500

@recognition_bp.route('/debug-image', methods=['GET'])
def debug_image():
    """Return a test pattern image for debugging purposes"""
    try:
        # Create a test pattern with gradients and shapes
        width, height = 256, 256
        img = Image.new('L', (width, height), 255)
        
        # Draw a simple sketch-like pattern
        from PIL import ImageDraw
        draw = ImageDraw.Draw(img)
        
        # Draw a house
        # Roof
        draw.polygon([(50, 100), (200, 100), (125, 50)], outline=0, fill=255)
        # House body
        draw.rectangle([50, 100, 200, 200], outline=0, fill=255)
        # Door
        draw.rectangle([110, 150, 140, 200], outline=0, fill=255)
        # Window
        draw.rectangle([160, 150, 180, 170], outline=0, fill=255)
        
        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        # Return the base64 string directly
        return img_str
        
    except Exception as e:
        logger.error(f"Error generating debug image: {e}")
        return jsonify({'error': str(e)}), 500

def register_routes(app):
    """Register routes with Flask app"""
    app.register_blueprint(recognition_bp)
    
    # Add a simple root route
    @app.route('/')
    def index():
        return jsonify({
            'service': 'AI Sketch Recognition Service',
            'status': 'online',
            'version': '1.0.0',
            'endpoints': {
                '/api/recognize': 'POST - Recognize a sketch',
                '/api/status': 'GET - Check service status',
                '/debug-image': 'GET - Get a test image'
            }
        })
