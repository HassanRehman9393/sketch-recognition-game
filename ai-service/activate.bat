@echo off
echo Activating virtual environment...
call venv\Scripts\activate
if %errorlevel% neq 0 (
    echo Failed to activate virtual environment.
    echo Make sure the virtual environment exists by running:
    echo     python setup_env.py
    exit /b %errorlevel%
)
echo Virtual environment activated successfully.
echo.
echo Now you can run:
echo     python download_dataset.py --list
echo     python download_dataset.py --categories apple cat chair
echo     pip install -r requirements.txt
echo.
