@echo off
setlocal enabledelayedexpansion

:: Configuration
set "XPI_NAME=regex_message_tagger.xpi"
set "SEVENZIP=C:\Program Files\7-Zip\7z.exe"

:: Check if 7-Zip exists
if not exist "%SEVENZIP%" (
    echo ERROR: 7-Zip not found at %SEVENZIP%
    echo Please install 7-Zip or update the path in this script.
    pause
    exit /b 1
)

:: Check if source files exist
set "MISSING_FILES="
for %%f in (manifest.json background.js options.html options.js) do (
    if not exist "%%f" (
        set "MISSING_FILES=!MISSING_FILES! %%f"
    )
)

if not "!MISSING_FILES!"=="" (
    echo ERROR: Missing required files:!MISSING_FILES!
    pause
    exit /b 1
)

:: Delete old XPI if it exists
if exist "%XPI_NAME%" (
    echo Deleting old %XPI_NAME%...
    del /f "%XPI_NAME%"
    if errorlevel 1 (
        echo ERROR: Failed to delete old %XPI_NAME%
        pause
        exit /b 1
    )
    echo Old file deleted successfully.
) else (
    echo No existing %XPI_NAME% found.
)

:: Create new XPI with 7-Zip
echo Creating new %XPI_NAME%...
"%SEVENZIP%" a -tzip "%XPI_NAME%" manifest.json background.js options.html options.js -mx=9

if errorlevel 1 (
    echo ERROR: Failed to create %XPI_NAME%
    pause
    exit /b 1
)

echo.
echo SUCCESS: Created %XPI_NAME% with the following files:
"%SEVENZIP%" l "%XPI_NAME%" | findstr "manifest.json background.js options.html options.js"
echo.

pause