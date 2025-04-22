import os
import numpy as np
import tensorflow as tf
from PIL import Image
import requests
import io
import glob
from flask import current_app
import time
import base64
import logging
import json
import re
from typing import Dict, List, Tuple, Union, Optional
from pathlib import Path

from app.utils.model_utils import load_model_with_metadata, get_latest_model
from app.utils.image_utils import normalize_image, preprocess_stroke_data

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('recognition_service')

# Global model and class names
model = None
class_names = []

# List of classes for quick draw dataset
QUICKDRAW_CLASSES = [
    'apple', 'banana', 'car', 'cat', 'chair', 'clock', 'cloud', 'cup',
    'door', 'envelope', 'eye', 'fish', 'flower', 'house', 'key', 'leaf',
    'pants', 'pencil', 'sun', 'table', 'tree', 'umbrella'
]

def preprocess_image(image, target_size=(28, 28)):
    """
    Preprocess the image for model input
    """
    # Resize to target size
    image = image.resize(target_size, Image.LANCZOS)
    
    # Convert to numpy array
    img_array = np.array(image)
    
    # Normalize to [0, 1]
    img_array = img_array / 255.0
    
    # Invert (in Quick Draw, sketches are white on black background)
    img_array = 1 - img_array
    
    # Expand dimensions to batch size of 1
    img_array = np.expand_dims(img_array, axis=0)
    
    # Add channel dimension if model expects it
    if len(img_array.shape) < 4:
        img_array = np.expand_dims(img_array, axis=-1)
    
    return img_array

def load_model():
    """
    Load the sketch recognition model
    """
    global model, class_names
    
    # If model is already loaded, return True
    if model is not None:
        return True
    
    try:
        # Check if model file exists
        model_path = current_app.config['MODEL_PATH']
        model_files = glob.glob(os.path.join(model_path, "*.h5"))
        
        if not model_files:
            print("No model files found. Please download the model first.")
            return False
        
        # Load the model
        model = tf.keras.models.load_model(model_files[0])
        
        # Load class names
        class_names = QUICKDRAW_CLASSES
        
        print(f"Model loaded successfully with {len(class_names)} classes")
        return True
        
    except Exception as e:
        print(f"Error loading model: {str(e)}")
        return False

def predict_sketch(image):
    """
    Predict what the sketch is
    """
    global model, class_names
    
    # Load model if not already loaded
    if model is None and not load_model():
        # If we still don't have a model, use a dummy model for testing
        print("Using dummy predictions as model is not available")
        return dummy_predictions()
    
    # Preprocess image
    img_array = preprocess_image(image)
    
    # Make prediction
    start_time = time.time()
    predictions = model.predict(img_array)[0]
    inference_time = time.time() - start_time
    
    # Get top 5 predictions
    top_indices = predictions.argsort()[-5:][::-1]
    
    results = []
    for i in top_indices:
        results.append({
            'class': class_names[i],
            'confidence': float(predictions[i]),
        })
    
    return {
        'top_predictions': results,
        'inference_time': inference_time
    }

def dummy_predictions():
    """
    Return dummy predictions for testing when model is not available
    """
    import random
    
    # Generate random predictions for testing
    dummy_classes = QUICKDRAW_CLASSES[:5]  # Use first 5 classes
    
    results = []
    # Generate random confidence scores that sum to approximately 1
    confidences = np.random.dirichlet(np.ones(len(dummy_classes)))
    
    for i, class_name in enumerate(dummy_classes):
        results.append({
            'class': class_name,
            'confidence': float(confidences[i]),
        })
    
    # Sort by confidence
    results.sort(key=lambda x: x['confidence'], reverse=True)
    
    return {
        'top_predictions': results,
        'inference_time': 0.05,
        'note': 'These are dummy predictions for testing'
    }

def download_model():
    """
    Download a pre-trained model for sketch recognition
    """
    try:
        model_path = current_app.config['MODEL_PATH']
        model_file = os.path.join(model_path, "quickdraw_model.h5")
        
        # If model already exists, return True
        if os.path.exists(model_file):
            print("Model already exists")
            return True
        
        print("Downloading pre-trained model...")
        
        # For this example, we'll create a simple model instead of downloading
        # In a real implementation, you would download from a cloud storage
        
        # Create a simple CNN model for sketch recognition
        simple_model = tf.keras.Sequential([
            tf.keras.layers.Conv2D(16, (3, 3), activation='relu', input_shape=(28, 28, 1)),
            tf.keras.layers.MaxPooling2D((2, 2)),
            tf.keras.layers.Conv2D(32, (3, 3), activation='relu'),
            tf.keras.layers.MaxPooling2D((2, 2)),
            tf.keras.layers.Flatten(),
            tf.keras.layers.Dense(128, activation='relu'),
            tf.keras.layers.Dropout(0.2),
            tf.keras.layers.Dense(len(QUICKDRAW_CLASSES), activation='softmax')
        ])
        
        simple_model.compile(optimizer='adam',
                           loss='sparse_categorical_crossentropy',
                           metrics=['accuracy'])
        
        # Save the model
        simple_model.save(model_file)
        
        print(f"Simple model created and saved to {model_file}")
        return True
        
    except Exception as e:
        print(f"Error downloading model: {str(e)}")
        return False

class SketchRecognitionService:
    """
    Service for sketch recognition using trained TensorFlow models
    
    Handles:
    - Loading the trained model
    - Converting canvas data to model input format
    - Running inference on sketches
    - Calculating confidence scores
    - Returning prediction results
    """
    
    def __init__(self, model_path=None, model_dir=None, top_k=5):
        """
        Initialize the sketch recognition service
        
        Args:
            model_path (str, optional): Path to specific model file to load
            model_dir (str, optional): Directory containing models, will use latest if model_path not provided
            top_k (int): Number of top predictions to return
        """
        self.model = None
        self.metadata = None
        self.class_names = []
        self.input_shape = None
        self.top_k = top_k
        self.model_loaded = False
        self.model_load_time = None
        
        # Try to load the model
        self._load_model(model_path, model_dir)
    
    def _load_model(self, model_path=None, model_dir=None):
        """
        Load the TensorFlow model and metadata
        
        Args:
            model_path (str, optional): Path to specific model file to load
            model_dir (str, optional): Directory containing models, will use latest if model_path not provided
        """
        try:
            # If no model path provided, use the model directory to find latest model
            if model_path is None:
                if model_dir is None:
                    # Default model directory
                    base_dir = Path(__file__).parent.parent.parent
                    model_dir = base_dir / "app" / "models" / "quickdraw"
                else:
                    model_dir = Path(model_dir)
                
                # Get latest model
                model_path = get_latest_model(model_dir)
                if model_path is None:
                    logger.error(f"No models found in directory: {model_dir}")
                    return
            
            # Load model with metadata
            logger.info(f"Loading model from {model_path}")
            start_time = time.time()
            self.model, self.metadata = load_model_with_metadata(model_path)
            load_time = time.time() - start_time
            
            if self.model:
                self.model_loaded = True
                self.model_load_time = load_time
                
                # Extract metadata information
                if self.metadata:
                    self.class_names = self.metadata.get('class_names', [])
                    self.input_shape = self.metadata.get('input_shape', None)
                    logger.info(f"Model loaded successfully with {len(self.class_names)} classes")
                    logger.info(f"Classes: {self.class_names}")
                else:
                    logger.warning("Loaded model without metadata, recognition may be limited")
                
                # Extract input shape from model if not available in metadata
                if not self.input_shape:
                    self.input_shape = self.model.input_shape[1:]
                    logger.info(f"Using model input shape: {self.input_shape}")
            else:
                logger.error("Failed to load model")
                
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
    
    def preprocess_canvas_data(self, canvas_data: Dict) -> np.ndarray:
        """
        Convert canvas data to model input format
        
        Canvas data can be in two formats:
        1. Base64 encoded image data
        2. Stroke data as array of points
        
        Args:
            canvas_data (dict): Canvas data containing image or stroke information
        
        Returns:
            np.ndarray: Preprocessed image as numpy array
        """
        if not self.model_loaded:
            raise ValueError("Model not loaded")
            
        if 'image_data' in canvas_data:
            # Process base64 encoded image
            return self._process_image_data(canvas_data['image_data'])
            
        elif 'strokes' in canvas_data:
            # Process stroke data
            return self._process_stroke_data(canvas_data['strokes'])
            
        else:
            raise ValueError("Invalid canvas data format - missing 'image_data' or 'strokes'")
    
    def _process_image_data(self, image_data: str) -> np.ndarray:
        """
        Process base64 encoded image data
        
        Args:
            image_data (str): Base64 encoded image data, optionally with data:image/png;base64, prefix
            
        Returns:
            np.ndarray: Preprocessed image as numpy array
        """
        try:
            # Remove data URL prefix if present
            if image_data.startswith('data:'):
                image_data = re.sub(r'data:image/[a-zA-Z]+;base64,', '', image_data)
            
            # Decode base64 image
            image_bytes = base64.b64decode(image_data)
            
            # Open image using PIL
            with Image.open(io.BytesIO(image_bytes)) as img:
                # Convert to grayscale if needed
                if img.mode != 'L':
                    img = img.convert('L')
                
                # Resize to expected input dimensions
                target_size = (self.input_shape[0], self.input_shape[1])
                img = img.resize(target_size, Image.LANCZOS)
                
                # Convert to numpy array and normalize
                img_array = np.array(img)
                
                # Normalize to [0, 1] range
                img_array = img_array.astype('float32') / 255.0
                
                # Add batch and channel dimensions if needed
                if len(self.input_shape) == 2:  # If model expects grayscale
                    img_array = np.expand_dims(img_array, axis=0)  # Add batch dimension
                elif len(self.input_shape) == 3 and self.input_shape[2] == 1:  # Model expects grayscale channel
                    img_array = np.expand_dims(np.expand_dims(img_array, axis=0), axis=-1)
                elif len(self.input_shape) == 3 and self.input_shape[2] == 3:  # Model expects RGB
                    # Repeat grayscale across 3 channels
                    img_array = np.stack([img_array, img_array, img_array], axis=-1)
                    img_array = np.expand_dims(img_array, axis=0)
                
                return img_array
                
        except Exception as e:
            logger.error(f"Error processing image data: {str(e)}")
            raise
    
    def _process_stroke_data(self, strokes: List[List[Dict]]) -> np.ndarray:
        """
        Process stroke data from canvas
        
        Args:
            strokes (list): List of strokes, where each stroke is a list of points
                            Each point is a dict with x, y coordinates
        
        Returns:
            np.ndarray: Preprocessed image as numpy array
        """
        try:
            # Convert strokes to the format expected by preprocess_stroke_data
            formatted_strokes = []
            for stroke in strokes:
                points = []
                for point in stroke:
                    points.append([point['x'], point['y']])
                if points:
                    formatted_strokes.append(np.array(points))
            
            # Use the stroke processing utility to convert to image
            target_size = (self.input_shape[0], self.input_shape[1])
            img_array = preprocess_stroke_data(formatted_strokes, target_size)
            
            # Add batch dimension and channel dimension if needed
            if len(self.input_shape) == 2:  # If model expects grayscale without channel
                img_array = np.expand_dims(img_array, axis=0)
            elif len(self.input_shape) == 3:  # If model expects channel dimension
                img_array = np.expand_dims(np.expand_dims(img_array, axis=0), axis=-1)
                # If model expects RGB, repeat grayscale across 3 channels
                if self.input_shape[2] == 3:
                    img_array = np.repeat(img_array, 3, axis=-1)
            
            return img_array
            
        except Exception as e:
            logger.error(f"Error processing stroke data: {str(e)}")
            raise
    
    def predict(self, input_data: Union[Dict, np.ndarray]) -> Dict:
        """
        Run prediction on input data
        
        Args:
            input_data: Either preprocessed numpy array or raw canvas data dict
        
        Returns:
            dict: Prediction results with confidence scores
        """
        if not self.model_loaded:
            return {
                'success': False,
                'error': 'Model not loaded',
                'timestamp': time.time()
            }
        
        try:
            start_time = time.time()
            
            # Preprocess canvas data if input is not already a numpy array
            if not isinstance(input_data, np.ndarray):
                preprocessed_input = self.preprocess_canvas_data(input_data)
            else:
                preprocessed_input = input_data
            
            # Run inference
            predictions = self.model.predict(preprocessed_input, verbose=0)
            
            # For single prediction, get first element
            if len(predictions) == 1:
                predictions = predictions[0]
            
            # Get top k predictions and calculate confidence scores
            top_k_indices = predictions.argsort()[-self.top_k:][::-1]
            top_predictions = []
            
            # Calculate softmax if the model outputs logits
            if np.any(predictions < 0) or np.any(predictions > 1):
                predictions = tf.nn.softmax(predictions).numpy()
            
            for idx in top_k_indices:
                if idx < len(self.class_names):
                    # Clean up class name (remove _3000 suffix if present)
                    class_name = self.class_names[idx]
                    if '_' in class_name:
                        class_name = class_name.split('_')[0]
                        
                    top_predictions.append({
                        'class': class_name,
                        'confidence': float(predictions[idx])
                    })
            
            # Calculate inference time
            inference_time = time.time() - start_time
            
            return {
                'success': True,
                'predictions': {
                    'top_predictions': top_predictions,
                    'inference_time': inference_time
                },
                'timestamp': time.time()
            }
            
        except Exception as e:
            logger.error(f"Error during prediction: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'timestamp': time.time()
            }
    
    def get_model_info(self) -> Dict:
        """
        Get information about the loaded model
        
        Returns:
            dict: Model information
        """
        if not self.model_loaded:
            return {'status': 'not_loaded'}
        
        info = {
            'status': 'loaded',
            'num_classes': len(self.class_names),
            'input_shape': self.input_shape,
            'load_time': self.model_load_time
        }
        
        # Add metadata information if available
        if self.metadata:
            info.update({
                'model_type': self.metadata.get('model_type', 'unknown'),
                'accuracy': self.metadata.get('metrics', {}).get('accuracy', 0),
                'timestamp': self.metadata.get('timestamp', 'unknown')
            })
            
            if 'training_history' in self.metadata:
                info['training'] = {
                    'val_accuracy': self.metadata['training_history'].get('val_accuracy', 0),
                    'epochs_trained': self.metadata['training_history'].get('epochs_trained', 0)
                }
        
        return info


# Create a singleton instance for use across the application
recognition_service = None

def get_recognition_service(model_path=None, model_dir=None):
    """
    Get or create a singleton instance of the SketchRecognitionService
    
    Args:
        model_path (str, optional): Path to specific model file to load
        model_dir (str, optional): Directory containing models
    
    Returns:
        SketchRecognitionService: Recognition service instance
    """
    global recognition_service
    if recognition_service is None:
        recognition_service = SketchRecognitionService(model_path, model_dir)
    return recognition_service
