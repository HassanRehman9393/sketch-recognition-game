import subprocess
import sys
import os
from pathlib import Path

def create_virtual_environment():
    """Create a virtual environment for the AI service."""
    base_dir = Path(__file__).parent
    venv_dir = base_dir / "venv"
    
    print(f"Creating virtual environment in {venv_dir}...")
    
    try:
        # Create virtual environment
        subprocess.run([sys.executable, "-m", "venv", str(venv_dir)], check=True)
        
        # Determine the python executable path
        if os.name == 'nt':  # Windows
            python_path = venv_dir / "Scripts" / "python.exe"
        else:  # Unix/Linux/Mac
            python_path = venv_dir / "bin" / "python"
        
        # Upgrade pip using the correct method
        subprocess.run([str(python_path), "-m", "pip", "install", "--upgrade", "pip"], check=True)
        
        print("\nVirtual environment created successfully!")
        print("\nTo activate the virtual environment:")
        
        if os.name == 'nt':  # Windows
            print(f"    {venv_dir}\\Scripts\\activate")
        else:  # Unix/Linux/Mac
            print(f"    source {venv_dir}/bin/activate")
            
        print("\nAfter activation, install requirements:")
        print("    pip install -r requirements.txt")
        
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error creating virtual environment: {e}")
        return False

if __name__ == "__main__":
    create_virtual_environment()
