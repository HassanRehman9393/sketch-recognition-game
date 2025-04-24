import os
import argparse
import numpy as np
import tensorflow as tf
import matplotlib.pyplot as plt
from datetime import datetime
import time
from pathlib import Path

# Import custom modules
from app.core.data_loader_processed import ProcessedDataLoader
from app.models.enhanced_models import EnhancedModelBuilder
from app.utils.visualization import plot_confusion_matrix, visualize_model_predictions

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
    base_dir = Path(__file__).parent
    data_dir = base_dir / "app" / "datasets" / "processed"
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
    
    # Create data generators
    train_generator, val_generator, test_generator, _ = data_loader.get_data_generators(
        batch_size=args.batch_size,
        augmentation=args.augmentation,
        max_per_class=args.max_per_class
    )
    
    # Build model
    print("\nBuilding model...")
    if args.model_type == 'mobilenet':
        print("Using EnhancedModelBuilder for MobileNet")
        model_builder = EnhancedModelBuilder()
        model = model_builder.build_mobilenet_model(len(class_names), input_shape=(28, 28, 1))
    elif args.model_type == 'attention':
        print("Using EnhancedModelBuilder for Attention CNN")
        model_builder = EnhancedModelBuilder()
        model = model_builder.build_attention_cnn(len(class_names), input_shape=(28, 28, 1))
    elif args.model_type == 'efficientnet':
        print("Using EnhancedModelBuilder for EfficientNet")
        model_builder = EnhancedModelBuilder()
        model = model_builder.build_efficientnet_model(len(class_names), input_shape=(28, 28, 1))
    else:
        from app.core.model_builder import QuickDrawModelBuilder
        model_builder = QuickDrawModelBuilder()
        if args.model_type == 'simple':
            model = model_builder.build_simple_cnn(len(class_names))
        else:  # Default to advanced
            model = model_builder.build_advanced_cnn(len(class_names))
    
    # Compile model with specified learning rate
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=args.learning_rate),
        loss=tf.keras.losses.CategoricalCrossentropy(),
        metrics=['accuracy']
    )
    
    # Show model summary
    model.summary()
    
    # Set up callbacks
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    model_filename = f"quickdraw_model_{args.model_type}_{timestamp}.h5"
    model_path = model_dir / model_filename
    
    # TensorBoard callback
    log_dir = model_dir / "logs" / f"{args.model_type}_{timestamp}"
    tensorboard_callback = tf.keras.callbacks.TensorBoard(
        log_dir=log_dir,
        histogram_freq=1
    )
    
    # ModelCheckpoint callback
    checkpoint_callback = tf.keras.callbacks.ModelCheckpoint(
        filepath=str(model_path),
        monitor='val_accuracy',
        save_best_only=True,
        verbose=1
    )
    
    # Early stopping
    early_stopping = tf.keras.callbacks.EarlyStopping(
        monitor='val_loss',
        patience=5,
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
    
    callbacks_list = [tensorboard_callback, checkpoint_callback, early_stopping, reduce_lr]
    
    # Train model
    print("\nTraining model...")
    start_time = time.time()
    history = model.fit(
        train_generator,
        validation_data=val_generator,
        epochs=args.epochs,
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
    
    epochs = range(1, len(accuracy) + 1)
    
    plt.figure(figsize=(12, 5))
    plt.subplot(1, 2, 1)
    plt.plot(epochs, accuracy, 'bo-', label='Training accuracy')
    plt.plot(epochs, val_accuracy, 'ro-', label='Validation accuracy')
    plt.title('Training and Validation Accuracy')
    plt.xlabel('Epochs')
    plt.ylabel('Accuracy')
    plt.legend()
    
    plt.subplot(1, 2, 2)
    plt.plot(epochs, loss, 'bo-', label='Training loss')
    plt.plot(epochs, val_loss, 'ro-', label='Validation loss')
    plt.title('Training and Validation Loss')
    plt.xlabel('Epochs')
    plt.ylabel('Loss')
    plt.legend()
    
    history_plot_path = model_dir / f"training_history_{args.model_type}_{timestamp}.png"
    plt.tight_layout()
    plt.savefig(history_plot_path)
    print(f"Training history plot saved to {history_plot_path}")
    
    # Evaluate on test set
    print("\nEvaluating on test set...")
    results = model.evaluate(test_generator)
    
    print(f"Test Accuracy: {results[1]:.4f}")
    print(f"Test Loss: {results[0]:.4f}")
    
    # Save model with metadata
    metadata = {
        'input_shape': model.input_shape[1:],
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'num_classes': len(class_names),
        'class_names': class_names,
        'model_type': args.model_type,
        'config': vars(args),
        'metrics': {
            'accuracy': float(results[1]),
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
    
    # Generate confusion matrix
    if args.confusion_matrix:
        print("\nGenerating confusion matrix...")
        dataset = data_loader.load_dataset(max_per_class=100)
        X_test, y_test, _ = dataset['test']
        
        y_pred = model.predict(X_test)
        y_pred_classes = np.argmax(y_pred, axis=1)
        y_test_classes = np.argmax(y_test, axis=1)
        
        from sklearn.metrics import confusion_matrix
        cm = confusion_matrix(y_test_classes, y_pred_classes)
        
        plt.figure(figsize=(12, 10))
        plot_confusion_matrix(cm, class_names, normalize=True)
        cm_path = model_dir / f"confusion_matrix_{args.model_type}_{timestamp}.png"
        plt.savefig(cm_path)
        print(f"Confusion matrix saved to {cm_path}")

    if args.convert_tflite:
        print("\nConverting to TensorFlow Lite...")
        from app.utils.model_utils import convert_model_to_tflite
        
        tflite_path = str(model_path).replace('.h5', '.tflite')
        convert_model_to_tflite(model, tflite_path, quantize=args.quantize)
        print(f"TFLite model saved to {tflite_path}")

    print("\n=== Training Complete ===")

def main():
    parser = argparse.ArgumentParser(description='Train sketch recognition model')
    parser.add_argument('--model-type', type=str, default='advanced',
                        choices=['simple', 'advanced', 'mobilenet', 'attention', 'efficientnet'],
                        help='Type of model architecture to use')
    parser.add_argument('--epochs', type=int, default=20,
                        help='Number of training epochs')
    parser.add_argument('--batch-size', type=int, default=32,
                        help='Training batch size')
    parser.add_argument('--learning-rate', type=float, default=0.001,
                        help='Initial learning rate')
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
    
    args = parser.parse_args()
    train_model(args)

if __name__ == '__main__':
    main()
