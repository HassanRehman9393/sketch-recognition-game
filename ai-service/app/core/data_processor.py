import os
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from pathlib import Path
import logging
from datetime import datetime
import cv2
import random
import shutil

# Try to import tqdm for progress bars
try:
    from tqdm import tqdm
    TQDM_AVAILABLE = True
except ImportError:
    TQDM_AVAILABLE = False
    print("tqdm not available, install with: pip install tqdm")
    # Simple fallback for tqdm
    class SimpleTqdm:
        def __init__(self, iterable=None, **kwargs):
            self.iterable = iterable
            self.total = kwargs.get('total', 0) if iterable is None else len(iterable)
            self.desc = kwargs.get('desc', '')
            self.current = 0
            
        def __iter__(self):
            self.current = 0
            print(f"Processing {self.desc}...")
            return self
            
        def __next__(self):
            if self.iterable is None:
                raise StopIteration
                
            if self.current >= len(self.iterable):
                print(f"Completed {self.desc}")
                raise StopIteration
                
            item = self.iterable[self.current]
            self.current += 1
            # Print progress every 100 items
            if self.current % 100 == 0:
                print(f"{self.desc}: {self.current}/{len(self.iterable)} ({self.current * 100 // len(self.iterable)}%)")
                
            return item
        
        def update(self, n=1):
            self.current += n

# Use the appropriate tqdm class
progress_bar = tqdm if TQDM_AVAILABLE else SimpleTqdm

from .data_loader import QuickDrawDataLoader, CATEGORIES
from ..utils.image_utils import strokes_to_image, normalize_sketch

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger('data_processor')

class QuickDrawDataProcessor:
    def __init__(self, raw_data_dir, processed_data_dir):
        """
        Initialize the QuickDrawDataProcessor
        
        Args:
            raw_data_dir (str): Directory containing raw dataset files
            processed_data_dir (str): Directory to store processed dataset files
        """
        self.raw_data_dir = Path(raw_data_dir)
        self.processed_data_dir = Path(processed_data_dir)
        
        # Create processed directories structure
        self.processed_data_dir.mkdir(parents=True, exist_ok=True)
        
        # Directory for all processed images
        self.images_dir = self.processed_data_dir / "images"
        self.images_dir.mkdir(exist_ok=True)
        
        # Directories for dataset splits
        self.train_dir = self.processed_data_dir / "train"
        self.valid_dir = self.processed_data_dir / "valid"
        self.test_dir = self.processed_data_dir / "test"
        
        self.train_dir.mkdir(exist_ok=True)
        self.valid_dir.mkdir(exist_ok=True)
        self.test_dir.mkdir(exist_ok=True)
        
        # Directory for visualizations
        self.viz_dir = self.processed_data_dir / "visualizations"
        self.viz_dir.mkdir(exist_ok=True)
        
        # Statistics
        self.stats = {
            'processed_categories': 0,
            'processed_drawings': 0,
            'invalid_drawings': 0,
            'processing_time': 0,
            'train_samples': 0,
            'valid_samples': 0,
            'test_samples': 0
        }
    
    def process_category(self, category, max_samples=None, visualize=False):
        """
        Process a single category of drawings
        
        Args:
            category (str): Category name
            max_samples (int, optional): Maximum number of samples to process
            visualize (bool): Whether to visualize some examples
            
        Returns:
            dict: Processing statistics
        """
        start_time = datetime.now()
        
        # Find the category file (handle both regular and limited files)
        category_file = None
        for file_pattern in [f"{category}.ndjson", f"{category}_*.ndjson"]:
            matching_files = list(self.raw_data_dir.glob(file_pattern))
            if matching_files:
                category_file = matching_files[0]
                break
                
        if not category_file:
            logger.error(f"Category file for '{category}' not found")
            return {'status': 'error', 'message': 'Category file not found'}
        
        logger.info(f"Processing category: {category} from {category_file.name}")
        
        # Create category directory in processed/images
        category_dir = self.images_dir / category
        category_dir.mkdir(exist_ok=True)
        
        # Process the drawings
        processed_count = 0
        invalid_count = 0
        
        # Count lines in file first (for progress reporting)
        total_lines = sum(1 for _ in open(category_file, 'r', encoding='utf-8'))
        if max_samples:
            total_lines = min(total_lines, max_samples)
        
        # Open and process the file
        with open(category_file, 'r', encoding='utf-8') as f:
            # Use progress bar
            for i, line in enumerate(progress_bar(f, total=total_lines, desc=f"Processing {category}")):
                if max_samples and i >= max_samples:
                    break
                    
                try:
                    # Parse the JSON line
                    drawing_data = json.loads(line)
                    
                    # Extract stroke data
                    stroke_data = self._extract_strokes(drawing_data)
                    
                    if stroke_data:
                        # Generate a unique ID for the drawing
                        drawing_id = drawing_data.get('key_id', f"{category}_{i}")
                        
                        # Convert strokes to image (original size)
                        stroke_img = strokes_to_image(stroke_data, image_size=(256, 256))
                        
                        # Save the original size image
                        orig_path = category_dir / f"{drawing_id}_orig.png"
                        cv2.imwrite(str(orig_path), cv2.cvtColor(stroke_img, cv2.COLOR_RGB2BGR))
                        
                        # Create and save the normalized version for training (28x28)
                        norm_img = normalize_sketch(stroke_img)
                        # Resize to exactly 28x28 for model training
                        norm_img = cv2.resize(norm_img, (28, 28))
                        
                        # Save as PNG (scale back to 0-255 range)
                        norm_path = category_dir / f"{drawing_id}_norm.png"
                        cv2.imwrite(str(norm_path), norm_img * 255)
                        
                        # Save stroke data as JSON for potential future use
                        with open(category_dir / f"{drawing_id}_strokes.json", 'w') as sf:
                            json.dump({'strokes': stroke_data}, sf)
                            
                        processed_count += 1
                    else:
                        invalid_count += 1
                        
                except Exception as e:
                    logger.error(f"Error processing drawing {i} in {category}: {str(e)}")
                    invalid_count += 1
        
        # Visualize some examples if requested
        if visualize and processed_count > 0:
            self._visualize_category(category, category_dir)
        
        # Update statistics
        self.stats['processed_categories'] += 1
        self.stats['processed_drawings'] += processed_count
        self.stats['invalid_drawings'] += invalid_count
        
        processing_time = (datetime.now() - start_time).total_seconds()
        self.stats['processing_time'] += processing_time
        
        logger.info(f"Processed {processed_count} drawings for {category} "
                    f"({invalid_count} invalid) in {processing_time:.2f}s")
        
        return {
            'status': 'success',
            'category': category,
            'processed': processed_count,
            'invalid': invalid_count,
            'time': processing_time
        }
    
    def _extract_strokes(self, drawing_data):
        """
        Extract stroke data from drawing data
        
        Args:
            drawing_data (dict): Drawing data from NDJSON file
            
        Returns:
            list: List of strokes, each containing x,y coordinates
        """
        try:
            # Get the stroke data
            strokes = drawing_data.get('drawing', [])
            
            if not strokes:
                return None
                
            # Extract X,Y coordinates from each stroke
            formatted_strokes = []
            for stroke in strokes:
                # Each stroke should have x and y coordinates
                if len(stroke) >= 2:
                    x_coords = stroke[0]
                    y_coords = stroke[1]
                    
                    if len(x_coords) != len(y_coords) or len(x_coords) == 0:
                        continue
                        
                    formatted_strokes.append((x_coords, y_coords))
            
            return formatted_strokes if formatted_strokes else None
            
        except Exception as e:
            logger.error(f"Error extracting strokes: {str(e)}")
            return None
    
    def _visualize_category(self, category, category_dir, num_examples=5):
        """
        Visualize a few examples from a processed category
        
        Args:
            category (str): Category name
            category_dir (Path): Directory containing processed images
            num_examples (int): Number of examples to visualize
        """
        try:
            # Get original and normalized images
            orig_imgs = list(category_dir.glob("*_orig.png"))
            
            # Select random examples
            if len(orig_imgs) > num_examples:
                examples = random.sample(orig_imgs, num_examples)
            else:
                examples = orig_imgs
            
            if not examples:
                return
                
            # Create figure with two rows - top row for original, bottom row for normalized
            fig, axes = plt.subplots(2, len(examples), figsize=(15, 6))
                
            for i, img_path in enumerate(examples):
                # Load and display the original image
                orig_img = cv2.imread(str(img_path))
                orig_img = cv2.cvtColor(orig_img, cv2.COLOR_BGR2RGB)
                axes[0, i].imshow(orig_img)
                axes[0, i].set_title(f"Original")
                axes[0, i].axis('off')
                
                # Load and display the normalized image
                norm_path = img_path.parent / img_path.name.replace("_orig", "_norm")
                if norm_path.exists():
                    norm_img = cv2.imread(str(norm_path))
                    if norm_img is not None:
                        norm_img = cv2.cvtColor(norm_img, cv2.COLOR_BGR2RGB)
                        axes[1, i].imshow(norm_img)
                        axes[1, i].set_title(f"Normalized (28x28)")
                        axes[1, i].axis('off')
            
            plt.suptitle(f"Examples of processed '{category}' drawings")
            plt.tight_layout()
            
            # Save the visualization
            fig.savefig(str(self.viz_dir / f"{category}_examples.png"))
            plt.close(fig)
            
            logger.info(f"Saved visualization for {category} to {self.viz_dir / f'{category}_examples.png'}")
            
        except Exception as e:
            logger.error(f"Error visualizing category: {str(e)}")
    
    def split_dataset(self, train_ratio=0.7, valid_ratio=0.15, test_ratio=0.15, seed=42):
        """
        Split the processed dataset into train, validation, and test sets
        
        Args:
            train_ratio (float): Ratio of training data
            valid_ratio (float): Ratio of validation data
            test_ratio (float): Ratio of test data
            seed (int): Random seed for reproducibility
            
        Returns:
            dict: Split statistics
        """
        assert abs(train_ratio + valid_ratio + test_ratio - 1.0) < 1e-10, "Ratios must sum to 1"
        
        random.seed(seed)
        np.random.seed(seed)
        
        logger.info("Splitting dataset into train, validation, and test sets")
        
        # Get all processed categories
        categories = [d.name for d in self.images_dir.iterdir() if d.is_dir()]
        
        if not categories:
            logger.error("No processed categories found")
            return {'status': 'error', 'message': 'No processed categories found'}
            
        split_stats = {
            'train': 0,
            'valid': 0,
            'test': 0,
            'categories': len(categories)
        }
        
        for category in categories:
            category_dir = self.images_dir / category
            
            # Get all normalized images
            norm_imgs = list(category_dir.glob("*_norm.png"))
            
            if not norm_imgs:
                logger.warning(f"No normalized images found for {category}")
                continue
                
            # Shuffle the images
            random.shuffle(norm_imgs)
            
            # Calculate split sizes
            n_total = len(norm_imgs)
            n_train = int(n_total * train_ratio)
            n_valid = int(n_total * valid_ratio)
            n_test = n_total - n_train - n_valid
            
            # Split the dataset
            train_imgs = norm_imgs[:n_train]
            valid_imgs = norm_imgs[n_train:n_train+n_valid]
            test_imgs = norm_imgs[n_train+n_valid:]
            
            # Create category directories in each split
            (self.train_dir / category).mkdir(exist_ok=True)
            (self.valid_dir / category).mkdir(exist_ok=True)
            (self.test_dir / category).mkdir(exist_ok=True)
            
            # Copy images to their respective directories
            # For train set
            self._copy_images_to_split(train_imgs, self.train_dir / category, category)
            
            # For validation set
            self._copy_images_to_split(valid_imgs, self.valid_dir / category, category)
            
            # For test set
            self._copy_images_to_split(test_imgs, self.test_dir / category, category)
            
            # Update statistics
            split_stats['train'] += len(train_imgs)
            split_stats['valid'] += len(valid_imgs)
            split_stats['test'] += len(test_imgs)
            
            # Update global stats
            self.stats['train_samples'] += len(train_imgs)
            self.stats['valid_samples'] += len(valid_imgs)
            self.stats['test_samples'] += len(test_imgs)
            
            logger.info(f"Split {category}: {len(train_imgs)} train, "
                        f"{len(valid_imgs)} valid, {len(test_imgs)} test")
        
        logger.info(f"Dataset split complete. "
                    f"Train: {split_stats['train']}, "
                    f"Valid: {split_stats['valid']}, "
                    f"Test: {split_stats['test']}")
        
        # Create visualization of dataset distribution
        self._visualize_dataset_distribution(categories)
        
        return {
            'status': 'success',
            'stats': split_stats
        }
        
    def _copy_images_to_split(self, images, target_dir, category):
        """Helper to copy images to train/valid/test directories"""
        for img in images:
            dest = target_dir / img.name
            if not dest.exists():
                try:
                    # Try to use hard link to save space
                    os.link(img, dest)
                except:
                    # Fall back to copy if linking fails
                    shutil.copy2(img, dest)
    
    def _visualize_dataset_distribution(self, categories):
        """Create a visualization of the dataset distribution"""
        try:
            # Collect data for each category
            cat_data = []
            for cat in categories:
                train_count = len(list((self.train_dir / cat).glob("*.png")))
                valid_count = len(list((self.valid_dir / cat).glob("*.png")))
                test_count = len(list((self.test_dir / cat).glob("*.png")))
                cat_data.append({
                    'category': cat,
                    'train': train_count,
                    'valid': valid_count,
                    'test': test_count,
                    'total': train_count + valid_count + test_count
                })
            
            # Sort by total count
            cat_data.sort(key=lambda x: x['total'], reverse=True)
            
            # Create DataFrame
            df = pd.DataFrame(cat_data)
            
            # Plot distribution
            plt.figure(figsize=(12, 8))
            
            train_bars = plt.bar(df['category'], df['train'], label='Train')
            valid_bars = plt.bar(df['category'], df['valid'], bottom=df['train'], label='Validation')
            test_bars = plt.bar(df['category'], df['test'], 
                               bottom=df['train'] + df['valid'], label='Test')
            
            plt.title('Dataset Distribution by Category')
            plt.xlabel('Category')
            plt.ylabel('Number of Images')
            plt.xticks(rotation=45, ha='right')
            plt.legend()
            plt.tight_layout()
            
            # Save visualization
            plt.savefig(str(self.viz_dir / "dataset_distribution.png"))
            plt.close()
            
            logger.info(f"Dataset distribution visualization saved to {self.viz_dir / 'dataset_distribution.png'}")
        except Exception as e:
            logger.error(f"Error creating dataset distribution visualization: {str(e)}")
    
    def process_all_categories(self, max_samples_per_category=None, visualize=True):
        """
        Process all available categories
        
        Args:
            max_samples_per_category (int, optional): Maximum samples per category
            visualize (bool): Whether to visualize examples
            
        Returns:
            dict: Processing statistics
        """
        start_time = datetime.now()
        
        # Get list of available categories
        loader = QuickDrawDataLoader(self.raw_data_dir, self.processed_data_dir)
        available_categories = loader.list_available_categories()
        
        if not available_categories:
            logger.error("No categories available for processing")
            return {'status': 'error', 'message': 'No categories available'}
        
        logger.info(f"Processing {len(available_categories)} categories")
        
        # Process each category
        for category in available_categories:
            self.process_category(category, max_samples_per_category, visualize)
        
        # Split the dataset
        split_result = self.split_dataset()
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        logger.info(f"All processing completed in {processing_time:.2f}s")
        logger.info(f"Processed {self.stats['processed_drawings']} drawings across "
                   f"{self.stats['processed_categories']} categories")
        logger.info(f"Split into {self.stats['train_samples']} train, "
                   f"{self.stats['valid_samples']} validation, "
                   f"{self.stats['test_samples']} test samples")
        
        return {
            'status': 'success',
            'stats': self.stats,
            'processing_time': processing_time
        }

# For direct execution of this module
if __name__ == "__main__":
    # Define base paths
    base_dir = Path(__file__).parent.parent / "datasets"
    raw_dir = base_dir / "raw"
    processed_dir = base_dir / "processed"
    
    # Ensure directories exist
    raw_dir.mkdir(parents=True, exist_ok=True)
    processed_dir.mkdir(parents=True, exist_ok=True)
    
    # Create processor
    processor = QuickDrawDataProcessor(raw_dir, processed_dir)
    
    # Process all available categories with a limit per category
    result = processor.process_all_categories(max_samples_per_category=1000)
    
    print("\nProcessing Results:")
    print(f"Status: {result['status']}")
    if result['status'] == 'success':
        print(f"Processed {result['stats']['processed_categories']} categories")
        print(f"Processed {result['stats']['processed_drawings']} drawings")
        print(f"Invalid drawings: {result['stats']['invalid_drawings']}")
        print(f"Total processing time: {result['processing_time']:.2f}s")
        print(f"Dataset splits: {result['stats']['train_samples']} train, "
             f"{result['stats']['valid_samples']} validation, "
             f"{result['stats']['test_samples']} test")
