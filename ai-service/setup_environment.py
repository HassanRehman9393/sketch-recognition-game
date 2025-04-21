import os
import sys
import subprocess
import platform
import argparse

def run_command(command):
    """Run a command and print its output"""
    print(f"Running: {command}")
    result = subprocess.run(command, shell=True, capture_output=True, text=True)
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(f"Error: {result.stderr}")
    return result.returncode

def main():
    parser = argparse.ArgumentParser(description="Set up the AI service environment")
    parser.add_argument('--tensorflow', choices=['cpu', 'gpu', 'none'], default='cpu',
                        help='TensorFlow version to install: cpu, gpu, or none')
    parser.add_argument('--alternative', action='store_true',
                        help='Install alternative ML packages (onnxruntime) instead of TensorFlow')
    args = parser.parse_args()
    
    print("\n===== Sketch Recognition AI Service - Environment Setup =====\n")
    
    # Detect platform
    print(f"Platform: {platform.system()}")
    print(f"Python: {platform.python_version()}")
    print(f"Path: {sys.executable}")
    
    # Check if running in a virtual environment
    in_venv = sys.prefix != sys.base_prefix
    if not in_venv:
        print("\nWARNING: You are not running in a virtual environment!")
        create_venv = input("Would you like to create and activate a virtual environment? (y/n): ")
        if create_venv.lower() == 'y':
            if platform.system() == "Windows":
                run_command("python -m venv venv")
                print("\nVirtual environment created. Please activate it with:")
                print("venv\\Scripts\\activate")
                print("Then run this script again.")
            else:
                run_command("python -m venv venv")
                print("\nVirtual environment created. Please activate it with:")
                print("source venv/bin/activate")
                print("Then run this script again.")
            sys.exit(0)
        else:
            print("\nProceeding without virtual environment (not recommended)...")
    else:
        print("Running in virtual environment:", sys.prefix)
    
    # Install base required packages
    print("\n===== Installing base dependencies =====")
    base_packages = [
        "flask",
        "numpy",
        "matplotlib",
        "pandas",
        "pillow",
        "tqdm",
        "scikit-learn",
        "opencv-python",
        "requests",
        "jupyter"
    ]
    
    base_command = f"{sys.executable} -m pip install {' '.join(base_packages)}"
    run_command(base_command)
    
    # Install TensorFlow or alternatives based on user choice
    if args.alternative:
        print("\n===== Installing alternative ML packages =====")
        ml_packages = ["onnxruntime"]
        ml_command = f"{sys.executable} -m pip install {' '.join(ml_packages)}"
        run_command(ml_command)
    elif args.tensorflow != 'none':
        print(f"\n===== Installing TensorFlow ({args.tensorflow}) =====")
        if args.tensorflow == 'cpu':
            tf_command = f"{sys.executable} -m pip install tensorflow-cpu==2.10.0"
        else:
            tf_command = f"{sys.executable} -m pip install tensorflow==2.10.0"
        run_command(tf_command)
    
    # Create required directories
    print("\n===== Creating required directories =====")
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dirs_to_create = [
        "app/datasets/raw",
        "app/datasets/processed",
        "app/models/quickdraw",
        "app/utils",
        "app/services",
        "app/routes",
        "notebooks"
    ]
    
    for directory in dirs_to_create:
        dir_path = os.path.join(base_dir, directory)
        if not os.path.exists(dir_path):
            print(f"Creating directory: {directory}")
            os.makedirs(dir_path, exist_ok=True)
    
    print("\n===== Setup Complete =====")
    print("\nTo download the dataset, run:")
    print("python download_dataset.py --list")
    print("python download_dataset.py --categories apple cat house")
    
    print("\nTo process the dataset, run:")
    print("python process_dataset.py --categories apple cat house --max-samples 1000")
    
    print("\nTo train a model, run:")
    print("python train_model.py --model-type simple --epochs 10 --batch-size 64")

if __name__ == "__main__":
    main()
