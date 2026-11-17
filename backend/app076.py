"""ATLAS-076 API extension preserving existing ATLAS-075 endpoints."""
from api import app
from fastapi import HTTPException
from pydantic import BaseModel
from experiment076 import run_experiment
class ExperimentPayload(BaseModel):
    scenario:str='baseline'
    budget:int=160
    repetitions:int=16
    items:int=8
    seed:int=76026
@app.post('/v1/experiment')
def experiment(request:ExperimentPayload):
    try:return run_experiment(**request.model_dump())
    except ValueError as e:raise HTTPException(status_code=422,detail=str(e)) from e
