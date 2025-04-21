import os
import sys
import subprocess
import platform
import importlib.util
import shutil

def check_module_installed(module_name):
    """Check if a Python module is installed"""
    return importlib.util.find_spec(module_name) is not None

def run_command(cmd, verbose=True):
    """Run a command and return the output"""
    if verbose:
        print(f"Running: {cmd}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if verbose:
        if result.returncode == 0:
            print("Command succeeded")
        else:
            print(f"Command failed with exit code {result.returncode}")
            print(f"Error message: {result.stderr}")
    return result

def print_separator():
    print("\n" + "="*80 + "\n")

def main():
    # Header
    print_separator()
    print("Sketch Recognition AI Service - Environment Diagnostic Tool")
    print_separator()
    
    # System information
    print("SYSTEM INFORMATION:")
    print(f"Platform: {platform.platform()}")
    print(f"Python version: {platform.python_version()}")
    print(f"Python executable: {sys.executable}")
    
    # Check if running in a virtual environment
    in_venv = sys.prefix != sys.base_prefix
    print(f"Running in virtual environment: {'Yes' if in_venv else 'No'}")
    if not in_venv:
        print("WARNING: Not running in a virtual environment. This can cause dependency issues.")
    
    print_separator()
    
    # Check required directories
    print("DIRECTORY STRUCTURE:")
    base_dir = os.path.dirname(os.path.abspath(__file__))
    print(f"Base directory: {base_dir}")
    
    dirs_to_check = [
        "app",
        "app/datasets",
        "app/datasets/raw",
        "app/datasets/processed",
        "app/models",
        "app/models/quickdraw",
        "app/services",
        "app/utils",
        "notebooks"
    ]
    
    for d in dirs_to_check:
        dir_path = os.path.join(base_dir, d)
        exists = os.path.isdir(dir_path)
        print(f"{d}: {'Exists' if exists else 'Missing'}")
        if not exists:
            print(f"  Creating directory {d}...")
            os.makedirs(dir_path, exist_ok=True)
    
    print_separator()
    
    # Check required packages
    print("PACKAGE DEPENDENCIES:")
    essential_packages = [
        "flask",
        "numpy",
        "tensorflow",
        "pillow",
        "matplotlib",
        "pandas",
        "opencv-python",
        "scikit-learn"
    ]
    
    alt_packages = {
        "tensorflow": ["tensorflow-cpu", "onnxruntime"]
    }
    
    missing_packages = []
    
    for package in essential_packages:
        installed = check_module_installed(package)
        package_str = f"{package}: {'Installed' if installed else 'Missing'}"
        
        # Check alternatives if missing
        alt_installed = False
        if not installed and package in alt_packages:
            for alt_package in alt_packages[package]:
                if check_module_installed(alt_package):
                    package_str += f" (but alternative {alt_package} is installed)"
                    alt_installed = True
                    break
        
        print(package_str)
        
        if not installed and not alt_installed:
            missing_packages.append(package)
    
    print_separator()
    
    # Check for dataset
    print("DATASET CHECK:")
    raw_data_dir = os.path.join(base_dir, "app", "datasets", "raw")
    processed_data_dir = os.path.join(base_dir, "app", "datasets", "processed")
    
    if not os.path.exists(raw_data_dir) or not os.listdir(raw_data_dir):
        print("Raw dataset: Missing or empty")
        print("You need to download the dataset first.")
    else:
        raw_files = os.listdir(raw_data_dir)
        print(f"Raw dataset: {len(raw_files)} files found")
        print(f"Categories: {', '.join(f.split('.')[0] for f in raw_files[:5])}" + 
              (f" and {len(raw_files) - 5} more..." if len(raw_files) > 5 else ""))
    
    if not os.path.exists(processed_data_dir) or not os.listdir(processed_data_dir):
        print("Processed dataset: Missing or empty")
        print("You need to process the dataset before training.")
    else:
        processed_dirs = [d for d in os.listdir(processed_data_dir) if os.path.isdir(os.path.join(processed_data_dir, d))]
        print(f"Processed dataset: {', '.join(processed_dirs)} directories found")
        
        # Check for train/valid/test split
        if all(d in processed_dirs for d in ["train", "valid", "test"]):
            print("Dataset split: train/valid/test splits found")
            
            # Count categories in train directory
            train_dir = os.path.join(processed_data_dir, "train")
            if os.path.exists(train_dir):
                categories = [d for d in os.listdir(train_dir) if os.path.isdir(os.path.join(train_dir, d))]
                print(f"Training categories: {len(categories)} found")
                if categories:
                    print(f"Sample categories: {', '.join(categories[:5])}" + 
                          (f" and {len(categories) - 5} more..." if len(categories) > 5 else ""))
        else:
            print("Dataset split: Missing train/valid/test splits")
    
    print_separator()
    
    # Check for trained models
    print("MODEL CHECK:")
    model_dir = os.path.join(base_dir, "app", "models", "quickdraw")
    
    if not os.path.exists(model_dir) or not os.listdir(model_dir):
        print("No trained models found.")
    else:
        model_files = [f for f in os.listdir(model_dir) if f.endswith('.h5') or f.endswith('.tflite')]
        print(f"{len(model_files)} model files found:")
        for model_file in model_files:
            print(f"- {model_file}")
    
    print_separator()
    
    # Fix missing packages
    if missing_packages:
        print("RECOMMENDED FIXES:")
        print(f"Missing packages: {', '.join(missing_packages)}")
        
        fix_command = ""
        
        if "tensorflow" in missing_packages:
            print("\nTensorFlow is missing. Fix options:")
            print("1. Install TensorFlow CPU version (recommended for most users):")
            print("   pip install tensorflow-cpu==2.10.0")
            print("\n2. If you have a compatible GPU, install TensorFlow with GPU support:")
            print("   pip install tensorflow==2.10.0")
            print("\n3. Alternative: Install ONNX Runtime (lighter weight alternative):")
            print("   pip install onnxruntime")
            
            # Suggest command
            fix_command = "pip install tensorflow-cpu==2.10.0"
            missing_packages.remove("tensorflow")
        
        if missing_packages:
            other_packages = " ".join(missing_packages)
            if fix_command:
                fix_command += f" && pip install {other_packages}"
            else:
                fix_command = f"pip install {other_packages}"
        
        print("\nTo fix these issues, run the following command:")
        print(f"{fix_command}")
        
        answer = input("\nWould you like to run this command now? (y/n): ")
        if answer.lower() == "y":
            run_command(fix_command)
            print("\nDependencies installation completed. Please restart this diagnostic tool to verify.")
    
    print_separator()
    print("DIAGNOSTIC COMPLETE")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"An error occurred during diagnostics: {str(e)}")
        sys.exit(1)
