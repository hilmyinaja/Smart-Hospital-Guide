from pydantic import BaseModel
from typing import List, Optional

class RoomModel(BaseModel):
    name: str
    grid_x: int
    grid_y: int
    grid_width: int = 1
    grid_height: int = 1
    keywords: List[str] = []

class RoomUpdateModel(BaseModel):
    name: Optional[str] = None
    grid_x: Optional[int] = None
    grid_y: Optional[int] = None
    grid_width: Optional[int] = None
    grid_height: Optional[int] = None
    keywords: Optional[List[str]] = None
