"""
API routes for sketch recognition
"""

import logging
import time
from flask import Blueprint, request, jsonify
from app.core.recognition import get_recognition_service
from io import BytesIO
from PIL import Image
import base64
import json

# Create blueprint
sketch_bp = Blueprint('sketch_api', __name__, url_prefix='/api')

# Configure logging
logger = logging.getLogger(__name__)

@sketch_bp.route('/recognize', methods=['POST'])
def recognize_sketch():
    """
    Endpoint to recognize sketches from image data
    Accepts both image uploads and JSON with base64 encoded image data
    """
    start_time = time.time()
    
    try:
        recognition_service = get_recognition_service()
        
        # Handle image file upload
        if 'image' in request.files:
            img_file = request.files['image']
            image = Image.open(img_file.stream)
            logger.debug(f"Received image file with size {image.size}")
            result = recognition_service.predict(image)
            
        # Handle JSON payload with image data
        elif request.content_type == 'application/json':
            data = request.get_json()
            result = recognition_service.predict(data)
            
        # Handle form data with base64 image
        elif 'image_data' in request.form:
            from app.utils.image_utils import base64_to_image
            img = base64_to_image(request.form['image_data'])
            result = recognition_service.predict(img)
            
        else:
            logger.error("No valid input provided")
            return jsonify({
                'success': False,
                'error': 'No valid input provided. Send either an image file or JSON with image_data.',
                'processing_time': time.time() - start_time
            }), 400
        
        # Add processing time to result
        if 'processing_time' not in result:
            result['processing_time'] = time.time() - start_time
            
        return jsonify(result)
        
    except Exception as e:
        logger.exception("Error processing sketch recognition request")
        return jsonify({
            'success': False,
            'error': str(e),
            'processing_time': time.time() - start_time
        }), 500

@sketch_bp.route('/recognize/debug', methods=['POST'])
def recognize_sketch_debug():
    """Debug version of the recognition endpoint with extra information"""
    try:
        result = recognize_sketch()
        
        # Add extra debug info
        if request.content_type.startswith('multipart/form-data'):
            result.json['debug'] = {
                'files': list(request.files.keys()),
                'form': {k: v for k, v in request.form.items() if k != 'image_data'}
            }
        elif request.content_type == 'application/json':
            data = request.get_json()
            result.json['debug'] = {
                'content_type': request.content_type,
                'json_keys': list(data.keys())
            }
            
        return result
        
    except Exception as e:
        logger.exception("Error in debug recognition endpoint")
        return jsonify({
            'success': False,
            'error': str(e),
            'debug': True
        }), 500
