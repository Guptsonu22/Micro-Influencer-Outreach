"""Custom exceptions and standardized error response models."""

from datetime import datetime
from typing import Any, Dict, Optional
from fastapi import Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    code: str = Field(..., description="Machine-readable error identifier")
    message: str = Field(..., description="Human-readable explanation of the error")
    details: Optional[Any] = Field(default=None, description="Optional extra error context or field errors")


class StandardErrorResponse(BaseModel):
    """Standardized API error response format across all endpoints."""
    error: ErrorDetail
    status_code: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class AppException(Exception):
    """Base application exception."""
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Any] = None
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(message)


class ValidationError(AppException):
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(
            code="VALIDATION_ERROR",
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details
        )


class ResourceNotFoundError(AppException):
    def __init__(self, resource: str, identifier: str):
        super().__init__(
            code="RESOURCE_NOT_FOUND",
            message=f"{resource} with identifier '{identifier}' was not found.",
            status_code=status.HTTP_404_NOT_FOUND
        )


class DuplicateResourceError(AppException):
    def __init__(self, resource: str, identifier: str):
        super().__init__(
            code="DUPLICATE_RESOURCE",
            message=f"{resource} with identifier '{identifier}' already exists.",
            status_code=status.HTTP_409_CONFLICT
        )


class QuotaExceededError(AppException):
    def __init__(self, service_name: str, message: str = "API daily quota exceeded."):
        super().__init__(
            code="QUOTA_EXCEEDED",
            message=f"{service_name}: {message}",
            status_code=status.HTTP_429_TOO_MANY_REQUESTS
        )


class DatabaseConnectionError(AppException):
    def __init__(self, message: str = "Database connection failed."):
        super().__init__(
            code="DATABASE_ERROR",
            message=message,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE
        )


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """FastAPI exception handler for application-defined errors."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details
            },
            "status_code": exc.status_code,
            "timestamp": datetime.utcnow().isoformat()
        }
    )
