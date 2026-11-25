"""App factory: wires settings, CORS, error handling and routes together."""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .api.routes import router
from .core.config import settings
from .domain.errors import QuantumMazeError
from .services.maze_service import ServerBusyError


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_title,
        description=settings.app_description,
        version=settings.app_version,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(QuantumMazeError)
    async def _bad_request(_: Request, exc: QuantumMazeError):
        return JSONResponse(status_code=422, content={"detail": str(exc)})

    @app.exception_handler(ServerBusyError)
    async def _busy(_: Request, exc: ServerBusyError):
        return JSONResponse(status_code=503, content={"detail": str(exc)})

    app.include_router(router)
    return app


app = create_app()
