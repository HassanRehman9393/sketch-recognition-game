import numpy as np
import base64
from PIL import Image
import io
import cv2

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

def normalize_sketch(image, target_size=(28, 28)):
    """
    Normalize sketch for model input:
    - Convert to grayscale
    - Center the sketch
    - Resize to target size
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
    
    # Find contours to center the sketch
    _, thresh = cv2.threshold(img_array, 127, 255, cv2.THRESH_BINARY)
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
        
        # Crop to content
        if x_max > x_min and y_max > y_min:
            img_array = img_array[y_min:y_max, x_min:x_max]
    
    # Resize to target size
    img_array = cv2.resize(img_array, target_size, interpolation=cv2.INTER_AREA)
    
    return img_array
