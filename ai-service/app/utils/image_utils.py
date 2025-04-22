import numpy as np
import base64
from PIL import Image, ImageDraw
import io
import cv2
from typing import List, Tuple, Any

def base64_to_image(base64_str):
    """
    Convert base64 string to PIL Image
    """
    # Remove data URL prefix if present
    if base64_str.startswith('data:image'):
        base64_str = base64_str.split(',')[1]
        
    # Decode base64
    image_data = base64.b64decode(base64_str)
    
    # Open as PIL Image
    image = Image.open(io.BytesIO(image_data))
    
    return image

def image_to_base64(image, format='PNG'):
    """
    Convert PIL Image to base64 string
    """
    buffered = io.BytesIO()
    image.save(buffered, format=format)
    img_str = base64.b64encode(buffered.getvalue()).decode('utf-8')
    
    return f"data:image/{format.lower()};base64,{img_str}"

def normalize_sketch(image, target_size=(28, 28), padding=2):
    """
    Normalize sketch for model input:
    - Convert to grayscale
    - Center the sketch with padding
    - Resize to target size
    - Apply thresholding for clean binary image
    """
    # Convert to numpy array if PIL Image
    if isinstance(image, Image.Image):
        img_array = np.array(image)
    else:
        img_array = image
    
    # Convert to grayscale if RGB
    if len(img_array.shape) == 3 and img_array.shape[2] == 3:
        img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    
    # Invert if needed (white sketch on black background)
    if img_array.mean() > 128:
        img_array = 255 - img_array
    
    # Apply thresholding to make it binary
    _, thresh = cv2.threshold(img_array, 127, 255, cv2.THRESH_BINARY)
    
    # Find contours to center the sketch
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    if contours:
        # Find bounding box of all contours
        x_min, y_min = img_array.shape[1], img_array.shape[0]
        x_max, y_max = 0, 0
        
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            x_min = min(x_min, x)
            y_min = min(y_min, y)
            x_max = max(x_max, x + w)
            y_max = max(y_max, y + h)
        
        # Ensure we have valid bounds
        if x_max > x_min and y_max > y_min:
            # Crop to content with padding
            padding_x = max(0, (x_max - x_min) // padding) if padding > 0 else 0
            padding_y = max(0, (y_max - y_min) // padding) if padding > 0 else 0
            
            # Apply padding while staying within image bounds
            x_min = max(0, x_min - padding_x)
            y_min = max(0, y_min - padding_y)
            x_max = min(img_array.shape[1], x_max + padding_x)
            y_max = min(img_array.shape[0], y_max + padding_y)
            
            # Crop
            img_array = img_array[y_min:y_max, x_min:x_max]
    
    # Create a square image by padding the shorter dimension
    height, width = img_array.shape
    if width > height:
        padding_top = (width - height) // 2
        padding_bottom = width - height - padding_top
        img_array = cv2.copyMakeBorder(img_array, padding_top, padding_bottom, 0, 0, 
                                       cv2.BORDER_CONSTANT, value=0)
    else:
        padding_left = (height - width) // 2
        padding_right = height - width - padding_left
        img_array = cv2.copyMakeBorder(img_array, 0, 0, padding_left, padding_right, 
                                       cv2.BORDER_CONSTANT, value=0)
    
    # Resize to target size
    img_array = cv2.resize(img_array, target_size, interpolation=cv2.INTER_AREA)
    
    # Normalize to [0, 1]
    normalized = img_array.astype(np.float32) / 255.0
    
    return normalized

def strokes_to_image(strokes, image_size=(256, 256), line_width=2, bg_color=(255, 255, 255), line_color=(0, 0, 0)):
    """
    Convert stroke data from Quick Draw dataset to an image
    
    Args:
        strokes (list): List of strokes, each containing x,y coordinates
        image_size (tuple): Size of the output image (width, height)
        line_width (int): Width of the drawing lines
        bg_color (tuple): Background color as RGB
        line_color (tuple): Line color as RGB
        
    Returns:
        numpy.ndarray: Image as numpy array
    """
    # Create blank image with background color
    image = np.ones((image_size[1], image_size[0], 3), dtype=np.uint8)
    image[:] = bg_color
    
    # Extract stroke data and normalize coordinates
    for stroke in strokes:
        # Extract x, y coordinates
        points = np.array(list(zip(stroke[0], stroke[1])))
        
        if len(points) == 0:
            continue
        
        # Scale coordinates to fit the image (assumes original coords are in [0,255] range)
        points = points.astype(np.float32)
        x_min, y_min = points.min(axis=0)
        x_max, y_max = points.max(axis=0)
        
        # Avoid division by zero
        x_range = max(1.0, x_max - x_min)
        y_range = max(1.0, y_max - y_min)
        
        # Scale to slightly smaller than image size to leave some border
        scale_factor = min(image_size[0] * 0.8 / x_range, image_size[1] * 0.8 / y_range)
        points = points * scale_factor
        
        # Center in the image
        center_offset = np.array([
            (image_size[0] - points[:, 0].max() - points[:, 0].min()) / 2,
            (image_size[1] - points[:, 1].max() - points[:, 1].min()) / 2
        ])
        points = points + center_offset
        
        # Convert to integer coordinates
        points = points.astype(np.int32)
        
        # Draw lines connecting the points
        if len(points) > 1:
            cv2.polylines(image, [points], False, line_color, line_width)
    
    return image

def normalize_image(img_array, target_range=(0, 1)):
    """
    Normalize image to a target range
    
    Args:
        img_array (np.ndarray): Input image array
        target_range (tuple): Target range as (min, max)
    
    Returns:
        np.ndarray: Normalized image
    """
    if img_array.max() == img_array.min():
        return np.zeros_like(img_array)
    
    normalized = (img_array - img_array.min()) / (img_array.max() - img_array.min())
    
    # Scale to target range
    min_val, max_val = target_range
    normalized = normalized * (max_val - min_val) + min_val
    
    return normalized

def preprocess_stroke_data(strokes, target_size=(28, 28), line_width=2, invert=True):
    """
    Convert stroke data to normalized image format suitable for model input
    
    Args:
        strokes (list): List of strokes, where each stroke is a numpy array of [x,y] points
        target_size (tuple): Target size for output image (width, height)
        line_width (int): Width of drawing lines
        invert (bool): Whether to invert the colors (black background, white lines)
    
    Returns:
        np.ndarray: Processed image as numpy array
    """
    width, height = target_size
    
    # Create a blank white image
    img = Image.new('L', (width, height), color=255)
    draw = ImageDraw.Draw(img)
    
    # Find bounding box of all strokes for normalization
    all_points = []
    for stroke in strokes:
        if len(stroke) > 0:
            all_points.extend(stroke)
    
    if not all_points:
        # Return blank image if no strokes
        img_array = np.array(img)
        if invert:
            img_array = 255 - img_array
        return normalize_image(img_array)
    
    all_points = np.array(all_points)
    min_x, min_y = all_points.min(axis=0)
    max_x, max_y = all_points.max(axis=0)
    
    # Avoid division by zero
    width_range = max(max_x - min_x, 1e-8)
    height_range = max(max_y - min_y, 1e-8)
    
    # Function to normalize point coordinates to image space
    def normalize_point(point):
        x, y = point
        # Scale to target size with padding (80% of the image)
        normalized_x = 0.1 * width + 0.8 * width * (x - min_x) / width_range
        normalized_y = 0.1 * height + 0.8 * height * (y - min_y) / height_range
        return (normalized_x, normalized_y)
    
    # Draw strokes
    for stroke in strokes:
        if len(stroke) < 2:
            continue
            
        # Normalize points
        points = [normalize_point(point) for point in stroke]
        
        # Draw the stroke
        for i in range(len(points) - 1):
            draw.line([points[i], points[i+1]], fill=0, width=line_width)
    
    # Convert to numpy array
    img_array = np.array(img)
    
    # Invert if needed (white strokes on black background)
    if invert:
        img_array = 255 - img_array
    
    # Normalize to [0, 1] range
    return normalize_image(img_array)

def strokes_to_image(strokes, width=256, height=256, line_width=2, bg_color="white", line_color="black"):
    """
    Convert canvas stroke data to PIL Image
    
    Args:
        strokes (list): List of strokes, where each stroke is a list of points (dict with x, y)
        width (int): Image width
        height (int): Image height
        line_width (int): Width of drawing lines
        bg_color (str): Background color
        line_color (str): Line color
    
    Returns:
        PIL.Image: Generated image
    """
    # Create a blank canvas
    image = Image.new("RGB", (width, height), bg_color)
    draw = ImageDraw.Draw(image)
    
    # Draw each stroke
    for stroke in strokes:
        if len(stroke) < 2:
            continue
            
        # Extract points
        points = [(point["x"], point["y"]) for point in stroke]
        
        # Draw lines between consecutive points
        for i in range(len(points) - 1):
            draw.line([points[i], points[i+1]], fill=line_color, width=line_width)
    
    return image
