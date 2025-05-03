import io
import base64
import logging
import numpy as np
from flask import Blueprint, request, jsonify, send_file
from PIL import Image

from app.core.recognition import get_recognition_service

# Configure logging
logger = logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger('debug_routes')

# Create blueprint
debug_bp = Blueprint('debug', __name__, url_prefix='/debug')

@debug_bp.route('/preprocess', methods=['POST'])
def debug_preprocessing():
    """
    Debug endpoint to visualize preprocessed images
    
    Accepts:
        - JSON object with 'image_data' (base64 encoded image)
    
    Returns:
        The processed image that will be fed to the model
    """
    try:
        # Get image data
        if not request.is_json:
            return jsonify({'error': 'Request must be JSON'}), 400
            
        data = request.get_json()
        image_data = data.get('image_data')
        
        if not image_data:
            return jsonify({'error': 'No image data provided'}), 400
            
        # Get recognition service
        recognition_service = get_recognition_service()
        
        # Process the image
        processed = recognition_service.preprocess_canvas_data(image_data)
        
        # Convert processed image back to viewable format
        processed_img = processed[0]  # Remove batch dimension
        
        # If there's a channel dimension and it's 1, remove it
        if len(processed_img.shape) == 3 and processed_img.shape[-1] == 1:
            processed_img = processed_img[:, :, 0]
            
        # Scale back to 0-255
        processed_img = (processed_img * 255).astype(np.uint8)
        
        # Create PIL image and convert to PNG
        pil_img = Image.fromarray(processed_img)
        img_io = io.BytesIO()
        pil_img.save(img_io, 'PNG')
        img_io.seek(0)
        
        # Extract features
        features = recognition_service.extract_image_features(processed[0])
        
        # Return both the image and features
        return jsonify({
            'success': True,
            'features': features,
            'shape': processed.shape,
            'image_url': f"data:image/png;base64,{base64.b64encode(img_io.getvalue()).decode('utf-8')}"
        })
    
    except Exception as e:
        logger.exception(f"Error in debug_preprocessing: {e}")
        return jsonify({'error': str(e)}), 500

def register_routes(app):
    """Register the blueprint with the Flask app"""
    app.register_blueprint(debug_bp)
