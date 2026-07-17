"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import OverviewInteractive from "./overview-interactive.client"
import TeamTasksInteractive from "../teamtasks/teamtasks-interactive.client"
import AllTasksInteractive from "../alltasks/alltasks-interactive.client"
import MyTasksInteractive from "../mytasks/mytasks-interactive.client"
import SavedTasksInteractive from "../savedtasks/savedtasks-interactive.client"
import UpcomingTasksInteractive from "../upcomingtasks/upcomingtasks-interactive.client"
import type { Task } from "./columns.client"
import type { TeamTask } from "../teamtasks/teamtasks-interactive.client"
import type { AllTasksProps } from "../alltasks/alltasks-interactive.client"
import type { MyTasksProps } from "../mytasks/mytasks-interactive.client"
import type { SavedTask } from "../savedtasks/savedtasks-interactive.client"
import type { UpcomingTask } from "../upcomingtasks/upcomingtasks-interactive.client"

type OverviewClientProps = {
  overviewTasks: Task[]
  currentUserId: string
  teamTasks: TeamTask[]
  allTasks: AllTasksProps["initialTasks"]
  orgId: string
  myTasks: MyTasksProps["initialTasks"]
  userId: string
  savedTasks: SavedTask[]
  upcomingTasks: UpcomingTask[]
}

export default function OverviewClient({
  overviewTasks,
  currentUserId,
  teamTasks,
  allTasks,
  orgId,
  myTasks,
  userId,
  savedTasks,
  upcomingTasks,
}: OverviewClientProps) {
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="border-b border-border rounded-b-none justify-start w-full bg-transparent h-auto p-0 gap-1 max-h-10! *:flex-none">
        <TabsTrigger
          value="overview"
          className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2"
        >
          Overview
        </TabsTrigger>
        <TabsTrigger
          value="team_tasks"
          className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2"
        >
          Team Tasks
        </TabsTrigger>
        <TabsTrigger
          value="all_tasks"
          className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2"
        >
          All Tasks
        </TabsTrigger>
        <TabsTrigger
          value="my_tasks"
          className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2"
        >
          My Tasks
        </TabsTrigger>
        <TabsTrigger
          value="saved_tasks"
          className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2"
        >
          Saved Tasks
        </TabsTrigger>
        <TabsTrigger
          value="upcoming_tasks"
          className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2"
        >
          Upcoming Tasks
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-4">
        <OverviewInteractive tasks={overviewTasks} currentUserId={currentUserId} />
      </TabsContent>

      <TabsContent value="team_tasks" className="mt-4">
        <TeamTasksInteractive tasks={teamTasks} />
      </TabsContent>

      <TabsContent value="all_tasks" className="mt-4">
        <AllTasksInteractive initialTasks={allTasks} orgId={orgId} />
      </TabsContent>

      <TabsContent value="my_tasks" className="mt-4">
        <MyTasksInteractive initialTasks={myTasks} orgId={orgId} userId={userId} />
      </TabsContent>

      <TabsContent value="saved_tasks" className="mt-4">
        <SavedTasksInteractive initialTasks={savedTasks} />
      </TabsContent>

      <TabsContent value="upcoming_tasks" className="mt-4">
        <UpcomingTasksInteractive initialTasks={upcomingTasks} />
      </TabsContent>
    </Tabs>
  )
}
