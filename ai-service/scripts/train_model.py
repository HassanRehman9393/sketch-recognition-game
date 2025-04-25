import os
import argparse
import numpy as np
import tensorflow as tf
import matplotlib.pyplot as plt
from datetime import datetime
import time
from pathlib import Path
import sys

# Add the parent directory to the path to ensure imports work correctly
sys.path.insert(0, str(Path(__file__).parent.parent))

# Import custom modules
from app.core.data_loader_processed import ProcessedDataLoader
from app.core.model_builder import QuickDrawModelBuilder
from app.utils.visualization import plot_confusion_matrix, visualize_model_predictions

def create_mobilenet_data_augmentation():
    """
    Create a data augmentation pipeline optimized for sketch recognition with MobileNetV2
    based on the copilot instructions
    
    Returns:
        tf.keras.Sequential: Data augmentation pipeline
    """
    return tf.keras.Sequential([
        # Rotation: ±10 degrees to simulate hand drawing variations
        tf.keras.layers.RandomRotation(0.1),
        
        # Width/height shifts: ±10% to handle positioning differences
        tf.keras.layers.RandomTranslation(0.1, 0.1),
        
        # Zoom: ±10% to handle size variations
        tf.keras.layers.RandomZoom(0.1),
        
        # Horizontal flips for applicable categories (optional - can be disabled for certain classes)
        tf.keras.layers.RandomFlip("horizontal"),
    ])

def train_model(args):
    """
    Train a sketch recognition model with specified parameters
    
    Args:
        args: Command-line arguments
    """
    print("=== Sketch Recognition Model Training ===")
    print(f"Model type: {args.model_type}")
    print(f"Epochs: {args.epochs}")
    print(f"Batch size: {args.batch_size}")
    print(f"Learning rate: {args.learning_rate}")
    
    # Configure paths
    base_dir = Path(__file__).parent.parent
    data_dir = base_dir / "data" / "processed"  # Updated path to match new data location
    model_dir = base_dir / "app" / "models" / "quickdraw"
    model_dir.mkdir(parents=True, exist_ok=True)
    
    # Check if GPU is available
    gpus = tf.config.experimental.list_physical_devices('GPU')
    if gpus:
        print(f"Using {len(gpus)} GPU(s)")
        for gpu in gpus:
            print(f"  {gpu}")
        # Configure memory growth to prevent OOM errors
        try:
            for gpu in gpus:
                tf.config.experimental.set_memory_growth(gpu, True)
        except RuntimeError as e:
            print(f"Error configuring GPU: {e}")
    else:
        print("No GPU found, using CPU")
    
    # Load the dataset
    print("\nLoading dataset...")
    data_loader = ProcessedDataLoader(data_dir)
    class_names = data_loader.class_names
    print(f"Found {len(class_names)} classes: {class_names}")
    
    if args.max_per_class:
        print(f"Limiting to {args.max_per_class} samples per class")
    
    # Train in two phases based on instructions
    phase = args.phase
    print(f"\nTraining phase: {phase}")
    
    # Create data generators with optimized augmentation for sketches
    if args.augmentation:
        train_datagen = tf.keras.preprocessing.image.ImageDataGenerator(
            rotation_range=10,          # ±10 degrees rotation
            width_shift_range=0.1,      # ±10% width shift
            height_shift_range=0.1,     # ±10% height shift
            zoom_range=0.1,             # ±10% zoom
            horizontal_flip=True,       # Horizontal flip
            rescale=None,               # No rescaling, our data is already normalized
            fill_mode='nearest'         # Fill mode
        )
    else:
        train_datagen = tf.keras.preprocessing.image.ImageDataGenerator()
    
    val_datagen = tf.keras.preprocessing.image.ImageDataGenerator()
    
    # Load the dataset
    dataset = data_loader.load_dataset(max_per_class=args.max_per_class)
    X_train, y_train = dataset['train'][:2]
    X_val, y_val = dataset['validation'][:2]
    X_test, y_test = dataset['test'][:2]
    
    # Create data generators
    train_generator = train_datagen.flow(
        X_train, y_train,
        batch_size=args.batch_size,
        shuffle=True
    )
    
    val_generator = val_datagen.flow(
        X_val, y_val,
        batch_size=args.batch_size,
        shuffle=False
    )
    
    test_generator = val_datagen.flow(
        X_test, y_test,
        batch_size=args.batch_size,
        shuffle=False
    )
    
    # Build model
    print("\nBuilding model...")
    model_builder = QuickDrawModelBuilder()
    
    if args.model_type == 'mobilenet':
        # Set learning rate according to phase
        if phase == 1:
            model_builder.learning_rate = args.learning_rate
        else:
            model_builder.learning_rate = args.learning_rate * 0.1  # Lower learning rate for fine-tuning
        
        # Build MobileNetV2 model
        model = model_builder.build_mobilenet_based(len(class_names), input_shape=(28, 28, 1))
        
        # For phase 2 (fine-tuning), unfreeze some layers
        if phase == 2:
            print("Fine-tuning: Unfreezing top layers of base model")
            # The MobileNetV2 base model is the 4th layer in our architecture
            base_model = model.layers[4]
            
            # Unfreeze the top N layers
            # MobileNetV2 has 154 layers, unfreeze the top third for fine-tuning
            for layer in base_model.layers[-50:]:
                layer.trainable = True
                
            # Recompile model with lower learning rate for fine-tuning
            model.compile(
                optimizer=tf.keras.optimizers.Adam(learning_rate=model_builder.learning_rate),
                loss=tf.keras.losses.CategoricalCrossentropy(),
                metrics=['accuracy']
            )
    else:
        # Other model types (simple, advanced)
        if args.model_type == 'simple':
            model = model_builder.build_simple_cnn(len(class_names))
        else:  # Default to advanced
            model = model_builder.build_advanced_cnn(len(class_names))
    
    # Show model summary
    model.summary()
    
    # Set up callbacks
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    model_filename = f"quickdraw_model_{args.model_type}_phase{phase}_{timestamp}.h5"
    model_path = model_dir / model_filename
    
    # TensorBoard callback
    log_dir = model_dir / "logs" / f"{args.model_type}_phase{phase}_{timestamp}"
    tensorboard_callback = tf.keras.callbacks.TensorBoard(
        log_dir=log_dir,
        histogram_freq=1
    )
    
    # ModelCheckpoint callback - save best model
    checkpoint_callback = tf.keras.callbacks.ModelCheckpoint(
        filepath=str(model_path),
        monitor='val_accuracy',
        save_best_only=True,
        verbose=1
    )
    
    # Early stopping with patience of 10 epochs (per instructions)
    early_stopping = tf.keras.callbacks.EarlyStopping(
        monitor='val_accuracy',
        patience=10,
        restore_best_weights=True,
        verbose=1
    )
    
    # Reduce learning rate on plateau
    reduce_lr = tf.keras.callbacks.ReduceLROnPlateau(
        monitor='val_loss',
        factor=0.2,
        patience=3,
        min_lr=0.00001,
        verbose=1
    )
    
    # Gradient clipping to prevent exploding gradients (per instructions)
    optimizer = tf.keras.optimizers.Adam(
        learning_rate=model_builder.learning_rate,
        clipnorm=1.0  # Clip gradients to prevent explosion
    )
    
    # Recompile with gradient clipping
    model.compile(
        optimizer=optimizer,
        loss='categorical_crossentropy',
        metrics=['accuracy', tf.keras.metrics.TopKCategoricalAccuracy(k=3, name='top_3_accuracy')]  # Add top-3 accuracy
    )
    
    callbacks_list = [tensorboard_callback, checkpoint_callback, early_stopping, reduce_lr]
    
    # Train model
    print("\nTraining model...")
    print(f"Phase {phase}: {'Training only top layers' if phase == 1 else 'Fine-tuning'}")
    
    # Choose epochs based on phase
    if phase == 1:
        epochs = min(10, args.epochs)  # Phase 1: 5-10 epochs (per instructions)
    else:
        epochs = max(20, args.epochs)  # Phase 2: 20-30 epochs (per instructions)
    
    print(f"Training for {epochs} epochs")
    
    start_time = time.time()
    history = model.fit(
        train_generator,
        validation_data=val_generator,
        epochs=epochs,
        callbacks=callbacks_list
    )
    training_time = time.time() - start_time
    print(f"Training completed in {training_time:.2f} seconds")
    
    # Plot training history
    history_dict = history.history
    accuracy = history_dict['accuracy']
    val_accuracy = history_dict['val_accuracy']
    loss = history_dict['loss']
    val_loss = history_dict['val_loss']
    
    epochs_range = range(1, len(accuracy) + 1)
    
    plt.figure(figsize=(12, 5))
    plt.subplot(1, 2, 1)
    plt.plot(epochs_range, accuracy, 'bo-', label='Training accuracy')
    plt.plot(epochs_range, val_accuracy, 'ro-', label='Validation accuracy')
    plt.title('Training and Validation Accuracy')
    plt.xlabel('Epochs')
    plt.ylabel('Accuracy')
    plt.legend()
    
    plt.subplot(1, 2, 2)
    plt.plot(epochs_range, loss, 'bo-', label='Training loss')
    plt.plot(epochs_range, val_loss, 'ro-', label='Validation loss')
    plt.title('Training and Validation Loss')
    plt.xlabel('Epochs')
    plt.ylabel('Loss')
    plt.legend()
    
    history_plot_path = model_dir / f"training_history_{args.model_type}_phase{phase}_{timestamp}.png"
    plt.tight_layout()
    plt.savefig(history_plot_path)
    print(f"Training history plot saved to {history_plot_path}")
    
    # Evaluate on test set
    print("\nEvaluating on test set...")
    results = model.evaluate(test_generator)
    
    print(f"Test Loss: {results[0]:.4f}")
    print(f"Test Accuracy: {results[1]:.4f}")
    print(f"Test Top-3 Accuracy: {results[2]:.4f}")
    
    # Create confusion matrix
    if args.confusion_matrix:
        print("\nGenerating confusion matrix...")
        y_pred = model.predict(X_test)
        y_pred_classes = np.argmax(y_pred, axis=1)
        y_test_classes = np.argmax(y_test, axis=1)
        
        from sklearn.metrics import confusion_matrix, classification_report
        cm = confusion_matrix(y_test_classes, y_pred_classes)
        
        plt.figure(figsize=(12, 10))
        plot_confusion_matrix(cm, class_names, normalize=True)
        cm_path = model_dir / f"confusion_matrix_{args.model_type}_phase{phase}_{timestamp}.png"
        plt.savefig(cm_path)
        print(f"Confusion matrix saved to {cm_path}")
        
        # Generate classification report with precision, recall, and F1-score
        report = classification_report(y_test_classes, y_pred_classes, target_names=class_names)
        print("\nClassification Report:")
        print(report)
        
        # Save classification report to file
        report_path = model_dir / f"classification_report_{args.model_type}_phase{phase}_{timestamp}.txt"
        with open(report_path, 'w') as f:
            f.write(report)
    
    # Save model with metadata
    metadata = {
        'input_shape': [int(d) for d in model.input_shape[1:]],
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'num_classes': len(class_names),
        'class_names': class_names,
        'model_type': args.model_type,
        'phase': phase,
        'config': vars(args),
        'metrics': {
            'accuracy': float(results[1]),
            'top_3_accuracy': float(results[2]),
            'loss': float(results[0])
        },
        'training_time_seconds': training_time,
        'training_history': {
            'accuracy': float(max(history_dict['accuracy'])),
            'val_accuracy': float(max(history_dict['val_accuracy'])),
            'loss': float(min(history_dict['loss'])),
            'val_loss': float(min(history_dict['val_loss'])),
            'epochs_trained': len(history_dict['accuracy']),
        }
    }
    
    # Save metadata
    metadata_path = str(model_path).replace('.h5', '.json')
    import json
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=4)
    
    print(f"\nModel saved to {model_path}")
    print(f"Metadata saved to {metadata_path}")
    
    # Model optimization for deployment if requested
    if args.convert_tflite:
        print("\nOptimizing model for deployment...")
        
        # TensorFlow Lite conversion
        from tensorflow.lite.python.interpreter import Interpreter
        
        tflite_model_path = str(model_path).replace('.h5', '.tflite')
        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        
        if args.quantize:
            print("Applying post-training quantization...")
            converter.optimizations = [tf.lite.Optimize.DEFAULT]
            converter.target_spec.supported_types = [tf.float16]
        
        tflite_model = converter.convert()
        
        with open(tflite_model_path, 'wb') as f:
            f.write(tflite_model)
        
        print(f"TFLite model saved to {tflite_model_path}")
        
        # Measure model size reduction
        original_size = os.path.getsize(model_path) / (1024 * 1024)  # MB
        tflite_size = os.path.getsize(tflite_model_path) / (1024 * 1024)  # MB
        
        print(f"Original model size: {original_size:.2f} MB")
        print(f"TFLite model size: {tflite_size:.2f} MB")
        print(f"Size reduction: {(1 - tflite_size/original_size) * 100:.2f}%")
        
        # Test TFLite model inference speed
        interpreter = Interpreter(model_path=tflite_model_path)
        interpreter.allocate_tensors()
        
        input_details = interpreter.get_input_details()
        output_details = interpreter.get_output_details()
        
        # Measure inference time
        sample = X_test[0:1]  # Get a single sample
        if input_details[0]['dtype'] == np.float32:
            sample = sample.astype(np.float32)
        
        # Warmup
        for _ in range(10):
            interpreter.set_tensor(input_details[0]['index'], sample)
            interpreter.invoke()
        
        # Measure inference time
        num_inferences = 100
        start_time = time.time()
        
        for _ in range(num_inferences):
            interpreter.set_tensor(input_details[0]['index'], sample)
            interpreter.invoke()
            
        end_time = time.time()
        
        avg_inference_time = (end_time - start_time) * 1000 / num_inferences  # ms
        print(f"Average TFLite inference time: {avg_inference_time:.2f} ms")
    
    print("\n=== Training Phase {phase} Complete ===")
    if phase == 1 and args.model_type == 'mobilenet':
        print("\nRecommendation: Run phase 2 training for fine-tuning with:")
        print(f"python scripts/train_model.py --model-type mobilenet --phase 2 --learning-rate {args.learning_rate * 0.1}")

def main():
    parser = argparse.ArgumentParser(description='Train sketch recognition model')
    parser.add_argument('--model-type', type=str, default='advanced',
                        choices=['simple', 'advanced', 'mobilenet'],
                        help='Type of model architecture to use')
    parser.add_argument('--epochs', type=int, default=20,
                        help='Number of training epochs')
    parser.add_argument('--batch-size', type=int, default=64,
                        help='Training batch size (64-128 recommended)')
    parser.add_argument('--learning-rate', type=float, default=0.001,
                        help='Initial learning rate')
    parser.add_argument('--phase', type=int, default=1, choices=[1, 2],
                        help='Training phase: 1=Train only classification head, 2=Fine-tune')
    parser.add_argument('--max-per-class', type=int, default=None,
                        help='Maximum number of samples per class (for quick testing)')
    parser.add_argument('--augmentation', action='store_true',
                        help='Use data augmentation during training')
    parser.add_argument('--confusion-matrix', action='store_true',
                        help='Generate confusion matrix after training')
    parser.add_argument('--convert-tflite', action='store_true',
                        help='Convert model to TensorFlow Lite format after training')
    parser.add_argument('--quantize', action='store_true',
                        help='Quantize TFLite model for reduced size')
    parser.add_argument('--categories', nargs='+',
                        help='Specific categories to train on')
    
    args = parser.parse_args()
    train_model(args)

if __name__ == '__main__':
    main()
