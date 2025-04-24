import numpy as np
from PIL import Image, ImageDraw, ImageOps, ImageStat
import io
import base64
import cv2
from typing import List, Tuple, Dict, Union, Any

def base64_to_image(base64_str):
    """
    Convert base64 string to PIL Image
    
    Args:
        base64_str (str): Base64 encoded image string
    
    Returns:
        PIL.Image: Decoded image
    """
    # Remove data URL prefix if present
    if base64_str.startswith('data:'):
        base64_str = base64_str.split(',')[1]
    
    # Decode base64 data
    image_data = base64.b64decode(base64_str)
    image = Image.open(io.BytesIO(image_data))
    return image

def image_to_base64(image, format='PNG'):
    """
    Convert PIL Image to base64 string
    
    Args:
        image (PIL.Image): Image to convert
        format (str): Image format (PNG, JPEG, etc.)
    
    Returns:
        str: Base64 encoded image string
    """
    buffer = io.BytesIO()
    image.save(buffer, format=format)
    img_str = base64.b64encode(buffer.getvalue()).decode('utf-8')
    return f'data:image/{format.lower()};base64,{img_str}'

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

def analyze_image_content(image):
    """
    Analyze image content to extract features for prediction
    
    Args:
        image: PIL Image or numpy array
        
    Returns:
        dict: Image features
    """
    # Convert to PIL Image if numpy array
    if isinstance(image, np.ndarray):
        if image.ndim == 3 and image.shape[2] == 1:
            # Remove channel dimension if shape is (H, W, 1)
            image = image.reshape(image.shape[0], image.shape[1])
        img = Image.fromarray((image * 255).astype(np.uint8) if image.max() <= 1 else image.astype(np.uint8))
    else:
        img = image
    
    # Convert to grayscale if needed
    if img.mode != 'L':
        img = img.convert('L')
    
    # Get image statistics
    stats = ImageStat.Stat(img)
    
    # Convert to numpy array for advanced analysis
    img_array = np.array(img)
    
    # Calculate simple features
    features = {
        'mean': stats.mean[0],
        'median': np.median(img_array),
        'std': stats.stddev[0],
        'min': img_array.min(),
        'max': img_array.max(),
        'coverage': np.count_nonzero(img_array < 240) / (img_array.shape[0] * img_array.shape[1]),
        'centroid': calculate_centroid(img_array),
        'shape_type': detect_shape_type(img_array)
    }
    
    return features

def calculate_centroid(img_array):
    """
    Calculate center of mass of the drawing
    
    Args:
        img_array: Numpy array of image
        
    Returns:
        tuple: (y_center, x_center) normalized to [0, 1]
    """
    # Threshold the image to get the sketch
    threshold = 240
    sketch = img_array < threshold
    
    # If no sketch found, return center
    if not np.any(sketch):
        return (0.5, 0.5)
    
    # Calculate center of mass
    y_indices, x_indices = np.nonzero(sketch)
    y_center = np.mean(y_indices) / img_array.shape[0]
    x_center = np.mean(x_indices) / img_array.shape[1]
    
    return (float(y_center), float(x_center))

def detect_shape_type(img_array):
    """
    Detect shape type: circular, rectangular, or irregular
    
    Args:
        img_array: Numpy array of image
        
    Returns:
        str: "circular", "rectangular", or "irregular"
    """
    try:
        # Convert to binary image
        binary = (img_array < 240).astype(np.uint8) * 255
        
        # Find contours
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if not contours:
            return "no_shape"
        
        # Get largest contour
        largest_contour = max(contours, key=cv2.contourArea)
        area = cv2.contourArea(largest_contour)
        
        # If area is too small, return no shape
        if area < 10:
            return "no_shape"
        
        # Calculate circularity: 4*pi*area/perimeter^2
        # 1 means perfect circle, less means less circular
        perimeter = cv2.arcLength(largest_contour, True)
        if perimeter == 0:
            circularity = 0
        else:
            circularity = 4 * np.pi * area / (perimeter * perimeter)
        
        # Calculate rectangularity: area / bounding rectangle area
        x, y, w, h = cv2.boundingRect(largest_contour)
        rect_area = w * h
        if rect_area == 0:
            rectangularity = 0
        else:
            rectangularity = area / rect_area
        
        # Decide shape type
        if circularity > 0.7:  # Close to circle
            return "circular"
        elif rectangularity > 0.7:  # Close to rectangle
            return "rectangular"
        else:
            return "irregular"
    
    except Exception as e:
        # OpenCV might not be available, fallback to simpler detection
        return "irregular"

import numpy as np
import tensorflow as tf
import cv2
from PIL import Image, ImageOps
import io
import base64
from typing import Tuple, Union, Optional

def base64_to_image(base64_str: str) -> Image.Image:
    """Convert base64 string to PIL Image"""
    # Remove data URL prefix if present
    if base64_str.startswith('data:'):
        base64_str = base64_str.split(',')[1]
    
    # Decode base64 data
    image_data = base64.b64decode(base64_str)
    image = Image.open(io.BytesIO(image_data))
    return image

def normalize_image(img_array: np.ndarray, target_range: Tuple[float, float]=(0, 1)) -> np.ndarray:
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

def enhanced_preprocess_image(image: Union[Image.Image, np.ndarray], target_size: Tuple[int, int]=(28, 28), 
                             debug: bool=False) -> np.ndarray:
    """
    Enhanced preprocessing for sketch images to better match Quick Draw dataset characteristics
    
    Args:
        image: Input image (PIL Image or numpy array)
        target_size: Target size for output image (width, height)
        debug: Whether to return debug information
        
    Returns:
        preprocessed_image: Preprocessed image as numpy array
        debug_info: Optional debug information dict
    """
    debug_info = {} if debug else None
    
    # Convert PIL Image to numpy if needed
    if isinstance(image, Image.Image):
        # Convert to grayscale
        if image.mode != 'L':
            image = image.convert('L')
            
        if debug:
            debug_info['original_size'] = image.size
            debug_info['original_mode'] = image.mode
            
        # Convert to numpy array
        img_array = np.array(image)
    else:
        img_array = image.copy()
        
        # Convert RGB to grayscale if needed
        if len(img_array.shape) == 3 and img_array.shape[2] == 3:
            img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            
    if debug:
        debug_info['array_shape_pre'] = img_array.shape
        debug_info['array_min_pre'] = float(img_array.min())
        debug_info['array_max_pre'] = float(img_array.max())
        debug_info['array_mean_pre'] = float(img_array.mean())
    
    # Ensure proper data type and range
    if img_array.dtype == np.uint8:
        img_array = img_array.astype(np.float32) / 255.0
    
    # Step 1: Binarize the image to separate sketch from background
    # This helps with varying stroke widths and intensities
    if img_array.max() > img_array.min():  # Avoid division by zero
        # Otsu's thresholding after Gaussian filtering
        if img_array.max() <= 1.0:
            img_uint8 = (img_array * 255).astype(np.uint8)
        else:
            img_uint8 = img_array.astype(np.uint8)
            
        # Apply slight blur to reduce noise
        blurred = cv2.GaussianBlur(img_uint8, (5, 5), 0)
        
        # Apply adaptive thresholding for better line extraction
        binary = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                      cv2.THRESH_BINARY_INV, 11, 2)
        
        if debug:
            debug_info['binary_min'] = int(binary.min())
            debug_info['binary_max'] = int(binary.max())
    else:
        # Fallback for completely uniform images
        binary = img_uint8
    
    # Step 2: Find contours to identify the sketch content area
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # If no contours found, the image might be inverted or empty
    if not contours:
        # Try inverting
        inverted_binary = 255 - binary
        contours, _ = cv2.findContours(inverted_binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if not contours:
            # Return centered blank image as fallback
            if debug:
                debug_info['contours_found'] = 0
                debug_info['using_fallback'] = True
            blank = np.zeros(target_size, dtype=np.float32)
            
            # Add batch and channel dimensions
            preprocessed = np.expand_dims(np.expand_dims(blank, axis=0), axis=-1)
            
            if debug:
                return preprocessed, debug_info
            return preprocessed
    
    if debug:
        debug_info['contours_found'] = len(contours)
    
    # Step 3: Find bounding box around all contours
    all_contours = np.vstack(contours)
    x, y, w, h = cv2.boundingRect(all_contours)
    
    # Ensure bounding box is not empty
    if w == 0 or h == 0:
        if debug:
            debug_info['empty_bounding_box'] = True
        # Use whole image
        x, y, w, h = 0, 0, binary.shape[1], binary.shape[0]
    
    if debug:
        debug_info['bounding_box'] = (int(x), int(y), int(w), int(h))
    
    # Step 4: Add padding around the bounding box (20% on each side)
    padding_x = int(w * 0.2)
    padding_y = int(h * 0.2)
    
    # Ensure the padded box doesn't go outside image boundaries
    x1 = max(0, x - padding_x)
    y1 = max(0, y - padding_y)
    x2 = min(binary.shape[1], x + w + padding_x)
    y2 = min(binary.shape[0], y + h + padding_y)
    
    # Step 5: Crop to padded bounding box
    cropped = binary[y1:y2, x1:x2]
    
    # Step 6: Resize to target size while preserving aspect ratio
    # Calculate the target size with preserved aspect ratio
    if cropped.shape[0] > 0 and cropped.shape[1] > 0:  # Ensure valid dimensions
        aspect = cropped.shape[1] / cropped.shape[0]  # width/height
        
        if aspect > 1:  # width > height
            new_width = target_size[0]
            new_height = int(target_size[0] / aspect)
        else:  # height >= width
            new_height = target_size[1]
            new_width = int(target_size[1] * aspect)
            
        # Resize using OpenCV
        resized = cv2.resize(cropped, (new_width, new_height), interpolation=cv2.INTER_AREA)
        
        # Create a blank target-sized image
        padded = np.zeros(target_size, dtype=np.uint8)
        
        # Calculate position to paste the resized image (centered)
        paste_x = (target_size[0] - new_width) // 2
        paste_y = (target_size[1] - new_height) // 2
        
        # Paste the resized image
        padded[paste_y:paste_y+new_height, paste_x:paste_x+new_width] = resized
    else:
        # Fallback for invalid crop dimensions
        padded = np.zeros(target_size, dtype=np.uint8)
    
    if debug:
        debug_info['resized_shape'] = resized.shape
        debug_info['padded_shape'] = padded.shape
    
    # Step 7: Normalize to [0, 1]
    normalized = padded.astype(np.float32) / 255.0
    
    # Step 8: Match the Quick Draw dataset style (white on black background)
    # Invert if needed (Quick Draw has white strokes on black background)
    # Note: Our binary images already have white strokes on black background after THRESH_BINARY_INV
    
    if debug:
        debug_info['normalized_min'] = float(normalized.min())
        debug_info['normalized_max'] = float(normalized.max())
        debug_info['normalized_mean'] = float(normalized.mean())
    
    # Step 9: Add batch and channel dimensions
    preprocessed = np.expand_dims(np.expand_dims(normalized, axis=0), axis=-1)
    
    if debug:
        debug_info['final_shape'] = preprocessed.shape
        debug_info['final_min'] = float(preprocessed.min())
        debug_info['final_max'] = float(preprocessed.max())
        debug_info['final_mean'] = float(preprocessed.mean())
        return preprocessed, debug_info
    
    return preprocessed
