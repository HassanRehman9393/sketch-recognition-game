import argparse
import sys
import os
from pathlib import Path
import time

# Try to handle missing dependencies gracefully
try:
    from app.core.data_processor import QuickDrawDataProcessor
    from app.core.data_loader import CATEGORIES
except ImportError as e:
    print(f"Error: {str(e)}")
    print("\nMissing dependencies. Please install required packages:")
    print("pip install -r requirements.txt")
    sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description='Process Quick Draw raw dataset')
    
    # Add command line arguments
    parser.add_argument('--categories', nargs='+', help='Categories to process (space-separated)')
    parser.add_argument('--all', action='store_true', help='Process all available categories')
    parser.add_argument('--list', action='store_true', help='List available categories')
    parser.add_argument('--input-dir', type=str, help='Input directory containing raw files')
    parser.add_argument('--output-dir', type=str, help='Output directory for processed data')
    parser.add_argument('--max-samples', type=int, default=3000, 
                        help='Maximum number of samples to process per category')
    parser.add_argument('--visualize', action='store_true', default=True,
                        help='Visualize processed examples')
    parser.add_argument('--no-visualize', action='store_false', dest='visualize',
                        help='Disable visualization')
    parser.add_argument('--split-only', action='store_true',
                        help='Only split existing processed data without processing raw data')
    parser.add_argument('--train-ratio', type=float, default=0.7, 
                        help='Ratio of training data (default: 0.7)')
    parser.add_argument('--valid-ratio', type=float, default=0.15, 
                        help='Ratio of validation data (default: 0.15)')
    parser.add_argument('--test-ratio', type=float, default=0.15, 
                        help='Ratio of test data (default: 0.15)')
    
    args = parser.parse_args()
    
    # Define default paths
    base_dir = Path(__file__).parent / "app" / "datasets"
    raw_dir = base_dir / "raw"
    processed_dir = base_dir / "processed"
    
    # Override directories if specified
    if args.input_dir:
        raw_dir = Path(args.input_dir)
    if args.output_dir:
        processed_dir = Path(args.output_dir)
    
    # Create processor
    processor = QuickDrawDataProcessor(raw_dir, processed_dir)
    
    # List available categories
    if args.list:
        # Import here to avoid circular imports
        from app.core.data_loader import QuickDrawDataLoader
        loader = QuickDrawDataLoader(raw_dir, processed_dir)
        available = loader.list_available_categories()
        
        print("Available categories for processing:")
        if available:
            for category in available:
                print(f"- {category}")
        else:
            print("No categories available. Download dataset first with download_dataset.py")
        return
    
    start_time = time.time()
    
    # Only split existing processed data
    if args.split_only:
        print("Splitting existing processed data...")
        split_result = processor.split_dataset(
            train_ratio=args.train_ratio,
            valid_ratio=args.valid_ratio,
            test_ratio=args.test_ratio
        )
        
        if split_result['status'] == 'success':
            print("\nSplit Results:")
            print(f"Train: {split_result['stats']['train']} images")
            print(f"Validation: {split_result['stats']['valid']} images")
            print(f"Test: {split_result['stats']['test']} images")
            print(f"Total time: {time.time() - start_time:.2f}s")
        else:
            print(f"Error splitting dataset: {split_result.get('message', 'Unknown error')}")
        
        return
    
    # Choose which categories to process
    if args.categories:
        # Check if the specified categories exist
        from app.core.data_loader import QuickDrawDataLoader
        loader = QuickDrawDataLoader(raw_dir, processed_dir)
        available = loader.list_available_categories()
        
        invalid_categories = [cat for cat in args.categories if cat not in available]
        if invalid_categories:
            print(f"Error: Categories not found: {', '.join(invalid_categories)}")
            print("Use --list to see available categories.")
            return
            
        categories = args.categories
        
        # Process each category
        for category in categories:
            result = processor.process_category(
                category, 
                max_samples=args.max_samples, 
                visualize=args.visualize
            )
            
            if result['status'] == 'success':
                print(f"Processed {result['processed']} drawings for '{category}'")
            else:
                print(f"Error processing '{category}': {result.get('message', 'Unknown error')}")
        
        # Split the dataset after processing
        split_result = processor.split_dataset(
            train_ratio=args.train_ratio,
            valid_ratio=args.valid_ratio,
            test_ratio=args.test_ratio
        )
        
        if split_result['status'] == 'success':
            print("\nSplit Results:")
            print(f"Train: {split_result['stats']['train']} images")
            print(f"Validation: {split_result['stats']['valid']} images")
            print(f"Test: {split_result['stats']['test']} images")
        
    elif args.all:
        # Process all available categories
        result = processor.process_all_categories(
            max_samples_per_category=args.max_samples,
            visualize=args.visualize
        )
        
        if result['status'] == 'success':
            print("\nProcessing summary:")
            print(f"Processed {result['stats']['processed_categories']} categories")
            print(f"Processed {result['stats']['processed_drawings']} drawings")
            print(f"Invalid drawings: {result['stats']['invalid_drawings']}")
            print(f"Train samples: {result['stats']['train_samples']}")
            print(f"Validation samples: {result['stats']['valid_samples']}")
            print(f"Test samples: {result['stats']['test_samples']}")
            print(f"Total processing time: {result['processing_time']:.2f}s")
        else:
            print(f"Error processing dataset: {result.get('message', 'Unknown error')}")
    else:
        print("No action specified. Use --categories, --all, --split-only, or --list")
        parser.print_help()
    
    total_time = time.time() - start_time
    print(f"\nTotal execution time: {total_time:.2f}s")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nProcessing interrupted by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\nError: {str(e)}")
        sys.exit(1)
