import argparse
import os
import sys
from pathlib import Path

# Try to handle missing dependencies gracefully
try:
    from app.services.data_loader import QuickDrawDataLoader, CATEGORIES
except ImportError as e:
    print(f"Error: {str(e)}")
    print("\nMissing dependencies. Please install required packages:")
    print("pip install -r requirements.txt")
    sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description='Download Quick Draw raw dataset')
    
    # Add command line arguments
    parser.add_argument('--categories', nargs='+', help='Categories to download (space-separated)')
    parser.add_argument('--all', action='store_true', help='Download all default categories')
    parser.add_argument('--list', action='store_true', help='List available categories')
    parser.add_argument('--output-dir', type=str, help='Output directory for downloaded files')
    parser.add_argument('--backup-dir', type=str, help='Backup directory')
    parser.add_argument('--retries', type=int, default=3, help='Maximum number of retries')
    parser.add_argument('--verify', action='store_true', help='Verify downloaded files')
    parser.add_argument('--limit', type=int, help='Limit number of images per category')
    
    args = parser.parse_args()
    
    # Define default paths
    base_dir = Path(__file__).parent / "app" / "datasets"
    raw_dir = base_dir / "raw"
    processed_dir = base_dir / "processed"
    
    # Create directories if they don't exist
    raw_dir.mkdir(parents=True, exist_ok=True)
    processed_dir.mkdir(parents=True, exist_ok=True)
    
    # Override output directory if specified
    if args.output_dir:
        raw_dir = Path(args.output_dir)
        raw_dir.mkdir(parents=True, exist_ok=True)
    
    # Override backup directory if specified
    backup_dir = None
    if args.backup_dir:
        backup_dir = Path(args.backup_dir)
        backup_dir.mkdir(parents=True, exist_ok=True)
    
    # Initialize data loader
    loader = QuickDrawDataLoader(raw_dir, processed_dir, backup_dir)
    
    # List available categories
    if args.list:
        print("Available categories:")
        for category in CATEGORIES:
            print(f"- {category}")
        return
    
    # Choose which categories to download
    if args.categories:
        # Verify all provided categories are valid
        invalid_categories = [cat for cat in args.categories if cat not in CATEGORIES]
        if invalid_categories:
            print(f"Error: Invalid categories: {', '.join(invalid_categories)}")
            print("Use --list to see available categories.")
            return
        categories = args.categories
    elif args.all:
        categories = CATEGORIES
    else:
        # Default to downloading a small subset
        categories = CATEGORIES[:3]  # Just download the first 3 for testing
        print(f"No categories specified. Downloading default test categories: {', '.join(categories)}")
        print("Use --all to download all categories, or specify with --categories")
    
    # Set image limit
    max_images = 3000  # Always limit to 3000 images per category
    print(f"Limiting downloads to exactly {max_images} images per category")
    
    # Download the dataset
    print(f"Starting download of {len(categories)} categories to {raw_dir}")
    results = loader.download_dataset(
        categories=categories, 
        max_retries=args.retries,
        max_images_per_category=max_images
    )
    
    # Print summary
    print("\nDownload Summary:")
    print(f"Status: {results['status']}")
    print(f"Completed: {results['completed']} categories")
    print(f"Failed: {results['failed']} categories")
    
    # Print detailed results
    if results['failed'] > 0:
        print("\nFailed categories:")
        for category, status in results['details'].items():
            if status == 'failed':
                print(f"- {category}")
    
    # Verify dataset if requested
    if args.verify:
        print("\nVerifying dataset integrity:")
        integrity_results = loader.verify_dataset_integrity()
        all_valid = all(integrity_results.values())
        
        for category, is_valid in integrity_results.items():
            print(f"{category}: {'Valid' if is_valid else 'Corrupted'}")
        
        if not all_valid:
            print("\nSome files appear to be corrupted. Consider re-downloading them.")
    
    # Print dataset info
    print("\nDataset Info:")
    info = loader.get_dataset_info()
    print(f"Location: {info['location']}")
    print(f"Categories: {len(info['categories'])}")
    print(f"Total size: {info['total_size_mb']} MB")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nDownload interrupted by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\nError: {str(e)}")
        sys.exit(1)
