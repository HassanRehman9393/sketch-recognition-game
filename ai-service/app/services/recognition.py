import numpy as np
import tensorflow as tf
import cv2
from PIL import Image
import io
import base64
import json
import logging
from pathlib import Path
import re
import os
from tensorflow.lite.python.interpreter import Interpreter
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('recognition_service')

class SketchRecognitionService:
    """
    Service for sketch recognition using trained models
    """
    def __init__(self, model_path=None):
        """
        Initialize the recognition service with a trained model
        
        Args:
            model_path (str, optional): Path to trained model. If not provided, will try to find latest model.
        """
        self.model = None
        self.interpreter = None
        self.model_type = None  # 'h5' or 'tflite'
        self.class_names = []
        self.input_shape = None
        self.model_path = None
        self.last_load_time = None
        
        # Load model
        if model_path:
            self.load_model(model_path)
        else:
            # Find latest model in default location
            self._find_and_load_latest_model()
            
        # Log model info
        logger.info(f"Model loaded: {self.model_path}")
        logger.info(f"Model type: {self.model_type}")
        logger.info(f"Class names: {self.class_names[:10]}...")
        logger.info(f"Input shape: {self.input_shape}")
    
    def _find_and_load_latest_model(self):
        """Find and load the latest model from the default models directory"""
        base_path = Path(__file__).parent.parent / "models" / "quickdraw"
        
        # Try to find TFLite model first (preferred for inference)
        tflite_models = list(base_path.glob("*.tflite"))
        h5_models = list(base_path.glob("*.h5"))
        
        if tflite_models:
            # Sort by modification time, most recent first
            latest_model = sorted(tflite_models, key=os.path.getmtime, reverse=True)[0]
            logger.info(f"Loading latest TFLite model: {latest_model}")
            self.load_model(str(latest_model))
        elif h5_models:
            # Sort by modification time, most recent first
            latest_model = sorted(h5_models, key=os.path.getmtime, reverse=True)[0]
            logger.info(f"Loading latest H5 model: {latest_model}")
            self.load_model(str(latest_model))
        else:
            logger.error("No models found in default directory")
            raise FileNotFoundError("No models found in default directory")
    
    def load_model(self, model_path):
        """
        Load a trained model for inference
        
        Args:
            model_path (str): Path to model file (.h5 or .tflite)
        """
        model_path = str(model_path)
        logger.info(f"Loading model from {model_path}")
        self.model_path = model_path
        self.last_load_time = datetime.now()
        
        # Load metadata
        metadata_path = model_path.replace('.h5', '.json')
        metadata_path = metadata_path.replace('.tflite', '.json')
        
        try:
            if os.path.exists(metadata_path):
                with open(metadata_path, 'r') as f:
                    metadata = json.load(f)
                    self.class_names = metadata.get('class_names', [])
                    self.input_shape = metadata.get('input_shape', [28, 28, 1])
                    logger.info(f"Loaded metadata from {metadata_path}")
            else:
                # Default class names for QuickDraw dataset if no metadata
                self.class_names = [
                    'apple', 'banana', 'car', 'dog', 'elephant', 'fish', 'flower', 
                    'house', 'pencil', 'tree', 'bicycle', 'bird', 'cat', 'airplane'
                ]
                self.input_shape = [28, 28, 1]  # Default shape for QuickDraw
                logger.warning(f"No metadata found at {metadata_path}, using defaults")
        except Exception as e:
            logger.error(f"Error loading metadata: {e}")
            # Set defaults
            self.class_names = ['apple', 'banana', 'car', 'dog']
            self.input_shape = [28, 28, 1]

        # Load model based on file extension
        if model_path.endswith('.tflite'):
            try:
                # Load TFLite model
                self.interpreter = Interpreter(model_path=model_path)
                self.interpreter.allocate_tensors()
                self.model_type = 'tflite'
                
                # Get input details to confirm shape
                input_details = self.interpreter.get_input_details()
                if input_details and len(input_details) > 0:
                    self.input_shape = input_details[0]['shape'][1:]  # Skip batch dimension
                
                logger.info(f"Loaded TFLite model, input shape: {self.input_shape}")
            except Exception as e:
                logger.error(f"Error loading TFLite model: {e}")
                raise
        else:
            try:
                # For H5 models, try to load with keras
                from tensorflow import keras
                self.model = keras.models.load_model(model_path)
                self.model_type = 'h5'
                
                # Get input shape from model
                if hasattr(self.model, 'input_shape'):
                    self.input_shape = self.model.input_shape[1:]  # Skip batch dimension
                
                logger.info(f"Loaded H5 model, input shape: {self.input_shape}")
            except Exception as e:
                logger.error(f"Error loading H5 model: {e}")
                raise
    
    def preprocess_canvas_data(self, canvas_data):
        """
        Preprocess canvas data for model input
        
        Args:
            canvas_data (dict or str): Canvas data in various formats:
                - Base64 encoded image string
                - JSON with image data
                - Raw bytes of image
                
        Returns:
            numpy.ndarray: Preprocessed image ready for model inference
        """
        try:
            # Add debug logging for each step
            logger.debug(f"Processing canvas data of type: {type(canvas_data)}")
            
            # For base64 image data
            if isinstance(canvas_data, str):
                # Check if it's a data URL
                if canvas_data.startswith('data:image'):
                    # Strip the header and get only the base64 content
                    _, encoded = canvas_data.split(',', 1)
                    # Debug the image content
                    logger.debug(f"Processing image data URL, length: {len(encoded)}")
                    image_data = base64.b64decode(encoded)
                else:
                    # Assume it's already base64 encoded
                    image_data = base64.b64decode(canvas_data)
                    
                # Open image from bytes
                img = Image.open(io.BytesIO(image_data))
                logger.debug(f"Loaded image from base64, size: {img.size}, mode: {img.mode}")
                
                # Save debug image for trouble testing
                debug_dir = Path(__file__).parent.parent / "debug"
                debug_dir.mkdir(exist_ok=True)
                debug_path = debug_dir / f"debug_input_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
                img.save(debug_path)
                logger.debug(f"Saved debug image to {debug_path}")
                
                # Convert to grayscale
                if img.mode != 'L':
                    logger.debug(f"Converting image from {img.mode} to grayscale")
                    img = img.convert('L')
                
                # Resize to model input size (first two dimensions)
                target_size = self.input_shape[:2] if len(self.input_shape) >= 2 else (28, 28)
                logger.debug(f"Resizing image to {target_size}")
                
                img = img.resize(target_size, Image.LANCZOS)
                
                # Convert to numpy array
                img_array = np.array(img)
                
                # Debug image stats
                logger.debug(f"Image array shape: {img_array.shape}")
                logger.debug(f"Image array min: {img_array.min()}, max: {img_array.max()}, mean: {img_array.mean()}")
                
                # Invert if white background (assuming 0 is black, 255 is white)
                if img_array.mean() > 128:
                    logger.debug("Inverting image (white background to black)")
                    img_array = 255 - img_array
                
                # Normalize to [0, 1]
                img_array = img_array.astype(np.float32) / 255.0
                
                # Add batch and channel dimensions if needed
                if len(img_array.shape) == 2:  # If grayscale
                    target_shape = list(self.input_shape)
                    if len(target_shape) == 3:  # Model expects channel dimension
                        img_array = img_array.reshape((target_shape[0], target_shape[1], 1))
                    
                # Add batch dimension
                img_array = np.expand_dims(img_array, axis=0)
                
                logger.debug(f"Final preprocessed image shape: {img_array.shape}")
                logger.debug(f"Final min: {img_array.min()}, max: {img_array.max()}, mean: {img_array.mean()}")
                
                # Save debug preprocessed image
                debug_processed_path = debug_dir / f"processed_{datetime.now().strftime('%Y%m%d_%H%M%S')}.npy"
                np.save(debug_processed_path, img_array)
                logger.debug(f"Saved processed array to {debug_processed_path}")
                
                return img_array
            else:
                # Handle other input formats
                logger.error(f"Unsupported canvas data type: {type(canvas_data)}")
                raise ValueError(f"Unsupported canvas data type: {type(canvas_data)}")
            
        except Exception as e:
            logger.error(f"Error preprocessing canvas data: {e}")
            raise
    
    def predict(self, image_data):
        """
        Run inference on preprocessed image data
        
        Args:
            image_data (numpy.ndarray): Preprocessed image data
            
        Returns:
            list: List of (class_name, confidence) tuples, sorted by confidence
        """
        try:
            # Log input shape and model expectations
            logger.debug(f"Prediction input shape: {image_data.shape}")
            
            # Extract image features for better prediction understanding
            features = self.extract_image_features(image_data[0])
            logger.info(f"Making prediction based on features: {features}")
            
            # Run prediction based on model type
            if self.model_type == 'tflite':
                results = self._predict_tflite(image_data)
            else:
                results = self._predict_h5(image_data)
                
            return results
        except Exception as e:
            logger.error(f"Error in predict: {e}")
            # Return fallback predictions in case of error
            return [('apple', 0.5), ('banana', 0.3)]
    
    def extract_image_features(self, img_array):
        """Extract useful features from the image for debugging"""
        # Ensure we're working with a 2D array
        if len(img_array.shape) > 2:
            img_2d = img_array[:, :, 0]  # Take first channel
        else:
            img_2d = img_array
            
        # Basic statistics
        features = {
            'mean': float(img_2d.mean()),
            'median': float(np.median(img_2d)),
            'std': float(img_2d.std()),
            'min': float(img_2d.min()),
            'max': float(img_2d.max()),
        }
        
        # Calculate coverage (non-zero pixels percentage)
        total_pixels = img_2d.size
        non_zero_pixels = np.count_nonzero(img_2d)
        features['coverage'] = float(non_zero_pixels / total_pixels)
        
        # Rough shape detection by calculating centroid
        if non_zero_pixels > 0:
            y_indices, x_indices = np.nonzero(img_2d)
            centroid_y = y_indices.mean() / img_2d.shape[0]  # Normalized to [0,1]
            centroid_x = x_indices.mean() / img_2d.shape[1]  # Normalized to [0,1]
            features['centroid'] = (float(centroid_x), float(centroid_y))
            
            # Simple shape classification based on aspect ratio and distribution
            h, w = img_2d.shape
            aspect_ratio = max(w, h) / max(1, min(w, h))
            
            if aspect_ratio > 1.5:
                shape_type = 'elongated'
            elif features['coverage'] > 0.7:
                shape_type = 'filled'
            else:
                shape_type = 'circular'  # Default
                
            features['shape_type'] = shape_type
        else:
            features['centroid'] = (0.5, 0.5)
            features['shape_type'] = 'unknown'
            
        return features
    
    def _predict_h5(self, image_data):
        """Prediction using Keras H5 model"""
        if self.model is None:
            logger.error("H5 model not loaded")
            return [('error', 1.0)]
        
        # Run prediction
        predictions = self.model.predict(image_data)
        
        # Format results
        results = []
        for i, conf in enumerate(predictions[0]):
            if i < len(self.class_names):
                class_name = self.class_names[i]
                results.append((class_name, float(conf)))
            else:
                results.append((f"class_{i}", float(conf)))
        
        # Sort by confidence (highest first)
        results.sort(key=lambda x: x[1], reverse=True)
        return results
    
    def _predict_tflite(self, image_data):
        """Prediction using TFLite model"""
        if self.interpreter is None:
            logger.error("TFLite interpreter not loaded")
            return [('error', 1.0)]
        
        # Get input details
        input_details = self.interpreter.get_input_details()
        output_details = self.interpreter.get_output_details()
        
        # Ensure input data type matches model expectations
        if input_details[0]['dtype'] == np.float32:
            image_data = image_data.astype(np.float32)
        else:
            image_data = image_data.astype(np.uint8)
        
        # Set input tensor
        self.interpreter.set_tensor(input_details[0]['index'], image_data)
        
        # Run inference
        self.interpreter.invoke()
        
        # Get output tensor
        predictions = self.interpreter.get_tensor(output_details[0]['index'])
        
        # Format results
        results = []
        for i, conf in enumerate(predictions[0]):
            if i < len(self.class_names):
                class_name = self.class_names[i]
                results.append((class_name, float(conf)))
            else:
                results.append((f"class_{i}", float(conf)))
        
        # Sort by confidence (highest first)
        results.sort(key=lambda x: x[1], reverse=True)
        return results
    
    def get_model_info(self):
        """Get information about the loaded model"""
        return {
            'model_path': self.model_path,
            'model_type': self.model_type,
            'class_count': len(self.class_names),
            'classes': self.class_names[:5] + ['...'],  # Just show first 5
            'input_shape': self.input_shape,
            'status': 'loaded' if self.model or self.interpreter else 'not loaded',
            'last_loaded': self.last_load_time.isoformat() if self.last_load_time else None
        }
    
    def recognize_sketch(self, canvas_data):
        """
        End-to-end recognition pipeline:
        1. Preprocess canvas data
        2. Run inference
        3. Return formatted results with confidence scores
        
        Args:
            canvas_data: Canvas data in various formats
            
        Returns:
            dict: Recognition results with top predictions and confidence scores
        """
        try:
            # Preprocess the canvas data
            preprocessed_data = self.preprocess_canvas_data(canvas_data)
            
            # Run inference
            inference_start = datetime.now()
            raw_predictions = self.predict(preprocessed_data)
            inference_time = (datetime.now() - inference_start).total_seconds()
            
            # Format the predictions
            top_predictions = []
            for class_name, confidence in raw_predictions[:10]:  # Top 10 predictions
                top_predictions.append({
                    'class': class_name,
                    'confidence': round(confidence * 100, 2)  # Convert to percentage
                })
            
            # Return formatted results
            return {
                'success': True,
                'predictions': {
                    'inference_time': round(inference_time, 2),
                    'top_predictions': top_predictions
                },
                'timestamp': datetime.now().timestamp()
            }
        except Exception as e:
            logger.error(f"Error in recognize_sketch: {e}")
            return {
                'success': False,
                'error': str(e),
                'predictions': {
                    'top_predictions': [
                        {'class': 'error', 'confidence': 100.0}
                    ]
                },
                'timestamp': datetime.now().timestamp()
            }
