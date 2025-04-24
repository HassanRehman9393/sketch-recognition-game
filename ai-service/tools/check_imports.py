"""
Script to check and suggest updates for import statements after project restructuring
"""

import os
import re
import sys
from pathlib import Path
import importlib.util
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

# Define import mappings for restructured project
IMPORT_MAPPINGS = {
    # Services to Core
    r'from app\.services\.(\w+)': r'from app.core.\1',
    r'import app\.services\.(\w+)': r'import app.core.\1',
    
    # Routes to API
    r'from app\.routes\.(\w+)': r'from app.api.\1',
    r'import app\.routes\.(\w+)': r'import app.api.\1',
    
    # Dataset paths
    r'app\/datasets\/raw': r'data/raw',
    r'app\/datasets\/processed': r'data/processed',
    r'"app\/datasets\/(\w+)"': r'"data/\1"',
    r"'app\/datasets\/(\w+)'": r"'data/\1'",
    
    # Model paths
    r'app\/models\/quickdraw': r'models/quickdraw',
    r'"app\/models\/(\w+)"': r'"models/\1"',
    r"'app\/models\/(\w+)'": r"'models/\1'",
    
    # Config imports
    r'from app\.config': r'from config',
    r'import app\.config': r'import config'
}

def check_python_file(file_path):
    """
    Check a Python file for import statements that need updating
    
    Returns:
        tuple: (file_path, old_content, new_content, changes) if changes needed, 
               None otherwise
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Make a copy of the original content
        new_content = content
        changes = []
        
        # Check for each import pattern
        for pattern, replacement in IMPORT_MAPPINGS.items():
            # Find all matches
            matches = re.finditer(pattern, content)
            
            # Process each match
            for match in matches:
                old_import = match.group(0)
                new_import = re.sub(pattern, replacement, old_import)
                if old_import != new_import:
                    changes.append((old_import, new_import))
                    new_content = new_content.replace(old_import, new_import)
        
        # Return results if changes are needed
        if changes:
            return (file_path, content, new_content, changes)
        
        return None
    
    except Exception as e:
        logger.error(f"Error processing {file_path}: {str(e)}")
        return None

def find_python_files(directory):
    """Find all Python files in directory and subdirectories"""
    python_files = []
    
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.py'):
                python_files.append(os.path.join(root, file))
    
    return python_files

def main():
    """Main function to check imports in Python files"""
    # Get base directory
    base_dir = Path(__file__).parent.parent
    logger.info(f"Checking Python files in {base_dir}")
    
    # Find all Python files
    python_files = find_python_files(base_dir)
    logger.info(f"Found {len(python_files)} Python files")
    
    # Check each file
    files_to_update = []
    for file_path in python_files:
        result = check_python_file(file_path)
        if result:
            files_to_update.append(result)
    
    # Print summary
    logger.info(f"\n{len(files_to_update)} files need import updates:")
    
    # Show details for each file
    for i, (file_path, _, _, changes) in enumerate(files_to_update, 1):
        rel_path = os.path.relpath(file_path, base_dir)
        logger.info(f"\n{i}. {rel_path} ({len(changes)} changes):")
        for old, new in changes:
            logger.info(f"   - {old} → {new}")
    
    # Ask to apply changes
    if files_to_update:
        confirm = input("\nApply these changes? (y/n): ")
        if confirm.lower() == 'y':
            for file_path, _, new_content, _ in files_to_update:
                rel_path = os.path.relpath(file_path, base_dir)
                try:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    logger.info(f"Updated {rel_path}")
                except Exception as e:
                    logger.error(f"Error updating {rel_path}: {str(e)}")
            
            logger.info("\nAll import statements updated successfully!")
        else:
            logger.info("No changes applied")
    else:
        logger.info("No import statements need updating!")

if __name__ == "__main__":
    main()
