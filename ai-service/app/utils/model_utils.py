import os
import numpy as np
import tensorflow as tf
from pathlib import Path
from datetime import datetime
import json
import glob

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
    Save a model with metadata
    
    Args:
        model: TensorFlow model
        model_path (str): Path to save the model
        metadata (dict): Additional metadata to save
        
    Returns:
        dict: Paths to the saved files
    """
    # Ensure the directory exists
    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    
    # Save the model
    model.save(model_path)
    
    # Prepare metadata
    if metadata is None:
        metadata = {}
    
    # Add timestamp
    metadata['timestamp'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Add model architecture summary
    arch_info = []
    for layer in model.layers:
        arch_info.append({
            'name': layer.name,
            'type': layer.__class__.__name__,
            'output_shape': str(layer.output_shape),
            'params': layer.count_params()
        })
    
    metadata['architecture'] = arch_info
    metadata['total_params'] = model.count_params()
    
    # Save metadata to JSON
    meta_path = os.path.splitext(model_path)[0] + '.json'
    with open(meta_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    return {
        'model_path': model_path,
        'metadata_path': meta_path
    }

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
