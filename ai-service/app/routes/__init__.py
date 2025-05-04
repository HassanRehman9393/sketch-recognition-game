# This file ensures the routes directory is treated as a Python package

"""
Routes package for the Flask application
"""

def register_routes(app):
    """Register all blueprints with the app"""
    from app.routes.recognition_routes import recognition_bp
    
    app.register_blueprint(recognition_bp)
    
    # Log registered routes
    routes = []
    for rule in app.url_map.iter_rules():
        routes.append(f"{rule.endpoint}: {rule.rule}")
    
    app.logger.info(f"Registered routes:")
    for route in routes:
        app.logger.info(f"  - {route}")
