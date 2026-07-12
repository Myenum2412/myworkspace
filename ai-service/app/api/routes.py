from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.crew_service import crew_service

router = APIRouter()


class CrewRequest(BaseModel):
    crew_type: str
    inputs: dict


class HealthResponse(BaseModel):
    status: str
    service: str


@router.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(status="ok", service="crewai")


@router.post("/crew/run")
async def run_crew(request: CrewRequest):
    try:
        result = crew_service.run_crew(request.crew_type, request.inputs)
        return {"result": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
