import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
import imgaug.augmenters as iaa
import cv2

class SketchAugmentation:
    """
    Advanced augmentation techniques specifically designed for sketch recognition
    """
    
    def __init__(self, input_shape=(28, 28, 1)):
        """
        Initialize sketch augmentation
        
        Args:
            input_shape: Shape of input images
        """
        self.input_shape = input_shape
        
    def get_training_augmentation(self):
        """
        Get a data generator for training with sketch-specific augmentations
        
        Returns:
            ImageDataGenerator: Augmented training data generator
        """
        return ImageDataGenerator(
            # Basic augmentations
            rotation_range=15,
            width_shift_range=0.1,
            height_shift_range=0.1,
            zoom_range=0.1,
            
            # Preprocessing function for sketch-specific augmentations
            preprocessing_function=self._sketch_augment
        )
    
    def get_test_time_augmentation(self, batch_x):
        """
        Apply test-time augmentation and average the predictions
        
        Args:
            batch_x: Batch of input images
            
        Returns:
            np.ndarray: Augmented batch with multiple versions of each image
        """
        augmentations = []
        
        # Original images
        augmentations.append(batch_x)
        
        # Brightness variations
        aug1 = tf.image.adjust_brightness(batch_x, delta=0.1)
        aug2 = tf.image.adjust_brightness(batch_x, delta=-0.1)
        augmentations.extend([aug1, aug2])
        
        # Small rotations
        for angle in [5, -5]:
            aug = tfa.image.rotate(batch_x, angles=angle * np.pi / 180)
            augmentations.append(aug)
        
        # Small shifts
        for shift in [1, 2]:
            # Right shift
            aug = tf.roll(batch_x, shift=shift, axis=2)
            augmentations.append(aug)
            # Left shift
            aug = tf.roll(batch_x, shift=-shift, axis=2)
            augmentations.append(aug)
            # Down shift
            aug = tf.roll(batch_x, shift=shift, axis=1)
            augmentations.append(aug)
            # Up shift
            aug = tf.roll(batch_x, shift=-shift, axis=1)
            augmentations.append(aug)
        
        return np.concatenate(augmentations, axis=0)
    
    def _sketch_augment(self, image):
        """
        Apply sketch-specific augmentation to a single image
        
        Args:
            image: Input image
            
        Returns:
            np.ndarray: Augmented image
        """
        # Convert to uint8 for imgaug
        orig_dtype = image.dtype
        if image.max() <= 1.0 and orig_dtype != np.uint8:
            image = (image * 255).astype(np.uint8)
            
        # Create augmentation sequence
        sometimes = lambda aug: iaa.Sometimes(0.5, aug)
        
        # Sketch-specific augmentation sequence
        seq = iaa.Sequential([
            # Elastic distortion (simulates hand drawing variations)
            sometimes(iaa.ElasticTransformation(alpha=(0.5, 1.5), sigma=0.25)),
            
            # Line thickness variations
            sometimes(iaa.OneOf([
                iaa.Multiply((0.8, 1.2)),  # Thicker/thinner lines
                iaa.JpegCompression(compression=(70, 90)),  # Add compression artifacts
            ])),
            
            # Simulate different pressure/intensity in drawing
            sometimes(iaa.OneOf([
                iaa.LinearContrast((0.75, 1.25)),
                iaa.Sharpen(alpha=(0, 0.4)),  # Sharpen edges
            ])),
            
            # Noise and artifacts (common in scanned or captured sketches)
            sometimes(iaa.OneOf([
                iaa.AdditiveGaussianNoise(scale=(0, 0.05*255)),  # Slight noise
                iaa.SaltAndPepper(0.02),  # Salt and pepper noise
                iaa.GaussianBlur(sigma=(0.0, 0.5)),  # Slight blur
            ])),
            
            # Edge variations (simulates different pen types)
            sometimes(iaa.OneOf([
                iaa.Canny(alpha=(0.5, 1.0)),  # Edge enhancement
                iaa.Erosion(size=(1, 1)),  # Erode edges slightly
                iaa.Dilation(size=(1, 1)),  # Dilate edges slightly
            ])),
        ])
        
        # Apply augmentations
        image = seq(images=image[np.newaxis, ...])[0]
        
        # Convert back to original dtype
        if orig_dtype != np.uint8:
            image = image.astype(np.float32) / 255.0
            
        return image
    
    def create_stroke_width_variations(self, image):
        """
        Create variations of the same sketch with different stroke widths
        
        Args:
            image: Input sketch image
            
        Returns:
            list: List of images with different stroke widths
        """
        variations = [image]  # Include original
        
        # Convert to binary image
        if image.dtype != np.uint8:
            img_uint8 = (image * 255).astype(np.uint8)
        else:
            img_uint8 = image.copy()
            
        # Ensure image is binary (thresholding)
        if len(img_uint8.shape) > 2 and img_uint8.shape[-1] == 1:
            img_uint8 = img_uint8.squeeze()
            
        _, binary = cv2.threshold(img_uint8, 127, 255, cv2.THRESH_BINARY)
        
        # Create thinner strokes
        kernel = np.ones((2, 2), np.uint8)
        thinner = cv2.erode(binary, kernel, iterations=1)
        
        # Create thicker strokes
        thicker = cv2.dilate(binary, kernel, iterations=1)
        
        # Convert back to original format
        if image.dtype != np.uint8:
            thinner = thinner.astype(np.float32) / 255.0
            thicker = thicker.astype(np.float32) / 255.0
        
        # Add channel dimension if needed
        if len(image.shape) > 2 and image.shape[-1] == 1:
            thinner = np.expand_dims(thinner, axis=-1)
            thicker = np.expand_dims(thicker, axis=-1)
        
        variations.extend([thinner, thicker])
        return variations
        
    def simulate_real_sketch(self, image):
        """
        Simulate a real hand-drawn sketch from a clean image
        
        Args:
            image: Clean input sketch image
            
        Returns:
            np.ndarray: Simulated hand-drawn sketch
        """
        # Convert to uint8 for OpenCV
        if image.dtype != np.uint8:
            img_uint8 = (image * 255).astype(np.uint8)
        else:
            img_uint8 = image.copy()
            
        # Ensure image is grayscale
        if len(img_uint8.shape) > 2 and img_uint8.shape[-1] == 1:
            img_uint8 = img_uint8.squeeze()
        
        # Apply transformations to simulate hand drawing
        # 1. Add slight perspective transform
        rows, cols = img_uint8.shape
        pts1 = np.float32([[0, 0], [cols, 0], [0, rows], [cols, rows]])
        
        # Random perspective shift
        shift = 2
        pts2 = np.float32([
            [np.random.randint(0, shift), np.random.randint(0, shift)], 
            [cols - np.random.randint(0, shift), np.random.randint(0, shift)],
            [np.random.randint(0, shift), rows - np.random.randint(0, shift)],
            [cols - np.random.randint(0, shift), rows - np.random.randint(0, shift)]
        ])
        
        M = cv2.getPerspectiveTransform(pts1, pts2)
        warped = cv2.warpPerspective(img_uint8, M, (cols, rows))
        
        # 2. Add texture noise to simulate paper
        noise = np.random.normal(0, 2, warped.shape).astype(np.uint8)
        textured = cv2.add(warped, noise)
        
        # 3. Add slight blur to simulate drawing imprecision
        simulated = cv2.GaussianBlur(textured, (3, 3), 0.5)
        
        # Convert back to original format
        if image.dtype != np.uint8:
            simulated = simulated.astype(np.float32) / 255.0
            
        # Add channel dimension if needed
        if len(image.shape) > 2 and image.shape[-1] == 1:
            simulated = np.expand_dims(simulated, axis=-1)
            
        return simulated
