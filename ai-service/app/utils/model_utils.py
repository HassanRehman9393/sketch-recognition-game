import os
import numpy as np
import tensorflow as tf
from pathlib import Path
from datetime import datetime
import json
import glob
import logging

logger = logging.getLogger('model_utils')

def list_available_models(models_dir):
    """
    List available models in the models directory
    
    Args:
        models_dir (str): Directory where models are stored
        
    Returns:
        list: List of model files with metadata
    """
    models = []
    model_path = Path(models_dir)
    
    # Check for .h5 files
    model_files = list(model_path.glob("*.h5"))
    
    for model_file in model_files:
        # Get basic metadata
        stats = model_file.stat()
        created = datetime.fromtimestamp(stats.st_ctime).strftime("%Y-%m-%d %H:%M:%S")
        size_mb = stats.st_size / (1024 * 1024)
        
        # Try to get additional metadata from companion JSON file
        metadata_file = model_file.with_suffix('.json')
        metadata = {}
        if metadata_file.exists():
            try:
                with open(metadata_file, 'r') as f:
                    metadata = json.load(f)
            except:
                pass
        
        models.append({
            'filename': model_file.name,
            'path': str(model_file),
            'size_mb': round(size_mb, 2),
            'created': created,
            'metadata': metadata
        })
    
    return models

def save_model_with_metadata(model, model_path, metadata=None):
    """
    Save the model with metadata
    
    Args:
        model (tf.keras.Model): Model to save
        model_path (str): Path to save the model
        metadata (dict, optional): Model metadata
        
    Returns:
        dict: Paths to saved files
    """
    # Ensure directory exists
    model_dir = os.path.dirname(model_path)
    os.makedirs(model_dir, exist_ok=True)
    
    # Save the model
    model.save(model_path)
    
    # Generate metadata path from model path
    if model_path.endswith('.h5'):
        metadata_path = model_path.replace('.h5', '_metadata.json')
    else:
        metadata_path = f"{model_path}_metadata.json"
    
    # Save metadata if provided
    if metadata:
        # Add timestamp if not already present
        if 'timestamp' not in metadata:
            metadata['timestamp'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
        # Add input shape if not already present
        if 'input_shape' not in metadata:
            metadata['input_shape'] = model.input_shape[1:]
            
        # Write metadata to file
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
    
    return {
        'model_path': model_path,
        'metadata_path': metadata_path if metadata else None
    }

def load_model_with_metadata(model_path):
    """
    Load a model and its metadata
    
    Args:
        model_path (str): Path to the model
        
    Returns:
        tuple: (model, metadata)
    """
    # Load the model
    model = tf.keras.models.load_model(model_path)
    
    # Generate metadata path from model path
    if model_path.endswith('.h5'):
        metadata_path = model_path.replace('.h5', '_metadata.json')
    else:
        metadata_path = f"{model_path}_metadata.json"
    
    # Load metadata if it exists
    metadata = None
    if os.path.exists(metadata_path):
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
    
    return model, metadata

def convert_model_to_tflite(model, tflite_path, quantize=True):
    """
    Convert TensorFlow model to TFLite format
    
    Args:
        model (tf.keras.Model): Model to convert
        tflite_path (str): Path to save the TFLite model
        quantize (bool): Whether to quantize the model
        
    Returns:
        str: Path to saved TFLite model
    """
    # Create converter
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    
    # Set optimization options
    if quantize:
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
        converter.target_spec.supported_types = [tf.float16]
    
    # Convert the model
    tflite_model = converter.convert()
    
    # Save the model to file
    os.makedirs(os.path.dirname(tflite_path), exist_ok=True)
    with open(tflite_path, 'wb') as f:
        f.write(tflite_model)
    
    return tflite_path

def evaluate_model(model, test_data, class_names=None, batch_size=32):
    """
    Evaluate a model comprehensively
    
    Args:
        model (tf.keras.Model): Model to evaluate
        test_data: Test dataset (tf.data.Dataset or tuple of arrays)
        class_names (list, optional): List of class names
        batch_size (int): Batch size for evaluation
        
    Returns:
        dict: Evaluation metrics
    """
    # Evaluate model
    if isinstance(test_data, tf.data.Dataset):
        results = model.evaluate(test_data, verbose=1)
    else:
        X_test, y_test = test_data
        results = model.evaluate(X_test, y_test, batch_size=batch_size, verbose=1)
    
    # Get metric names
    metric_names = model.metrics_names
    metrics = dict(zip(metric_names, results))
    
    # If we have test data as arrays, we can compute more detailed metrics
    if not isinstance(test_data, tf.data.Dataset) and class_names:
        X_test, y_test = test_data
        
        # Get predictions
        y_pred = model.predict(X_test)
        y_pred_classes = np.argmax(y_pred, axis=1)
        y_true_classes = np.argmax(y_test, axis=1)
        
        # Compute confusion matrix
        confusion_matrix = tf.math.confusion_matrix(y_true_classes, y_pred_classes)
        
        # Add detailed metrics to results
        metrics['confusion_matrix'] = confusion_matrix.numpy().tolist()
        
        # Compute per-class metrics
        per_class_metrics = {}
        for i, class_name in enumerate(class_names):
            # True positives, false positives, true negatives, false negatives
            tp = confusion_matrix[i, i].numpy()
            fp = np.sum(confusion_matrix[:, i]).numpy() - tp
            fn = np.sum(confusion_matrix[i, :]).numpy() - tp
            tn = np.sum(confusion_matrix).numpy() - tp - fp - fn
            
            # Compute precision, recall, f1
            precision = tp / (tp + fp) if (tp + fp) > 0 else 0
            recall = tp / (tp + fn) if (tp + fn) > 0 else 0
            f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
            
            per_class_metrics[class_name] = {
                'precision': float(precision),
                'recall': float(recall),
                'f1': float(f1)
            }
        
        metrics['per_class'] = per_class_metrics
    
    return metrics

def create_optimized_model(model, quantize=True):
    """
    Create an optimized version of the model for inference
    
    Args:
        model (tf.keras.Model): Original model
        quantize (bool): Whether to apply quantization
        
    Returns:
        tf.keras.Model: Optimized model
    """
    # Clone the model
    optimized_model = tf.keras.models.clone_model(model)
    optimized_model.set_weights(model.get_weights())
    
    # Graph optimization
    @tf.function
    def serving_fn(input_tensor):
        return optimized_model(input_tensor, training=False)
    
    # Create concrete function
    input_shape = model.input_shape
    input_dtype = model.input.dtype
    
    # Use the concrete function to optimize the model
    concrete_func = serving_fn.get_concrete_function(
        tf.TensorSpec(input_shape, input_dtype)
    )
    
    # Create a SavedModel
    temp_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "temp")
    os.makedirs(temp_dir, exist_ok=True)
    
    temp_saved_model = os.path.join(temp_dir, "temp_model")
    tf.saved_model.save(
        optimized_model,
        temp_saved_model,
        signatures=concrete_func
    )
    
    # Load the SavedModel (which applies some optimizations)
    optimized_model = tf.keras.models.load_model(temp_saved_model)
    
    # Clean up temporary files
    import shutil
    shutil.rmtree(temp_saved_model)
    
    return optimized_model

def get_latest_model(models_dir, model_prefix='quickdraw_model'):
    """
    Get the latest model based on file creation date
    
    Args:
        models_dir (str): Directory where models are stored
        model_prefix (str): Prefix for model files
        
    Returns:
        str: Path to the latest model, or None if no models found
    """
    model_path = Path(models_dir)
    model_files = list(model_path.glob(f"{model_prefix}*.h5"))
    
    if not model_files:
        return None
    
    # Sort by creation time (newest first)
    model_files.sort(key=lambda x: x.stat().st_ctime, reverse=True)
    
    return str(model_files[0])
