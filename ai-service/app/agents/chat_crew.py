from crewai import Agent, Task, Crew, Process, LLM
from app.core.config import settings


def create_chat_crew() -> Crew:
    llm = LLM(
        model=settings.crewai_model,
        api_key=settings.openrouter_api_key,
        base_url="https://openrouter.ai/api/v1",
    )

    assistant = Agent(
        role="AI Assistant",
        goal="Help users with their questions and tasks",
        backstory="You are a helpful AI assistant powered by crewAI.",
        verbose=True,
        allow_delegation=False,
        llm=llm,
    )

    chat_task = Task(
        description="Respond to the user's message: {message}",
        expected_output="A helpful and accurate response to the user",
        agent=assistant,
    )

    crew = Crew(
        agents=[assistant],
        tasks=[chat_task],
        process=Process.sequential,
        verbose=True,
    )

    return crew
