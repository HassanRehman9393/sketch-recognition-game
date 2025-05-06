#!/usr/bin/env python3
"""
This script integrates the ensemble recognition service with the existing API.
It swaps the recognition service implementation at runtime without modifying existing code.
"""

import os
import sys
import logging
import importlib
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('ensemble_integration')

def main():
    """
    Main function to setup and run the ensemble service integration
    """
    logger.info("Starting ensemble integration...")
    
    # Add the project root to the Python path if needed
    script_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.append(script_dir)
    
    try:
        # Import the ensemble service
        from app.core.ensemble_recognition_service import get_ensemble_recognition_service
        
        # Create the ensemble service instance
        ensemble_service = get_ensemble_recognition_service()
        logger.info("Ensemble service initialized")
        
        # Import the original recognition service module
        import app.core.recognition_service
        
        # Backup the original get_recognition_service function
        original_get_recognition_service = app.core.recognition_service.get_recognition_service
        
        # Replace the function with one that returns our ensemble service
        def get_enhanced_recognition_service(*args, **kwargs):
            logger.info("Enhanced recognition service requested")
            return ensemble_service
        
        # Monkey patch the original module
        app.core.recognition_service.get_recognition_service = get_enhanced_recognition_service
        app.core.recognition_service._instance = ensemble_service
        
        logger.info("Recognition service successfully replaced with ensemble service")
        
        # Now import and run the main Flask application
        logger.info("Starting Flask application with enhanced recognition...")
        
        # Find the correct main module to run
        main_module_candidates = [
            'main',
            'app',
            'run',
            'server'
        ]
        
        for module_name in main_module_candidates:
            try:
                if os.path.exists(os.path.join(script_dir, f"{module_name}.py")):
                    logger.info(f"Found main module: {module_name}")
                    main_module = importlib.import_module(module_name)
                    
                    # Look for app or application object
                    if hasattr(main_module, 'app'):
                        logger.info("Found Flask app, running...")
                        if not os.environ.get('FLASK_ENV'):
                            os.environ['FLASK_ENV'] = 'production'
                        main_module.app.run(host='0.0.0.0', port=5002)
                        break
                    else:
                        logger.warning(f"Module {module_name} found but no Flask app object detected")
            except ImportError:
                logger.warning(f"Could not import {module_name}")
        else:
            logger.error("Could not find Flask application module to run")
            print("Please run your Flask application manually after this script completes.")
            
    except Exception as e:
        logger.error(f"Error starting ensemble integration: {e}", exc_info=True)
        return 1
        
    return 0

if __name__ == "__main__":
    sys.exit(main())
