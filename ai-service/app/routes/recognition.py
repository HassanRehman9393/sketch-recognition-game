from flask import Blueprint, request, jsonify
from app.services.recognition import predict_sketch, load_model, download_model
import base64
import numpy as np
from PIL import Image
import io
import time

recognition_bp = Blueprint('recognition', __name__)

@recognition_bp.route('/recognize', methods=['POST'])
def recognize_sketch():
    try:
        # Get image data
        data = request.get_json()
        if not data or 'imageData' not in data:
            return jsonify({'error': 'No image data provided'}), 400
            
        image_data = data['imageData']
        
        # Remove data URL prefix if present
        if image_data.startswith('data:image'):
            image_data = image_data.split(',')[1]
        
        # Decode base64 image
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes)).convert('L')
        
        # Process and make prediction
        predictions = predict_sketch(image)
        
        return jsonify({
            'success': True,
            'predictions': predictions,
            'timestamp': time.time()
        })
        
    except Exception as e:
        print(f"Error recognizing sketch: {str(e)}")
        return jsonify({'error': str(e)}), 500

@recognition_bp.route('/status', methods=['GET'])
def model_status():
    model_loaded = load_model()
    
    if model_loaded:
        return jsonify({
            'status': 'ready',
            'message': 'Model is loaded and ready for inference'
        })
    else:
        return jsonify({
            'status': 'not_ready',
            'message': 'Model is not loaded, try downloading the model'
        })

@recognition_bp.route('/download-model', methods=['POST'])
def download_model_route():
    try:
        result = download_model()
        return jsonify({
            'success': result,
            'message': 'Model downloaded successfully' if result else 'Failed to download model'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
