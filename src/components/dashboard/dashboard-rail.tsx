"use client";

import { useState } from "react";

import { ActiveGoalsSection } from "@/components/dashboard/active-goals-section";
import { ConsistencyHeatmap } from "@/components/dashboard/consistency-heatmap";
import { OpenTasksSection } from "@/components/dashboard/open-tasks-section";
import type { WorkspaceDashboard } from "@/lib/data/dashboard";

type RailTab = "overview" | "tasks" | "goals";

export function DashboardRail({ data, workspaceId }: { data: WorkspaceDashboard; workspaceId: string }) {
  const [selected, setSelected] = useState<RailTab>("overview");

  return (
    <aside className="dashboard-rail" data-selected={selected} aria-label="Progress overview">
      <div className="dashboard-tabs" role="group" aria-label="Today sections">
        {(["overview", "tasks", "goals"] as const).map((tab) => (
          <button className="dashboard-tab" type="button" aria-pressed={selected === tab} key={tab} onClick={() => setSelected(tab)}>
            {tab === "overview" ? "Overview" : tab === "tasks" ? "Tasks" : "Goals"}
          </button>
        ))}
      </div>
      <div className="dashboard-rail-panel" data-panel="overview">
        <ConsistencyHeatmap today={data.today} startDate={data.challenge?.start_date ?? ""} endDate={data.challenge?.end_date ?? ""} checkinDates={data.calendarDates} />
      </div>
      <div className="dashboard-rail-panel" data-panel="tasks">
        <OpenTasksSection tasks={data.openTasks} memberProfiles={data.workspaceMembers} workspaceId={workspaceId} />
      </div>
      <div className="dashboard-rail-panel" data-panel="goals">
        <ActiveGoalsSection goals={data.activeGoals} memberProfiles={data.workspaceMembers} workspaceId={workspaceId} />
      </div>
    </aside>
  );
}
