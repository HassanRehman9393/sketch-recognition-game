import os
import sys
import argparse
import logging
import tensorflow as tf
from pathlib import Path
import matplotlib.pyplot as plt
import numpy as np
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger('model_training')

# Handle TensorFlow logging
tf.get_logger().setLevel('ERROR')

# Try to import our modules
try:
    from app.services.model_builder import QuickDrawModelBuilder
    from app.services.data_loader_processed import ProcessedDataLoader
except ImportError as e:
    print(f"Error: {str(e)}")
    print("\nMissing dependencies. Please install required packages:")
    print("pip install -r requirements.txt")
    sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description='Train a sketch recognition model')
    
    # Add command-line arguments
    parser.add_argument('--data-dir', type=str, 
                        help='Directory containing processed dataset (default: app/datasets/processed)')
    parser.add_argument('--model-dir', type=str, 
                        help='Directory to save models (default: app/models/quickdraw)')
    parser.add_argument('--model-type', type=str, default='simple', 
                        choices=['simple', 'advanced', 'mobilenet'],
                        help='Type of model architecture to use')
    parser.add_argument('--batch-size', type=int, default=64, 
                        help='Batch size for training')
    parser.add_argument('--epochs', type=int, default=20, 
                        help='Number of epochs for training')
    parser.add_argument('--max-per-class', type=int, default=None, 
                        help='Maximum number of images per class to use (for testing)')
    parser.add_argument('--no-augmentation', action='store_true', 
                        help='Disable data augmentation')
    parser.add_argument('--gpu', type=str, default=None, 
                        help='GPU device to use (e.g., "0" or "0,1"), default is to use all available')
    
    args = parser.parse_args()
    
    # Configure GPU usage
    if args.gpu is not None:
        os.environ['CUDA_VISIBLE_DEVICES'] = args.gpu
        logger.info(f"Using GPU device(s): {args.gpu}")
    
    # Check if TensorFlow can see the GPU
    gpus = tf.config.experimental.list_physical_devices('GPU')
    if gpus:
        try:
            for gpu in gpus:
                tf.config.experimental.set_memory_growth(gpu, True)
            logger.info(f"Using {len(gpus)} GPU(s)")
        except RuntimeError as e:
            logger.warning(f"GPU configuration failed: {e}")
    else:
        logger.warning("No GPUs found, using CPU")
    
    # Define directories
    base_dir = Path(__file__).parent
    
    data_dir = args.data_dir
    if data_dir is None:
        data_dir = base_dir / "app" / "datasets" / "processed"
    else:
        data_dir = Path(data_dir)
    
    model_dir = args.model_dir
    if model_dir is None:
        model_dir = base_dir / "app" / "models" / "quickdraw"
    else:
        model_dir = Path(model_dir)
    
    # Ensure model directory exists
    model_dir.mkdir(parents=True, exist_ok=True)
    
    # Load the processed dataset
    try:
        logger.info(f"Loading processed dataset from {data_dir}")
        data_loader = ProcessedDataLoader(data_dir)
        
        # Get data generators
        train_generator, val_generator, test_generator, class_names = data_loader.get_data_generators(
            batch_size=args.batch_size,
            augmentation=not args.no_augmentation,
            max_per_class=args.max_per_class
        )
        
        logger.info(f"Loaded {len(class_names)} categories: {class_names}")
    except Exception as e:
        logger.error(f"Failed to load dataset: {str(e)}")
        sys.exit(1)
    
    # Build the model
    try:
        logger.info(f"Building '{args.model_type}' model architecture")
        model_builder = QuickDrawModelBuilder()
        
        if args.model_type == 'simple':
            model = model_builder.build_simple_cnn(len(class_names))
        elif args.model_type == 'advanced':
            model = model_builder.build_advanced_cnn(len(class_names))
        elif args.model_type == 'mobilenet':
            model = model_builder.build_mobilenet_based(len(class_names))
        else:
            logger.error(f"Unknown model type: {args.model_type}")
            sys.exit(1)
    except Exception as e:
        logger.error(f"Failed to build model: {str(e)}")
        sys.exit(1)
    
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
    
    callbacks_list = [tensorboard_callback, checkpoint_callback]
    
    # Train the model
    try:
        logger.info(f"Training model for {args.epochs} epochs with batch size {args.batch_size}")
        history = model_builder.train(
            train_generator,
            val_generator,
            epochs=args.epochs,
            batch_size=args.batch_size,
            callbacks_list=callbacks_list
        )
    except Exception as e:
        logger.error(f"Failed to train model: {str(e)}")
        sys.exit(1)
    
    # Plot training history
    history_plot_path = model_dir / f"training_history_{args.model_type}_{timestamp}.png"
    model_builder.plot_training_history(save_path=str(history_plot_path))
    
    # Evaluate the model on test data
    try:
        logger.info("Evaluating model on test data")
        metrics = model_builder.evaluate(test_generator)
        logger.info(f"Test accuracy: {metrics.get('accuracy', 0):.4f}")
    except Exception as e:
        logger.error(f"Failed to evaluate model: {str(e)}")
    
    # Save the final model with metadata
    try:
        logger.info(f"Saving model to {model_path}")
        result = model_builder.save_model(str(model_path), class_names=class_names)
        logger.info(f"Model saved successfully")
    except Exception as e:
        logger.error(f"Failed to save model: {str(e)}")
    
    # Print training summary
    print("\nTraining Summary:")
    print(f"Model type: {args.model_type}")
    print(f"Dataset: {len(class_names)} categories, "
          f"{train_generator.n} training samples, "
          f"{val_generator.n} validation samples, "
          f"{test_generator.n} test samples")
    print(f"Best validation accuracy: {max(model_builder.history.get('val_accuracy', [0])):.4f}")
    print(f"Test accuracy: {metrics.get('accuracy', 0):.4f}")
    print(f"Model saved to: {model_path}")
    print(f"Training history plot: {history_plot_path}")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logger.info("Training interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unhandled exception: {str(e)}")
        sys.exit(1)
