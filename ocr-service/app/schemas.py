from pydantic import BaseModel
from typing import List, Optional


class LineResult(BaseModel):
    text: str
    confidence: float


class OCRResponse(BaseModel):
    success: bool
    text: Optional[str] = None
    lines: Optional[List[LineResult]] = None


class HealthResponse(BaseModel):
    status: str
