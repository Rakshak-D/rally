import Link from "next/link";

type StatusCount = { value: string; label: string; count: number };

export function RecordStatusFilters({
  route,
  statuses,
  selected,
  workspaceId,
}: {
  route: "/goals" | "/tasks";
  statuses: StatusCount[];
  selected: string;
  workspaceId: string;
}) {
  return (
    <nav className="record-status-filters" aria-label={`${route === "/goals" ? "Goal" : "Task"} status`}>
      {statuses.map((status) => {
        const params = new URLSearchParams({ workspace: workspaceId });
        if (status.value !== "all") params.set("status", status.value);
        return (
          <Link
            aria-current={selected === status.value ? "page" : undefined}
            className="record-status-filter"
            href={`${route}?${params.toString()}`}
            key={status.value}
          >
            <span>{status.label}</span><strong>{status.count}</strong>
          </Link>
        );
      })}
    </nav>
  );
}
