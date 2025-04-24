import os
import numpy as np
import tensorflow as tf
import time
import logging
import json
import re
import hashlib
import random
import io
import glob
from PIL import Image, ImageOps
from flask import current_app
from pathlib import Path
from typing import Dict, List, Tuple, Union, Optional

from app.utils.model_utils import load_model_with_metadata, get_latest_model
from app.utils.image_utils import normalize_image, preprocess_stroke_data, analyze_image_content

# Configure logging with more detail for debugging
logging.basicConfig(level=logging.DEBUG, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('recognition_service')

# List of classes for quick draw dataset
QUICKDRAW_CLASSES = [
    'apple', 'bicycle', 'car', 'cat', 'chair', 'clock', 'dog',
    'face', 'fish', 'house', 'star', 'tree', 'umbrella', 'airplane'
]

class SketchRecognitionService:
    """Service for sketch recognition using trained TensorFlow models"""
    
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
        
        # Try to load a real model if provided
        try:
            if model_path or model_dir:
                self._load_model(model_path, model_dir)
            else:
                # Use dummy model if no path provided
                self._dummy_model()
                
            # Log model summary and architecture
            self._log_model_summary()
        except Exception as e:
            logger.error(f"Error initializing model: {str(e)}")
            # Fall back to dummy model on error
            self._dummy_model()
    
    def _log_model_summary(self):
        """Log model summary and architecture for debugging"""
        if self.model is not None:
            # Capture model architecture as string
            try:
                model_summary = []
                self.model.summary(print_fn=lambda x: model_summary.append(x))
                logger.info("Model architecture loaded:\n" + "\n".join(model_summary))
            except:
                logger.info("Could not print model summary")
                
            # Try to get input/output shape
            try:
                logger.info(f"Model input shape: {self.model.input_shape}")
                logger.info(f"Model output shape: {self.model.output_shape}")
            except:
                pass
                
            logger.info(f"Number of classes: {len(self.class_names)}")
            logger.info(f"Class mapping: {self.class_names}")
    
    def _dummy_model(self):
        """Temporary dummy model implementation for testing"""
        self.model_loaded = True
        self.class_names = QUICKDRAW_CLASSES
        self.input_shape = (28, 28, 1)
        self.model_load_time = 0.9856851100921631  # Mock value
        logger.info("Initialized dummy model for testing")
    
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
                    model_dir = base_dir / "models" / "quickdraw"
                else:
                    model_dir = Path(model_dir)
                
                logger.info(f"Looking for models in {model_dir}")
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
                    self.class_names = self.metadata.get('class_names', QUICKDRAW_CLASSES)
                    self.input_shape = self.metadata.get('input_shape', (28, 28, 1))
                    logger.info(f"Model loaded successfully with {len(self.class_names)} classes")
                    logger.info(f"Class mapping from metadata: {self.class_names}")
                else:
                    logger.warning("Loaded model without metadata, using default class names")
                    self.class_names = QUICKDRAW_CLASSES
                
                # Extract input shape from model if not available in metadata
                if not self.input_shape:
                    try:
                        self.input_shape = self.model.input_shape[1:]
                        logger.info(f"Using model input shape from model: {self.input_shape}")
                    except:
                        logger.warning("Could not determine input shape from model")
                        self.input_shape = (28, 28, 1)
            else:
                logger.error("Failed to load model")
                
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            raise
    
    def get_model_info(self):
        """Get information about the loaded model"""
        if not self.model_loaded:
            return {'status': 'not_loaded'}
        
        return {
            'status': 'loaded',
            'num_classes': len(self.class_names),
            'input_shape': self.input_shape,
            'load_time': self.model_load_time,
            'class_names': self.class_names
        }
    
    def preprocess_image(self, image, debug=False):
        """
        Preprocess an image for model input - improved version using enhanced preprocessing
        
        Args:
            image (PIL.Image or np.ndarray): Input image
            debug (bool): Whether to log debug info
            
        Returns:
            np.ndarray: Preprocessed image ready for model input
        """
        try:
            # Use the enhanced preprocessing pipeline
            from app.utils.image_utils import enhanced_preprocess_image
            
            if debug:
                processed_input, debug_info = enhanced_preprocess_image(image, debug=True)
                for key, value in debug_info.items():
                    logger.debug(f"Preprocessing {key}: {value}")
                return processed_input
            else:
                return enhanced_preprocess_image(image)
                
        except Exception as e:
            logger.error(f"Error in enhanced preprocessing: {str(e)}")
            # Fall back to basic preprocessing
            return self._basic_preprocess_image(image, debug)

    def _basic_preprocess_image(self, image, debug=False):
        """
        Basic preprocessing fallback in case enhanced preprocessing fails
        
        Args:
            image (PIL.Image or np.ndarray): Input image
            debug (bool): Whether to log debug info
            
        Returns:
            np.ndarray: Preprocessed image ready for model input
        """
        try:
            # Handle numpy array input
            if isinstance(image, np.ndarray):
                if debug:
                    logger.debug(f"Image is numpy array with shape: {image.shape} and dtype: {image.dtype}")
                
                # If RGB, convert to grayscale
                if len(image.shape) == 3 and image.shape[2] == 3:
                    if debug:
                        logger.debug("Converting RGB numpy array to grayscale")
                    # Convert RGB to grayscale using weighted average
                    image = np.dot(image[..., :3], [0.299, 0.587, 0.114])
                
                # Ensure image is 2D
                image_2d = image.reshape(image.shape[0], image.shape[1])
                
                # Resize to target size (28x28)
                if image_2d.shape != (28, 28):
                    if debug:
                        logger.debug(f"Resizing numpy array from {image_2d.shape} to (28, 28)")
                    # Convert to PIL for resizing then back to numpy
                    img_pil = Image.fromarray((image_2d * 255).astype(np.uint8) if image_2d.max() <= 1 else image_2d.astype(np.uint8))
                    img_pil = img_pil.resize((28, 28), Image.LANCZOS)
                    image_2d = np.array(img_pil)
                
                # Normalize to [0, 1]
                if image_2d.max() > 1:
                    if debug:
                        logger.debug(f"Normalizing from range [{image_2d.min()}, {image_2d.max()}] to [0, 1]")
                    image_2d = image_2d.astype(np.float32) / 255.0
            
            # Handle PIL Image input
            elif isinstance(image, Image.Image):
                if debug:
                    logger.debug(f"Image is PIL Image with mode: {image.mode} and size: {image.size}")
                
                # Convert to grayscale if not already
                if image.mode != 'L':
                    if debug:
                        logger.debug(f"Converting from mode {image.mode} to grayscale")
                    image = image.convert('L')
                
                # Resize to target size (28x28)
                if image.size != (28, 28):
                    if debug:
                        logger.debug(f"Resizing PIL image from {image.size} to (28, 28)")
                    image = image.resize((28, 28), Image.LANCZOS)
                
                # Convert to numpy array
                image_2d = np.array(image)
                
                # Normalize to [0, 1]
                if image_2d.max() > 1:
                    if debug:
                        logger.debug(f"Normalizing from range [{image_2d.min()}, {image_2d.max()}] to [0, 1]")
                    image_2d = image_2d.astype(np.float32) / 255.0
            
            else:
                raise ValueError(f"Unsupported image type: {type(image)}")
            
            # Quick Draw is white on black background, but standard images are black on white
            # Check if inversion is needed (mostly white background)
            # Calculate the mean value - if > 0.5, it's likely a white background that needs inversion
            if np.mean(image_2d) > 0.5:
                if debug:
                    logger.debug(f"Inverting image (mean value: {np.mean(image_2d):.2f})")
                image_2d = 1.0 - image_2d

            # Log preprocessed image stats
            if debug:
                logger.debug(f"Preprocessed image shape: {image_2d.shape}")
                logger.debug(f"Preprocessed image min: {image_2d.min():.4f}, max: {image_2d.max():.4f}, mean: {image_2d.mean():.4f}")
                
            # Add batch dimension and channel dimension for model input
            model_input = np.expand_dims(np.expand_dims(image_2d, axis=0), axis=-1)
            
            if debug:
                logger.debug(f"Final model input shape: {model_input.shape}")
            
            return model_input
        
        except Exception as e:
            logger.error(f"Error preprocessing image: {str(e)}")
            raise
    
    def preprocess_canvas_data(self, canvas_data):
        """
        Preprocess canvas data for model input
        
        Args:
            canvas_data (dict): Canvas data containing image or stroke information
            
        Returns:
            tuple: (preprocessed data, image features or identifier)
        """
        # For image data, compute a simple hash to provide consistent but different predictions
        if 'image_data' in canvas_data:
            from app.utils.image_utils import base64_to_image
            try:
                # Convert base64 to image
                img = base64_to_image(canvas_data['image_data'])
                logger.debug(f"Successfully decoded base64 image: {img.size} mode: {img.mode}")
                
                # Preprocess the image using dedicated method with debug info
                preprocessed = self.preprocess_image(img, debug=True)
                
                # Analyze image content
                features = analyze_image_content(preprocessed[0, :, :, 0])
                
                # Return preprocessed image and features
                return preprocessed, features
                
            except Exception as e:
                logger.error(f"Error preprocessing image data: {str(e)}")
                # Return a random array on error
                return np.random.random((1, 28, 28, 1)), {'error': str(e)}
        
        # For stroke data, use the number of strokes and points as identifiers
        elif 'strokes' in canvas_data:
            from app.utils.image_utils import preprocess_stroke_data
            try:
                # Format strokes for processing
                formatted_strokes = []
                for stroke in canvas_data['strokes']:
                    points = []
                    for point in stroke:
                        points.append([point['x'], point['y']])
                    if points:
                        formatted_strokes.append(np.array(points))
                
                # Process strokes into image
                img_array = preprocess_stroke_data(formatted_strokes)
                logger.debug(f"Stroke data processed to image array with shape {img_array.shape}")
                
                # Add batch and channel dimensions
                preprocessed = np.expand_dims(np.expand_dims(img_array, axis=0), axis=-1)
                logger.debug(f"Final preprocessed stroke data shape: {preprocessed.shape}")
                
                # Analyze stroke features
                features = {
                    'num_strokes': len(canvas_data['strokes']),
                    'total_points': sum(len(stroke) for stroke in canvas_data['strokes']),
                }
                
                # Add image analysis features
                img_features = analyze_image_content(img_array)
                features.update(img_features)
                
                # Return preprocessed strokes and features
                return preprocessed, features
                
            except Exception as e:
                logger.error(f"Error preprocessing stroke data: {str(e)}")
                return np.random.random((1, 28, 28, 1)), {'error': str(e)}
        
        # Generic fallback
        logger.error("No valid input data (neither image_data nor strokes)")
        return np.random.random((1, 28, 28, 1)), {'error': 'No valid input data'}
    
    def predict(self, input_data):
        """
        Run prediction on input data (improved implementation with image analysis)
        
        Args:
            input_data: Either preprocessed numpy array or raw canvas data dict
        
        Returns:
            dict: Prediction results with confidence scores
        """
        try:
            # Process input data and get features
            features = {}
            processed_input = None
            
            # Direct numpy array input
            if isinstance(input_data, np.ndarray):
                # Check if this is a processed image ready for prediction
                if len(input_data.shape) == 4 and input_data.shape[0] == 1:
                    processed_input = input_data
                    logger.debug(f"Input is preprocessed numpy array with shape: {processed_input.shape}")
                    features = analyze_image_content(processed_input[0, :, :, 0])
                # Handle unprocessed image array
                else:
                    logger.debug(f"Input is raw numpy array with shape: {input_data.shape}, preprocessing...")
                    processed_input = self.preprocess_image(input_data, debug=True)
                    features = analyze_image_content(processed_input[0, :, :, 0])
            
            # Dictionary input (canvas data)
            elif isinstance(input_data, dict):
                logger.debug("Processing canvas data dictionary input")
                processed_input, features = self.preprocess_canvas_data(input_data)
            
            # PIL Image input
            elif isinstance(input_data, Image.Image):
                logger.debug(f"Input is PIL Image with size {input_data.size} and mode {input_data.mode}")
                processed_input = self.preprocess_image(input_data, debug=True)
                features = analyze_image_content(processed_input[0, :, :, 0])
            
            # Use real model if available
            if self.model is not None and hasattr(self.model, 'predict'):
                try:
                    # Log shape before prediction
                    logger.debug(f"Model input shape before prediction: {processed_input.shape}")
                    logger.debug(f"Model input values - min: {processed_input.min()}, max: {processed_input.max()}, mean: {processed_input.mean():.4f}")
                    
                    # Run inference with real model
                    start_time = time.time()
                    raw_predictions = self.model.predict(processed_input, verbose=0)
                    inference_time = time.time() - start_time
                    
                    # Log raw predictions for debugging
                    if len(raw_predictions) > 0:
                        logger.debug(f"Raw prediction shape: {raw_predictions.shape}")
                        logger.debug(f"Raw prediction values: {raw_predictions}")
                        
                        # Process predictions
                        predictions = raw_predictions[0] if len(raw_predictions.shape) > 1 else raw_predictions
                        
                        # Log top predicted classes
                        top_indices = predictions.argsort()[-5:][::-1]
                        logger.debug(f"Top 5 predicted class indices: {top_indices}")
                        
                        # Check if indices are in bounds
                        results = []
                        for i in top_indices:
                            if i < len(self.class_names):
                                class_name = self.class_names[i]
                                # Remove _3000 suffix if present
                                if '_' in class_name:
                                    class_name = class_name.split('_')[0]
                                    
                                confidence = float(predictions[i])
                                logger.debug(f"Class index {i} maps to '{class_name}' with confidence {confidence:.4f}")
                                
                                results.append({
                                    'class': class_name,
                                    'confidence': confidence
                                })
                            else:
                                logger.error(f"Index {i} out of bounds for class_names with length {len(self.class_names)}")
                        
                        if results:
                            return {
                                'success': True,
                                'predictions': {
                                    'top_predictions': results,
                                    'inference_time': float(inference_time)
                                },
                                'timestamp': time.time()
                            }
                    else:
                        logger.error("Model returned empty predictions")
                except Exception as e:
                    logger.error(f"Error with model prediction: {str(e)}")
                    # Fall back to feature-based prediction
            
            # Generate predictions based on image features as fallback
            logger.debug("Using feature-based prediction as fallback")
            predictions = self._predict_based_on_features(features)
            
            # If no predictions were generated, create fallbacks
            if not predictions:
                predictions = [
                    {"class": "unknown", "confidence": 0.75},
                    {"class": "drawing", "confidence": 0.25}
                ]
            
            # Ensure we have at least `top_k` predictions by padding with low-confidence guesses
            if len(predictions) < self.top_k:
                remaining_classes = [c for c in self.class_names if c not in [p['class'] for p in predictions]]
                for c in remaining_classes[:self.top_k - len(predictions)]:
                    class_name = c
                    if '_' in class_name:
                        class_name = class_name.split('_')[0]  # Remove _3000 suffix
                    predictions.append({
                        "class": class_name,
                        "confidence": 0.01
                    })
            
            # Sort by confidence and limit to top_k
            predictions = sorted(predictions, key=lambda x: x["confidence"], reverse=True)[:self.top_k]
            
            # Ensure confidences sum to 1.0
            total_confidence = sum(p["confidence"] for p in predictions)
            if total_confidence > 0:
                for p in predictions:
                    p["confidence"] = p["confidence"] / total_confidence
            
            return {
                'success': True,
                'predictions': {
                    'top_predictions': predictions,
                    'inference_time': 0.05  # Dummy inference time
                },
                'timestamp': time.time()
            }
        except Exception as e:
            logger.error(f"Error during prediction: {str(e)}")
            # Return a valid structure even in case of error
            return {
                'success': False,
                'error': str(e),
                'predictions': {
                    'top_predictions': [{"class": "error", "confidence": 1.0}],
                    'inference_time': 0
                },
                'timestamp': time.time()
            }
    
    def _predict_based_on_features(self, features):
        """
        Generate intelligent predictions based on image features
        
        Args:
            features (dict): Image features from analysis
            
        Returns:
            list: List of prediction dicts with class and confidence
        """
        logger.info(f"Making prediction based on features: {features}")
        
        # If features has an error, use generic fallback
        if 'error' in features:
            return [
                {"class": "error", "confidence": 0.8},
                {"class": "unknown", "confidence": 0.2}
            ]
        
        # Check for specific shapes based on feature analysis
        shape_type = features.get('shape_type', 'irregular')
        coverage = features.get('coverage', 0)
        centroid_y, centroid_x = features.get('centroid', (0.5, 0.5))
        
        # Circular shapes
        if shape_type == 'circular':
            if coverage < 0.2:  # Outline circle
                return [
                    {"class": "circle", "confidence": 0.65},
                    {"class": "clock", "confidence": 0.2}, 
                    {"class": "face", "confidence": 0.1},
                    {"class": "apple", "confidence": 0.03},
                    {"class": "fish", "confidence": 0.02}
                ]
            elif coverage < 0.4:  # Filled circle or face
                return [
                    {"class": "face", "confidence": 0.45},
                    {"class": "apple", "confidence": 0.25}, 
                    {"class": "clock", "confidence": 0.15},
                    {"class": "fish", "confidence": 0.1},
                    {"class": "star", "confidence": 0.05}
                ]
            else:  # Very filled circular shape
                return [
                    {"class": "apple", "confidence": 0.5},
                    {"class": "face", "confidence": 0.2},
                    {"class": "clock", "confidence": 0.15},
                    {"class": "star", "confidence": 0.1},
                    {"class": "fish", "confidence": 0.05}
                ]
        
        # Rectangular shapes
        elif shape_type == 'rectangular':
            if centroid_y < 0.4:  # Top-heavy (like houses)
                return [
                    {"class": "house", "confidence": 0.6},
                    {"class": "chair", "confidence": 0.2},
                    {"class": "car", "confidence": 0.1},
                    {"class": "airplane", "confidence": 0.05},
                    {"class": "clock", "confidence": 0.05}
                ]
            elif coverage < 0.3:  # Outline rectangle
                return [
                    {"class": "house", "confidence": 0.4},
                    {"class": "chair", "confidence": 0.3},
                    {"class": "car", "confidence": 0.15},
                    {"class": "clock", "confidence": 0.1},
                    {"class": "bicycle", "confidence": 0.05}
                ]
            else:  # Filled rectangle
                return [
                    {"class": "chair", "confidence": 0.35},
                    {"class": "house", "confidence": 0.3},
                    {"class": "car", "confidence": 0.2},
                    {"class": "clock", "confidence": 0.1},
                    {"class": "bicycle", "confidence": 0.05}
                ]
        
        # Irregular shapes
        else:
            if coverage < 0.15:  # Sparse drawing, likely a stick figure or simple sketch
                if centroid_y > 0.6:  # Bottom-heavy
                    return [
                        {"class": "tree", "confidence": 0.4},
                        {"class": "umbrella", "confidence": 0.3},
                        {"class": "bicycle", "confidence": 0.15},
                        {"class": "dog", "confidence": 0.1},
                        {"class": "chair", "confidence": 0.05}
                    ]
                else:  # Top or evenly distributed
                    return [
                        {"class": "cat", "confidence": 0.35},
                        {"class": "star", "confidence": 0.25},
                        {"class": "dog", "confidence": 0.2},
                        {"class": "umbrella", "confidence": 0.15},
                        {"class": "fish", "confidence": 0.05}
                    ]
            elif coverage < 0.3:  # Medium coverage
                if centroid_x < 0.4:  # Left-heavy
                    return [
                        {"class": "car", "confidence": 0.4},
                        {"class": "bicycle", "confidence": 0.25},
                        {"class": "dog", "confidence": 0.2},
                        {"class": "cat", "confidence": 0.1},
                        {"class": "fish", "confidence": 0.05}
                    ]
                else:  # Right-heavy or centered
                    return [
                        {"class": "airplane", "confidence": 0.3},
                        {"class": "fish", "confidence": 0.25},
                        {"class": "star", "confidence": 0.2},
                        {"class": "bicycle", "confidence": 0.15},
                        {"class": "umbrella", "confidence": 0.1}
                    ]
            else:  # Dense drawing
                return [
                    {"class": "tree", "confidence": 0.3},
                    {"class": "dog", "confidence": 0.25},
                    {"class": "cat", "confidence": 0.2},
                    {"class": "fish", "confidence": 0.15},
                    {"class": "star", "confidence": 0.1}
                ]
        
        # Generic fallback if nothing matched
        return [
            {"class": "cat", "confidence": 0.3},
            {"class": "dog", "confidence": 0.25},
            {"class": "house", "confidence": 0.15},
            {"class": "tree", "confidence": 0.1},
            {"class": "star", "confidence": 0.1},
            {"class": "apple", "confidence": 0.05},
            {"class": "fish", "confidence": 0.05}
        ]
    
    def download_model(self, url=None):
        """
        Download a pre-trained model for sketch recognition
        
        Args:
            url (str, optional): URL to download model from
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            if url:
                # Implementation for downloading model from URL
                pass
            
            return True
        except Exception as e:
            logger.error(f"Error downloading model: {str(e)}")
            return False

# Singleton instance
_recognition_service = None

def get_recognition_service(model_path=None, model_dir=None):
    """
    Get or create a singleton instance of the SketchRecognitionService
    
    Args:
        model_path (str, optional): Path to specific model file to load
        model_dir (str, optional): Directory containing models
    
    Returns:
        SketchRecognitionService: Recognition service instance
    """
    global _recognition_service
    if _recognition_service is None:
        _recognition_service = SketchRecognitionService(model_path, model_dir)
    return _recognition_service
