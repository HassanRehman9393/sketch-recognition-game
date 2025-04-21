import os
import numpy as np
import tensorflow as tf
from pathlib import Path
import cv2
import random
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger('data_loader_processed')

class ProcessedDataLoader:
    def __init__(self, processed_data_dir):
        """
        Initialize the ProcessedDataLoader
        
        Args:
            processed_data_dir (str): Directory containing processed dataset
        """
        self.processed_dir = Path(processed_data_dir)
        self.train_dir = self.processed_dir / "train"
        self.valid_dir = self.processed_dir / "valid" 
        self.test_dir = self.processed_dir / "test"
        
        # Verify directories exist
        if not self.processed_dir.exists():
            logger.error(f"Processed data directory not found: {self.processed_dir}")
            raise FileNotFoundError(f"Directory not found: {self.processed_dir}")
            
        if not all(d.exists() for d in [self.train_dir, self.valid_dir, self.test_dir]):
            logger.error("One or more dataset split directories not found")
            raise FileNotFoundError("Dataset split directories not found")
            
        # Get class names (category folders)
        self.class_names = self._get_class_names()
        self.num_classes = len(self.class_names)
        logger.info(f"Found {self.num_classes} classes: {', '.join(self.class_names)}")
        
        # Create class index mapping
        self.class_to_index = {class_name: i for i, class_name in enumerate(self.class_names)}
        self.index_to_class = {i: class_name for i, class_name in enumerate(self.class_names)}
    
    def _get_class_names(self):
        """Get sorted list of class names from the training directory"""
        class_names = sorted([d.name for d in self.train_dir.iterdir() if d.is_dir()])
        if not class_names:
            logger.error("No class directories found in training directory")
            raise ValueError("No classes found in dataset")
        return class_names
    
    def load_images(self, split_dir, max_per_class=None):
        """
        Load images and labels from the specified split directory
        
        Args:
            split_dir (Path): Directory containing the dataset split
            max_per_class (int, optional): Maximum number of images to load per class
            
        Returns:
            tuple: (images, labels, filenames)
        """
        images = []
        labels = []
        filenames = []
        
        for class_name in self.class_names:
            class_dir = split_dir / class_name
            if not class_dir.exists():
                logger.warning(f"Class directory {class_name} not found in {split_dir}, skipping")
                continue
                
            # Get all image files
            image_files = list(class_dir.glob("*.png"))
            
            if max_per_class is not None and max_per_class < len(image_files):
                image_files = random.sample(image_files, max_per_class)
            
            # Load each image
            for img_path in image_files:
                try:
                    # Load and normalize image
                    img = cv2.imread(str(img_path), cv2.IMREAD_GRAYSCALE)
                    if img is None:
                        logger.warning(f"Failed to load image: {img_path}")
                        continue
                        
                    # Normalize to [0, 1]
                    img = img.astype(np.float32) / 255.0
                    
                    # Reshape to add channel dimension
                    img = np.expand_dims(img, axis=-1)
                    
                    # Create one-hot encoded label
                    label = np.zeros(self.num_classes)
                    label[self.class_to_index[class_name]] = 1
                    
                    images.append(img)
                    labels.append(label)
                    filenames.append(img_path.name)
                    
                except Exception as e:
                    logger.error(f"Error loading image {img_path}: {str(e)}")
            
        if not images:
            logger.error(f"No valid images found in {split_dir}")
            return np.array([]), np.array([]), []
            
        logger.info(f"Loaded {len(images)} images from {split_dir}")
        
        return np.array(images), np.array(labels), filenames
    
    def load_dataset(self, max_per_class=None):
        """
        Load the complete dataset (train, validation, test)
        
        Args:
            max_per_class (int, optional): Maximum number of images to load per class
            
        Returns:
            dict: Dictionary containing dataset splits
        """
        logger.info("Loading dataset")
        
        # Load each split
        X_train, y_train, train_filenames = self.load_images(self.train_dir, max_per_class)
        X_val, y_val, val_filenames = self.load_images(self.valid_dir, max_per_class)
        X_test, y_test, test_filenames = self.load_images(self.test_dir, max_per_class)
        
        if len(X_train) == 0 or len(X_val) == 0 or len(X_test) == 0:
            logger.error("One or more dataset splits are empty")
            raise ValueError("Empty dataset split found")
        
        logger.info(f"Dataset loaded: {X_train.shape[0]} training, {X_val.shape[0]} validation, {X_test.shape[0]} test images")
        
        return {
            'train': (X_train, y_train, train_filenames),
            'validation': (X_val, y_val, val_filenames),
            'test': (X_test, y_test, test_filenames),
            'class_names': self.class_names,
            'class_to_index': self.class_to_index,
            'index_to_class': self.index_to_class
        }
    
    def create_tf_dataset(self, split='train', batch_size=32, shuffle=True, max_per_class=None):
        """
        Create a TensorFlow dataset for the specified split
        
        Args:
            split (str): Dataset split ('train', 'validation', or 'test')
            batch_size (int): Batch size
            shuffle (bool): Whether to shuffle the dataset
            max_per_class (int, optional): Maximum number of images to load per class
            
        Returns:
            tf.data.Dataset: TensorFlow dataset
        """
        # Map split name to directory
        split_dir_map = {
            'train': self.train_dir,
            'validation': self.valid_dir,
            'test': self.test_dir
        }
        
        if split not in split_dir_map:
            logger.error(f"Invalid split name: {split}")
            raise ValueError(f"Invalid split: {split}. Expected 'train', 'validation', or 'test'")
            
        # Load images and labels
        images, labels, _ = self.load_images(split_dir_map[split], max_per_class)
        
        if len(images) == 0:
            logger.error(f"No images loaded for {split} split")
            raise ValueError(f"No images found in {split} dataset")
        
        # Create TensorFlow dataset
        dataset = tf.data.Dataset.from_tensor_slices((images, labels))
        
        # Shuffle if requested
        if shuffle:
            dataset = dataset.shuffle(buffer_size=len(images))
        
        # Batch the dataset
        dataset = dataset.batch(batch_size)
        
        # Prefetch for performance
        dataset = dataset.prefetch(tf.data.experimental.AUTOTUNE)
        
        logger.info(f"Created {split} dataset with {len(images)} images, batch size {batch_size}")
        
        return dataset
    
    def get_data_generators(self, batch_size=32, augmentation=True, max_per_class=None):
        """
        Create data generators with optional augmentation
        
        Args:
            batch_size (int): Batch size
            augmentation (bool): Whether to apply data augmentation
            max_per_class (int, optional): Maximum number of images to load per class
            
        Returns:
            tuple: (train_gen, val_gen, test_gen, class_names)
        """
        # Load the dataset
        dataset = self.load_dataset(max_per_class)
        X_train, y_train = dataset['train'][:2]
        X_val, y_val = dataset['validation'][:2]
        X_test, y_test = dataset['test'][:2]
        
        # Create ImageDataGenerator for training with augmentation
        if augmentation:
            train_datagen = tf.keras.preprocessing.image.ImageDataGenerator(
                rotation_range=10,
                width_shift_range=0.1,
                height_shift_range=0.1,
                zoom_range=0.1,
                horizontal_flip=True,
                vertical_flip=False,
                rescale=1./255 if X_train.max() > 1.0 else None,  # Only rescale if not already normalized
                fill_mode='nearest'
            )
        else:
            train_datagen = tf.keras.preprocessing.image.ImageDataGenerator(
                rescale=1./255 if X_train.max() > 1.0 else None
            )
        
        # Create ImageDataGenerator for validation and test (no augmentation)
        val_datagen = tf.keras.preprocessing.image.ImageDataGenerator(
            rescale=1./255 if X_val.max() > 1.0 else None
        )
        
        test_datagen = tf.keras.preprocessing.image.ImageDataGenerator(
            rescale=1./255 if X_test.max() > 1.0 else None
        )
        
        # Create generators
        train_generator = train_datagen.flow(
            X_train, y_train,
            batch_size=batch_size,
            shuffle=True
        )
        
        val_generator = val_datagen.flow(
            X_val, y_val,
            batch_size=batch_size,
            shuffle=False
        )
        
        test_generator = test_datagen.flow(
            X_test, y_test,
            batch_size=batch_size,
            shuffle=False
        )
        
        logger.info(f"Created data generators with batch size {batch_size}, augmentation: {augmentation}")
        logger.info(f"Training samples: {X_train.shape[0]}, validation samples: {X_val.shape[0]}, test samples: {X_test.shape[0]}")
        
        return train_generator, val_generator, test_generator, dataset['class_names']
