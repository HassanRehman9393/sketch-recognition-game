from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import random
import time
import os
from pathlib import Path
import numpy as np

# Create necessary directories
def create_app_directories():
    # Define base paths
    base_dir = Path(__file__).parent
    
    # Create dataset directories
    datasets_dir = base_dir / "datasets"
    raw_dir = datasets_dir / "raw"
    processed_dir = datasets_dir / "processed"
    backup_dir = datasets_dir / "raw" / "backup"
    
    # Create directories if they don't exist
    for directory in [datasets_dir, raw_dir, processed_dir, backup_dir]:
        directory.mkdir(parents=True, exist_ok=True)
    
    # Create models directory
    models_dir = base_dir / "models" / "quickdraw"
    models_dir.mkdir(parents=True, exist_ok=True)
    
    return {
        'datasets_dir': str(datasets_dir),
        'raw_dir': str(raw_dir),
        'processed_dir': str(processed_dir),
        'backup_dir': str(backup_dir),
        'models_dir': str(models_dir)
    }

# Create directories when module is imported
app_directories = create_app_directories()

def create_app():
    app = Flask(__name__)
    CORS(app)
    
    # Import recognition service here to avoid circular imports
    from app.services.recognition import get_recognition_service
    
    # Initialize the recognition service
    model_dir = app_directories['models_dir']
    recognition_service = get_recognition_service(model_dir=model_dir)
    
    @app.route('/')
    def index():
        return jsonify({'message': 'Sketch Recognition AI Service is running'})
    
    @app.route('/recognize', methods=['POST'])
    def recognize():
        try:
            if not request.json:
                return jsonify({
                    'success': False, 
                    'error': 'Invalid request: no JSON data'
                }), 400
            
            # Get data from request
            sketch_data = request.json
            
            # Check if we have a properly initialized recognition service
            model_info = recognition_service.get_model_info()
            if model_info['status'] != 'loaded':
                # Return fallback random predictions for now
                return fallback_predictions()
            
            # Perform sketch recognition
            result = recognition_service.predict(sketch_data)
            return jsonify(result)
            
        except Exception as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    @app.route('/status', methods=['GET'])
    def status():
        # Get recognition service info
        model_info = recognition_service.get_model_info()
        
        return jsonify({
            'status': 'ready' if model_info['status'] == 'loaded' else 'initializing',
            'message': f"AI service is running with {model_info['status']} model",
            'model_info': model_info,
            'version': '1.0.0'
        })
    
    def fallback_predictions():
        """Return random dummy predictions when model is not available"""
        categories = [
            'apple', 'bicycle', 'car', 'cat', 'chair', 'clock', 'dog',
            'face', 'fish', 'house', 'star', 'tree', 'umbrella', 'airplane'
        ]
        
        # Generate 5 random predictions
        selected_categories = random.sample(categories, 5)
        
        # Generate confidence scores that sum to 1
        confidences = [random.random() for _ in range(5)]
        total = sum(confidences)
        confidences = [c/total for c in confidences]
        
        # Sort by confidence (highest first)
        predictions = sorted(
            [{"class": cat, "confidence": conf} for cat, conf in zip(selected_categories, confidences)],
            key=lambda x: x["confidence"],
            reverse=True
        )
        
        return jsonify({
            'success': True,
            'predictions': {
                'top_predictions': predictions,
                'inference_time': 0.05,
                'note': 'These are dummy predictions - model is not loaded yet'
            },
            'timestamp': time.time()
        })
    
    return app
