"""
Verify the project structure and create missing directories/files
"""

import os
from pathlib import Path
import sys

def create_structure():
    """Create the necessary project structure"""
    base_dir = Path(__file__).parent
    print(f"Creating project structure in {base_dir}")
    
    # Define directories to create
    dirs = [
        "app/api",
        "app/core",
        "app/utils",
        "app/routes",
        "app/static",
        "data/raw",
        "data/processed", 
        "models/quickdraw",
        "tests"
    ]
    
    # Create directories
    for dir_path in dirs:
        full_path = base_dir / dir_path
        if not full_path.exists():
            print(f"Creating directory: {full_path}")
            full_path.mkdir(parents=True, exist_ok=True)
    
    # Define files to create if they don't exist
    files = [
        ("app/__init__.py", "# Flask application package\n"),
        ("app/core/__init__.py", "# Core business logic\n"),
        ("app/utils/__init__.py", "# Utility functions\n"),
        ("app/routes/__init__.py", "# API routes\n"),
        ("app/api/__init__.py", "# API endpoints\n")
    ]
    
    # Create files
    for file_path, content in files:
        full_path = base_dir / file_path
        if not full_path.exists():
            print(f"Creating file: {full_path}")
            with open(full_path, "w") as f:
                f.write(content)
    
    print("\nStructure verification complete!")
    print("If any core files are missing, please create them using the templates provided.")

if __name__ == "__main__":
    create_structure()
    
    # Check if core files exist and display warnings
    required_files = [
        "app/core/recognition.py",
        "app/utils/image_utils.py",
        "app/utils/model_utils.py",
        "app/routes/recognition_routes.py",
        "main.py"
    ]
    
    missing_files = []
    for file_path in required_files:
        full_path = Path(__file__).parent / file_path
        if not full_path.exists():
            missing_files.append(file_path)
    
    if missing_files:
        print("\nWARNING: The following required files are missing:")
        for file in missing_files:
            print(f"  - {file}")
        print("\nPlease create these files to ensure the application works correctly.")
    else:
        print("\nAll required files are present!")
