import tensorflow as tf
import numpy as np
import logging

logger = logging.getLogger('fallback_model')

def create_simple_model(num_classes=14):
    """
    Create a simple CNN model for sketch recognition
    
    Args:
        num_classes (int): Number of output classes
    
    Returns:
        tf.keras.Model: Simple CNN model
    """
    # Create a minimal CNN for sketch recognition
    model = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(28, 28, 1), name='input_layer'),
        tf.keras.layers.Conv2D(16, (3, 3), activation='relu', padding='same'),
        tf.keras.layers.MaxPooling2D((2, 2)),
        tf.keras.layers.Conv2D(32, (3, 3), activation='relu', padding='same'),
        tf.keras.layers.MaxPooling2D((2, 2)),
        tf.keras.layers.Flatten(),
        tf.keras.layers.Dense(64, activation='relu'),
        tf.keras.layers.Dropout(0.2),
        tf.keras.layers.Dense(num_classes, activation='softmax')
    ])
    
    # Compile model
    model.compile(
        optimizer='adam',
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    
    logger.info("Created simple fallback model")
    return model

def save_model(model, save_path):
    """
    Save a model to disk
    
    Args:
        model: Model to save
        save_path: Path to save the model
        
    Returns:
        bool: True if successful
    """
    try:
        model.save(save_path)
        logger.info(f"Model saved to {save_path}")
        return True
    except Exception as e:
        logger.error(f"Error saving model: {e}")
        return False
