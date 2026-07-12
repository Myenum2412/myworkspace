from crewai.tools import BaseTool
from typing import Type, Any
from pydantic import BaseModel, Field


class ExampleToolInput(BaseModel):
    query: str = Field(description="The input query to process")


class ExampleTool(BaseTool):
    name: str = "example_tool"
    description: str = "An example tool that echoes input back"
    args_schema: Type[BaseModel] = ExampleToolInput

    def _run(self, query: str) -> str:
        return f"Processed: {query}"
