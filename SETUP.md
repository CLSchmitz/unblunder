# Quick Setup Guide

## Prerequisites

- Python 3.8+ installed
- Node.js 16+ and npm installed
- Stockfish executable in project root (`stockfish-windows-x86-64-avx2.exe`)

## Backend Setup (5 minutes)

### Option 1: Using uv (Recommended - Faster)

```bash
# Navigate to backend
cd backend

# Install uv if you haven't already
# Windows (PowerShell):
irm https://astral.sh/uv/install.ps1 | iex
# Mac/Linux:
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install dependencies and create virtual environment
# For Django projects, we skip installing the project itself
uv sync --no-install-project

# Run migrations
uv run python manage.py makemigrations
uv run python manage.py migrate

# Start server
uv run python manage.py runserver
```

### Option 2: Using pip (Traditional)

```bash
# Navigate to backend
cd backend

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Start server
python manage.py runserver
```

Backend will run on `http://localhost:8000`

## Frontend Setup (2 minutes)

```bash
# Navigate to frontend (in a new terminal)
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will run on `http://localhost:5173`

## Usage

1. Open `http://localhost:5173` in your browser
2. Enter a chess.com username
3. Click "Find Blunders"
4. Wait for analysis (may take a few minutes)
5. Navigate through blunders and try to correct them!

## Troubleshooting

### Backend Issues

- **Import errors**: Make sure you're in the `backend` directory and virtual environment is activated (or using `uv run`)
- **Stockfish not found**: Ensure `stockfish-windows-x86-64-avx2.exe` is in the project root
- **Database errors**: Run `uv run python manage.py migrate` (or `python manage.py migrate`) again
- **uv not found**: Install uv first - see Option 1 in Backend Setup above

### Frontend Issues

- **Port already in use**: Change port in `vite.config.ts` or kill the process using port 5173
- **API connection errors**: Ensure backend is running on port 8000
- **Module not found**: Run `npm install` again

## Testing with a Real Username

Try these popular chess.com usernames for testing:
- `hikaru` (Hikaru Nakamura)
- `danielnaroditsky` (Daniel Naroditsky)
- Or use your own chess.com username!

