import os
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models, optimizers, callbacks
from pathlib import Path
import logging
import json
import datetime
import matplotlib.pyplot as plt
from ..utils.model_utils import save_model_with_metadata

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger('model_builder')

class QuickDrawModelBuilder:
    def __init__(self):
        """Initialize the QuickDrawModelBuilder with default configurations"""
        # Default model architecture parameters
        self.input_shape = (28, 28, 1)  # Our normalized images are 28x28 grayscale
        self.model = None
        self.history = None
        
    def build_simple_cnn(self, num_classes):
        """
        Build a simple CNN architecture optimized for sketch recognition
        
        Args:
            num_classes (int): Number of output classes
            
        Returns:
            tf.keras.Model: Compiled model
        """
        logger.info(f"Building simple CNN model with {num_classes} output classes")
        
        model = models.Sequential([
            # First convolutional block
            layers.Conv2D(32, (3, 3), activation='relu', input_shape=self.input_shape),
            layers.MaxPooling2D((2, 2)),
            layers.BatchNormalization(),
            
            # Second convolutional block
            layers.Conv2D(64, (3, 3), activation='relu'),
            layers.MaxPooling2D((2, 2)),
            layers.BatchNormalization(),
            
            # Third convolutional block
            layers.Conv2D(128, (3, 3), activation='relu'),
            layers.MaxPooling2D((2, 2)),
            layers.BatchNormalization(),
            
            # Flatten and dense layers
            layers.Flatten(),
            layers.Dropout(0.5),  # Prevent overfitting
            layers.Dense(256, activation='relu'),
            layers.BatchNormalization(),
            layers.Dropout(0.3),  # Prevent overfitting
            
            # Output layer
            layers.Dense(num_classes, activation='softmax')
        ])
        
        # Compile the model
        model.compile(
            optimizer=optimizers.Adam(learning_rate=0.001),
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )
        
        # Save model summary to string
        model_summary = []
        model.summary(print_fn=lambda x: model_summary.append(x))
        logger.info("Model architecture:\n" + "\n".join(model_summary))
        
        self.model = model
        return model
    
    def build_advanced_cnn(self, num_classes):
        """
        Build a more advanced CNN architecture with residual connections
        
        Args:
            num_classes (int): Number of output classes
            
        Returns:
            tf.keras.Model: Compiled model
        """
        logger.info(f"Building advanced CNN model with {num_classes} output classes")
        
        inputs = layers.Input(shape=self.input_shape)
        
        # First convolutional block
        x = layers.Conv2D(32, (3, 3), padding='same', activation='relu')(inputs)
        x = layers.BatchNormalization()(x)
        x = layers.Conv2D(32, (3, 3), padding='same', activation='relu')(x)
        x = layers.BatchNormalization()(x)
        x = layers.MaxPooling2D((2, 2))(x)
        
        # Second convolutional block with residual connection
        shortcut = layers.Conv2D(64, (1, 1), padding='same')(x)
        x = layers.Conv2D(64, (3, 3), padding='same', activation='relu')(x)
        x = layers.BatchNormalization()(x)
        x = layers.Conv2D(64, (3, 3), padding='same', activation='relu')(x)
        x = layers.BatchNormalization()(x)
        x = layers.add([x, shortcut])
        x = layers.Activation('relu')(x)
        x = layers.MaxPooling2D((2, 2))(x)
        
        # Third convolutional block with residual connection
        shortcut = layers.Conv2D(128, (1, 1), padding='same')(x)
        x = layers.Conv2D(128, (3, 3), padding='same', activation='relu')(x)
        x = layers.BatchNormalization()(x)
        x = layers.Conv2D(128, (3, 3), padding='same', activation='relu')(x)
        x = layers.BatchNormalization()(x)
        x = layers.add([x, shortcut])
        x = layers.Activation('relu')(x)
        x = layers.MaxPooling2D((2, 2))(x)
        
        # Classification block
        x = layers.GlobalAveragePooling2D()(x)
        x = layers.Dropout(0.5)(x)
        x = layers.Dense(256, activation='relu')(x)
        x = layers.BatchNormalization()(x)
        x = layers.Dropout(0.3)(x)
        outputs = layers.Dense(num_classes, activation='softmax')(x)
        
        # Create and compile model
        model = models.Model(inputs=inputs, outputs=outputs)
        model.compile(
            optimizer=optimizers.Adam(learning_rate=0.001),
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )
        
        # Save model summary to string
        model_summary = []
        model.summary(print_fn=lambda x: model_summary.append(x))
        logger.info("Model architecture:\n" + "\n".join(model_summary))
        
        self.model = model
        return model
    
    def build_mobilenet_based(self, num_classes, input_shape=(28, 28, 1)):
        """
        Build a sketch recognition model based on MobileNetV2
        
        Args:
            num_classes (int): Number of output classes
            input_shape (tuple): Input shape (defaults to 28x28x1)
            
        Returns:
            tf.keras.Model: MobileNetV2-based model
        """
        self.logger.info(f"Building MobileNetV2-based model with {num_classes} output classes")
        
        # MobileNetV2 expects 3-channel input, so we need to adapt our grayscale images
        if input_shape[-1] == 1:
            # Create input layer that accepts grayscale images
            inputs = tf.keras.layers.Input(shape=input_shape)
            
            # Convert single-channel grayscale to 3-channel by repeating the channel
            # This works better than random initialization for transfer learning
            x = tf.keras.layers.Concatenate()([inputs, inputs, inputs])
            
            # Resize to match MobileNetV2 expected input size (96x96)
            # Nearest neighbor is used to preserve the binary sketch-like nature
            x = tf.keras.layers.Resizing(96, 96, interpolation='nearest')(x)
        else:
            # For RGB images, just resize
            inputs = tf.keras.layers.Input(shape=input_shape)
            x = tf.keras.layers.Resizing(96, 96)(inputs)
        
        # Load pre-trained MobileNetV2 without top layers
        base_model = tf.keras.applications.MobileNetV2(
            input_shape=(96, 96, 3),
            include_top=False,
            weights='imagenet',
            input_tensor=None,
            pooling='avg',
            alpha=1.0
        )
        
        # Freeze the base model layers
        base_model.trainable = False
        
        # Connect the base model
        x = base_model(x)
        
        # Add custom top layers
        x = tf.keras.layers.Dropout(0.2)(x)
        x = tf.keras.layers.Dense(256, activation='relu')(x)
        x = tf.keras.layers.BatchNormalization()(x)
        x = tf.keras.layers.Dropout(0.5)(x)
        
        # Output layer with softmax activation
        outputs = tf.keras.layers.Dense(num_classes, activation='softmax')(x)
        
        # Create the model
        model = tf.keras.Model(inputs=inputs, outputs=outputs)
        
        # Compile model
        model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=self.learning_rate),
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )
        
        model.summary(line_length=100)
        return model
    
    def train(self, train_data, validation_data, epochs=20, batch_size=64, callbacks_list=None):
        """
        Train the model with the provided data
        
        Args:
            train_data: Training data (generator or tuple of arrays)
            validation_data: Validation data (generator or tuple of arrays)
            epochs (int): Number of training epochs
            batch_size (int): Batch size for training
            callbacks_list (list): List of Keras callbacks
            
        Returns:
            dict: Training history
        """
        if self.model is None:
            logger.error("Model has not been built. Call one of the build_* methods first.")
            return None
            
        if callbacks_list is None:
            callbacks_list = []
            
        # Add default callbacks
        # Early stopping to prevent overfitting
        early_stopping = callbacks.EarlyStopping(
            monitor='val_loss',
            patience=5,
            restore_best_weights=True,
            verbose=1
        )
        callbacks_list.append(early_stopping)
        
        # Reduce learning rate when plateauing
        reduce_lr = callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.2,
            patience=3,
            min_lr=0.00001,
            verbose=1
        )
        callbacks_list.append(reduce_lr)
        
        # Start training
        logger.info(f"Starting model training for {epochs} epochs with batch size {batch_size}")
        start_time = datetime.datetime.now()
        
        # If input is a generator
        if isinstance(train_data, tf.keras.utils.Sequence):
            history = self.model.fit(
                train_data,
                validation_data=validation_data,
                epochs=epochs,
                callbacks=callbacks_list,
                verbose=1
            )
        else:
            # If input is a tuple of arrays (X_train, y_train)
            X_train, y_train = train_data
            X_val, y_val = validation_data
            
            history = self.model.fit(
                X_train, y_train,
                validation_data=(X_val, y_val),
                epochs=epochs,
                batch_size=batch_size,
                callbacks=callbacks_list,
                verbose=1
            )
        
        # Calculate training time
        end_time = datetime.datetime.now()
        training_time = (end_time - start_time).total_seconds()
        logger.info(f"Model training completed in {training_time:.2f} seconds")
        
        # Store history for later use
        self.history = history.history
        
        return history.history
    
    def save_model(self, model_path, class_names=None):
        """
        Save the trained model with metadata
        
        Args:
            model_path (str): Path to save the model
            class_names (list): List of class names
            
        Returns:
            dict: Paths to saved files
        """
        if self.model is None:
            logger.error("No model to save. Build and train a model first.")
            return None
        
        # Create metadata
        metadata = {
            'input_shape': self.input_shape,
            'timestamp': datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'num_classes': self.model.layers[-1].output_shape[-1],
            'class_names': class_names
        }
        
        # Add training history if available
        if self.history is not None:
            metadata['training_history'] = {
                'accuracy': float(max(self.history.get('accuracy', [0]))),
                'val_accuracy': float(max(self.history.get('val_accuracy', [0]))),
                'loss': float(min(self.history.get('loss', [0]))),
                'val_loss': float(min(self.history.get('val_loss', [0]))),
                'epochs_trained': len(self.history.get('accuracy', [])),
            }
        
        # Save model with metadata
        result = save_model_with_metadata(self.model, model_path, metadata)
        logger.info(f"Model saved to {result['model_path']} with metadata at {result['metadata_path']}")
        
        return result
    
    def plot_training_history(self, save_path=None):
        """
        Plot training history
        
        Args:
            save_path (str, optional): Path to save the plot
            
        Returns:
            tuple: Figure and axes objects
        """
        if self.history is None:
            logger.error("No training history available")
            return None
        
        # Create figure with two subplots
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 5))
        
        # Plot training & validation accuracy
        ax1.plot(self.history['accuracy'])
        ax1.plot(self.history['val_accuracy'])
        ax1.set_title('Model Accuracy')
        ax1.set_ylabel('Accuracy')
        ax1.set_xlabel('Epoch')
        ax1.legend(['Train', 'Validation'], loc='upper left')
        ax1.grid(True)
        
        # Plot training & validation loss
        ax2.plot(self.history['loss'])
        ax2.plot(self.history['val_loss'])
        ax2.set_title('Model Loss')
        ax2.set_ylabel('Loss')
        ax2.set_xlabel('Epoch')
        ax2.legend(['Train', 'Validation'], loc='upper right')
        ax2.grid(True)
        
        plt.tight_layout()
        
        # Save the plot if a path is provided
        if save_path:
            plt.savefig(save_path)
            logger.info(f"Training history plot saved to {save_path}")
        
        return fig, (ax1, ax2)
    
    def evaluate(self, test_data):
        """
        Evaluate the model on test data
        
        Args:
            test_data: Test data (generator or tuple of arrays)
            
        Returns:
            dict: Evaluation metrics
        """
        if self.model is None:
            logger.error("No model to evaluate. Build and train a model first.")
            return None
        
        logger.info("Evaluating model on test data")
        
        # If input is a generator
        if isinstance(test_data, tf.keras.utils.Sequence):
            results = self.model.evaluate(test_data, verbose=1)
        else:
            # If input is a tuple of arrays (X_test, y_test)
            X_test, y_test = test_data
            results = self.model.evaluate(X_test, y_test, verbose=1)
        
        metric_names = self.model.metrics_names
        metrics = dict(zip(metric_names, results))
        
        logger.info(f"Test metrics: {metrics}")
        return metrics
