from crewai import Crew, Process
from app.agents.research_crew import create_research_crew
from app.agents.chat_crew import create_chat_crew


class CrewService:
    def __init__(self):
        self._crews = {
            "research": create_research_crew,
            "chat": create_chat_crew,
        }

    def run_crew(self, crew_type: str, inputs: dict) -> str:
        creator = self._crews.get(crew_type)
        if not creator:
            raise ValueError(f"Unknown crew type: {crew_type}")
        crew = creator()
        result = crew.kickoff(inputs=inputs)
        return str(result)


crew_service = CrewService()
