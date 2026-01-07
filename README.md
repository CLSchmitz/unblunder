# Unblunder New MVP

A Django REST API backend with React TypeScript frontend that automatically analyzes chess.com games for blunders.

## Features

- Fetch up to 20 most recent games from chess.com
- Automatically analyze all games for blunders (200+ centipawn loss)
- Interactive chessboard to attempt corrections
- Track outcomes (Best Move, Was Blunder, Neither)
- Navigate through blunders with Previous/Next buttons

## Setup

### Backend Setup

#### Using uv (Recommended - Faster)

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install uv if you haven't already:
```bash
# Windows (PowerShell):
irm https://astral.sh/uv/install.ps1 | iex
# Mac/Linux:
curl -LsSf https://astral.sh/uv/install.sh | sh
```

3. Install dependencies:
```bash
uv sync --no-install-project
```

Note: The `--no-install-project` flag is needed because Django projects don't need to be installed as packages.

4. Run migrations:
```bash
uv run python manage.py makemigrations
uv run python manage.py migrate
```

5. Create a superuser (optional, for admin access):
```bash
uv run python manage.py createsuperuser
```

6. Start the Django server:
```bash
uv run python manage.py runserver
```

#### Using pip (Traditional)

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run migrations:
```bash
python manage.py makemigrations
python manage.py migrate
```

5. Create a superuser (optional, for admin access):
```bash
python manage.py createsuperuser
```

6. Start the Django server:
```bash
python manage.py runserver
```

The backend will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Usage

1. Open the frontend in your browser (`http://localhost:5173`)
2. Enter a chess.com username in the left panel
3. Click "Find Blunders"
4. Wait for analysis to complete (this may take a few minutes)
5. Navigate through blunders using Previous/Next buttons
6. Make moves on the chessboard to attempt corrections
7. Select an outcome after making a move

## Architecture

### Backend
- **Django REST Framework** for API endpoints
- **Stockfish** integration for position evaluation
- **Chess.com API** integration for fetching games
- **SQLite** database (default, can be changed in settings)

### Frontend
- **React** with **TypeScript**
- **react-chessboard** for chessboard UI
- **chess.js** for move validation
- **Context API** for state management

## API Endpoints

- `POST /api/analyze/` - Analyze games for a username
- `GET /api/blunders/` - Get all blunders
- `GET /api/blunders/{id}/` - Get specific blunder
- `POST /api/blunders/{id}/attempt/` - Submit outcome for a blunder

## Desktop Executable

You can create a one-click desktop executable for Windows! See [BUILD.md](BUILD.md) for detailed instructions.

### Quick Start (Simple Launcher)

**Option 1: Batch Script**
- Double-click `Unblunder.bat` to start the app
- Requires Python and Node.js to be installed

**Option 2: PowerShell Script**
- Right-click `Unblunder.ps1` → "Run with PowerShell"
- Requires Python and Node.js to be installed

**Option 3: Electron Desktop App** (Recommended for distribution)
- Run `npm install` in the project root
- Run `npm run electron:build` to create an installer
- See [BUILD.md](BUILD.md) for full instructions

## Notes

- Stockfish executable must be in the project root (`stockfish-windows-x86-64-avx2.exe`)
- Analysis can take several minutes depending on number of games
- Default blunder threshold: 200 centipawns (2 pawns)
- Default Stockfish depth: 15

