from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Quantum Maze Solver",
    description="A FastAPI application for solving mazes using quantum algorithms.",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173/"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/test")
def health_check():
    return {
        "status": "success",
        "message": "Quantum Maze Solver API is running!"
    }

