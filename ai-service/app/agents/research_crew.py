from crewai import Agent, Task, Crew, Process, LLM
from app.core.config import settings


def create_research_crew() -> Crew:
    llm = LLM(
        model=settings.crewai_model,
        api_key=settings.openrouter_api_key,
        base_url="https://openrouter.ai/api/v1",
    )

    researcher = Agent(
        role="Research Analyst",
        goal="Analyze topics thoroughly and provide comprehensive insights",
        backstory="You are an expert research analyst with deep knowledge across many domains.",
        verbose=True,
        allow_delegation=False,
        llm=llm,
    )

    writer = Agent(
        role="Content Writer",
        goal="Synthesize research into clear, engaging content",
        backstory="You transform complex research into accessible and well-structured content.",
        verbose=True,
        allow_delegation=False,
        llm=llm,
    )

    research_task = Task(
        description="Research the following topic: {topic}. Provide key findings, data points, and insights.",
        expected_output="A detailed research report with key findings and analysis",
        agent=researcher,
    )

    write_task = Task(
        description="Using the research provided, create a well-structured summary on the topic: {topic}",
        expected_output="A polished, well-written summary of the research findings",
        agent=writer,
    )

    crew = Crew(
        agents=[researcher, writer],
        tasks=[research_task, write_task],
        process=Process.sequential,
        verbose=True,
    )

    return crew
