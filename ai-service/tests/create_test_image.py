"""
Script to create test images for model testing
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from pathlib import Path

def create_tree_image():
    """Create a simple tree image for testing"""
    # Create a white background
    img = Image.new('RGB', (224, 224), color='white')
    draw = ImageDraw.Draw(img)
    
    # Draw a simple tree - trunk
    draw.rectangle([100, 120, 124, 180], fill='brown', outline='brown')
    
    # Draw foliage (green circle)
    draw.ellipse([75, 60, 150, 140], fill='green', outline='green')
    
    # Ensure test_images directory exists
    test_dir = Path(__file__).parent.parent / "test_images"
    test_dir.mkdir(exist_ok=True)
    
    # Save the image
    image_path = test_dir / "tree.png"
    img.save(image_path)
    print(f"Created test tree image at: {image_path}")
    return str(image_path)

def create_house_image():
    """Create a simple house image for testing"""
    # Create a white background
    img = Image.new('RGB', (224, 224), color='white')
    draw = ImageDraw.Draw(img)
    
    # Draw house body (rectangle)
    draw.rectangle([60, 100, 164, 180], outline='black', width=2)
    
    # Draw roof (triangle)
    draw.polygon([(50, 100), (112, 50), (174, 100)], outline='black', width=2)
    
    # Draw door
    draw.rectangle([100, 140, 124, 180], outline='black', width=2)
    
    # Draw window
    draw.rectangle([80, 120, 95, 135], outline='black', width=2)
    
    # Ensure test_images directory exists
    test_dir = Path(__file__).parent.parent / "test_images"
    test_dir.mkdir(exist_ok=True)
    
    # Save the image
    image_path = test_dir / "house.png"
    img.save(image_path)
    print(f"Created test house image at: {image_path}")
    return str(image_path)

def create_cat_image():
    """Create a simple cat image for testing"""
    # Create a white background
    img = Image.new('RGB', (224, 224), color='white')
    draw = ImageDraw.Draw(img)
    
    # Draw cat head (circle)
    draw.ellipse([70, 70, 150, 150], outline='black', width=2)
    
    # Draw ears (triangles)
    draw.polygon([(70, 90), (80, 50), (95, 75)], outline='black', width=2)
    draw.polygon([(150, 90), (140, 50), (125, 75)], outline='black', width=2)
    
    # Draw eyes
    draw.ellipse([90, 95, 105, 110], fill='black')
    draw.ellipse([115, 95, 130, 110], fill='black')
    
    # Draw nose
    draw.ellipse([107, 115, 117, 125], fill='pink')
    
    # Draw mouth
    draw.arc([95, 120, 125, 140], 0, 180, fill='black', width=2)
    
    # Ensure test_images directory exists
    test_dir = Path(__file__).parent.parent / "test_images"
    test_dir.mkdir(exist_ok=True)
    
    # Save the image
    image_path = test_dir / "cat.png"
    img.save(image_path)
    print(f"Created test cat image at: {image_path}")
    return str(image_path)

if __name__ == "__main__":
    create_tree_image()
    create_house_image()
    create_cat_image()
    print("Created all test images successfully!")
