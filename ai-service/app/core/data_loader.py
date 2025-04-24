import os
import requests
import json
import gzip
import shutil
import time
import numpy as np
from pathlib import Path
import logging
from datetime import datetime

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger('data_loader')

# Try to import tqdm for progress bars
try:
    from tqdm import tqdm
    TQDM_AVAILABLE = True
except ImportError:
    TQDM_AVAILABLE = False
    logger.warning("tqdm not available, progress bars will not be shown. Install with: pip install tqdm")
    # Simple fallback for tqdm
    class SimpleTqdm:
        def __init__(self, **kwargs):
            self.total = kwargs.get('total', 0)
            self.desc = kwargs.get('desc', '')
            self.current = 0
            self.last_print = 0
        
        def __enter__(self):
            print(f"Downloading {self.desc}...")
            return self
        
        def __exit__(self, *args):
            print(f"Completed {self.desc}")
        
        def update(self, value):
            self.current += value
            # Print progress every 10MB
            if self.current - self.last_print > 10 * 1024 * 1024 and self.total:
                percent = int((self.current / self.total) * 100)
                print(f"  {self.desc}: {percent}% ({self.current // (1024 * 1024)}MB / {self.total // (1024 * 1024)}MB)")

# Selected categories (10-15 common objects)
CATEGORIES = [
    'apple', 'bicycle', 'car', 'cat', 'chair',
    'dog', 'face', 'fish', 'house', 'tree',
    'umbrella', 'airplane', 'clock', 'star'
]

# Base URL for Quick Draw raw data
BASE_URL = "https://storage.googleapis.com/quickdraw_dataset/full/raw/"

class QuickDrawDataLoader:
    def __init__(self, raw_data_dir, processed_data_dir, backup_dir=None):
        """
        Initialize the QuickDrawDataLoader
        
        Args:
            raw_data_dir (str): Directory to store raw dataset files
            processed_data_dir (str): Directory to store processed dataset files
            backup_dir (str, optional): Directory for backups. If None, backups are stored in raw_data_dir/backup
        """
        self.raw_data_dir = Path(raw_data_dir)
        self.processed_data_dir = Path(processed_data_dir)
        
        # Create directories if they don't exist
        self.raw_data_dir.mkdir(parents=True, exist_ok=True)
        self.processed_data_dir.mkdir(parents=True, exist_ok=True)
        
        # Set up backup directory
        if backup_dir:
            self.backup_dir = Path(backup_dir)
        else:
            self.backup_dir = self.raw_data_dir / "backup"
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        # Keep track of downloaded files
        self.download_status = {}
    
    def download_dataset(self, categories=None, max_retries=3, timeout=30, max_images_per_category=None):
        """
        Download the raw dataset for specified categories
        
        Args:
            categories (list, optional): List of categories to download. If None, use default CATEGORIES
            max_retries (int): Maximum number of retries for failed downloads
            timeout (int): Timeout for download requests in seconds
            max_images_per_category (int, optional): Maximum number of images to download per category
            
        Returns:
            dict: Status of downloads for each category
        """
        if categories is None:
            categories = CATEGORIES
            
        logger.info(f"Starting download of {len(categories)} categories")
        
        # Check available disk space
        free_space = self._get_free_disk_space(self.raw_data_dir)
        
        # Estimate size differently if we're limiting images
        if max_images_per_category:
            # Each stroke data is roughly ~1KB on average
            estimated_size = len(categories) * max_images_per_category * 1 / 1024  # Convert KB to MB
            logger.info(f"Downloading limited dataset: {max_images_per_category} images per category")
        else:
            estimated_size = len(categories) * 250  # Rough estimate: ~250MB per category for full dataset
        
        if free_space < estimated_size + 1000:  # Add 1GB buffer
            logger.warning(f"Low disk space: {free_space}MB available, estimated need: {estimated_size}MB")
            if free_space < estimated_size:
                logger.error("Not enough disk space to download the dataset")
                return {'status': 'error', 'message': 'Not enough disk space'}
        
        for category in categories:
            if max_images_per_category:
                # Use a different filename format when limiting images
                file_path = self.raw_data_dir / f"{category}_{max_images_per_category}.ndjson"
            else:
                file_path = self.raw_data_dir / f"{category}.ndjson"
            
            # Skip if file already exists and is valid
            if file_path.exists() and self._is_file_valid(file_path):
                if max_images_per_category:
                    # Check if the file has approximately the right number of images
                    with open(file_path, 'r', encoding='utf-8') as f:
                        line_count = sum(1 for _ in f)
                    if abs(line_count - max_images_per_category) <= 10:  # Allow small margin of error
                        logger.info(f"Category '{category}' with {line_count} images already downloaded")
                        self.download_status[category] = 'complete'
                        continue
                    else:
                        logger.info(f"Found {category} but with {line_count} images instead of {max_images_per_category}. Re-downloading...")
                else:
                    logger.info(f"Category '{category}' already downloaded")
                    self.download_status[category] = 'complete'
                    continue
            
            url = f"{BASE_URL}{category}.ndjson"
            
            # Try downloading with retries
            for attempt in range(max_retries):
                try:
                    logger.info(f"Downloading {category} (Attempt {attempt + 1}/{max_retries})")
                    
                    if max_images_per_category:
                        # Download with image limit
                        self._download_limited(url, file_path, category, max_images_per_category, timeout)
                    else:
                        # Download full file
                        self._download_full(url, file_path, category, timeout)
                    
                    # Verify downloaded file
                    if self._is_file_valid(file_path):
                        logger.info(f"Successfully downloaded {category}")
                        self.download_status[category] = 'complete'
                        
                        # Create backup after successful download
                        self._backup_file(file_path)
                        break
                    else:
                        logger.warning(f"Downloaded file for {category} appears corrupted, retrying...")
                        time.sleep(2)  # Wait before retry
                            
                except Exception as e:
                    logger.error(f"Error downloading {category}: {str(e)}")
                    time.sleep(2)  # Wait before retry
            
            if self.download_status.get(category) != 'complete':
                logger.error(f"Failed to download {category} after {max_retries} attempts")
                self.download_status[category] = 'failed'
        
        # Summarize download results
        complete = sum(1 for status in self.download_status.values() if status == 'complete')
        failed = sum(1 for status in self.download_status.values() if status == 'failed')
        
        logger.info(f"Download summary: {complete} categories completed, {failed} categories failed")
        
        return {
            'status': 'complete' if failed == 0 else 'partial',
            'details': self.download_status,
            'completed': complete,
            'failed': failed
        }
    
    def _download_full(self, url, file_path, category, timeout):
        """Download the full category file"""
        # Use stream=True to download in chunks
        with requests.get(url, stream=True, timeout=timeout) as response:
            if response.status_code != 200:
                raise Exception(f"HTTP error {response.status_code}")
            
            # Get total file size if available
            total_size = int(response.headers.get('content-length', 0))
            
            # Choose progress bar based on availability
            progress_cls = tqdm if 'tqdm' in sys.modules else SimpleTqdm
            
            # Download with progress tracking
            with open(file_path, 'wb') as f, progress_cls(
                desc=category,
                total=total_size,
                unit='B',
                unit_scale=True,
                unit_divisor=1024,
            ) as progress:
                for chunk in response.iter_content(chunk_size=1024 * 1024):  # 1MB chunks
                    f.write(chunk)
                    progress.update(len(chunk))
    
    def _download_limited(self, url, file_path, category, max_images, timeout):
        """Download a limited number of images from the category file"""
        logger.info(f"Limiting download to {max_images} images for {category}")
        
        # Create a temporary file for downloading and processing
        temp_file = file_path.with_suffix('.temp')
        
        try:
            # Use stream=True for efficient processing
            with requests.get(url, stream=True, timeout=timeout) as response:
                if response.status_code != 200:
                    raise Exception(f"HTTP error {response.status_code}")
                
                # Process the stream line by line to limit the number of drawings
                image_count = 0
                with open(temp_file, 'wb') as f:
                    for line in response.iter_lines():
                        if image_count >= max_images:
                            break
                            
                        if line:  # Skip empty lines
                            f.write(line + b'\n')
                            image_count += 1
                            
                        # Show progress periodically
                        if image_count % 100 == 0:
                            logger.info(f"Downloaded {image_count}/{max_images} images for {category}")
            
            # Move the temporary file to the final location
            if temp_file.exists():
                shutil.move(str(temp_file), str(file_path))
                logger.info(f"Successfully limited {category} to {image_count} images")
            else:
                raise Exception("Temporary file was not created")
                
        except Exception as e:
            # Clean up temp file if it exists
            if temp_file.exists():
                temp_file.unlink()
            raise e
    
    def _is_file_valid(self, file_path):
        """Check if downloaded file is valid by trying to read a few entries"""
        try:
            # Try to read the first few lines
            with open(file_path, 'r', encoding='utf-8') as f:
                # Read first 5 lines
                for _ in range(5):
                    line = f.readline().strip()
                    if not line:
                        return False
                    # Try parsing as JSON
                    json.loads(line)
            return True
        except Exception:
            return False
    
    def _get_free_disk_space(self, path):
        """Get free disk space in MB"""
        try:
            total, used, free = shutil.disk_usage(path)
            return free // (1024 * 1024)  # Convert to MB
        except Exception:
            # If we can't determine disk space, return a large number
            return 100000  # 100GB as safe default
    
    def _backup_file(self, file_path):
        """Create a backup of an important file"""
        try:
            # Create a backup with timestamp
            timestamp = datetime.now().strftime("%Y%m%d")
            backup_name = f"{file_path.stem}_{timestamp}{file_path.suffix}"
            backup_path = self.backup_dir / backup_name
            
            # Copy file to backup location
            shutil.copy2(file_path, backup_path)
            logger.info(f"Created backup of {file_path.name} at {backup_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to create backup of {file_path.name}: {str(e)}")
            return False
    
    def list_available_categories(self):
        """List all categories that have been downloaded successfully"""
        categories = []
        for file in self.raw_data_dir.glob("*.ndjson"):
            if self._is_file_valid(file):
                categories.append(file.stem)
        return categories
    
    def get_dataset_info(self):
        """Get information about the downloaded dataset"""
        categories = self.list_available_categories()
        total_size = sum(os.path.getsize(self.raw_data_dir / f"{cat}.ndjson") for cat in categories)
        
        return {
            'categories': categories,
            'count': len(categories),
            'total_size_mb': total_size // (1024 * 1024),
            'location': str(self.raw_data_dir)
        }

    def verify_dataset_integrity(self):
        """Verify the integrity of all downloaded files"""
        results = {}
        
        for file in self.raw_data_dir.glob("*.ndjson"):
            category = file.stem
            is_valid = self._is_file_valid(file)
            results[category] = is_valid
            
            if not is_valid:
                logger.warning(f"Category '{category}' appears to be corrupted")
        
        return results

# Example usage
if __name__ == "__main__":
    # Define base paths
    base_dir = Path(__file__).parent.parent / "datasets"
    raw_dir = base_dir / "raw"
    processed_dir = base_dir / "processed"
    
    # Initialize data loader
    loader = QuickDrawDataLoader(raw_dir, processed_dir)
    
    # Download dataset (limited to 3 small categories for testing)
    test_categories = ["apple", "cat", "umbrella"] 
    results = loader.download_dataset(categories=test_categories)
    
    print("\nDataset Info:")
    print(loader.get_dataset_info())
    
    print("\nVerifying dataset integrity:")
    integrity_results = loader.verify_dataset_integrity()
    for category, is_valid in integrity_results.items():
        print(f"{category}: {'Valid' if is_valid else 'Corrupted'}")
