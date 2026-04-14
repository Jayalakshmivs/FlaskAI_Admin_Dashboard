import { cn } from "@/lib/utils"

export interface TimelineItemProps {
  title: string
  description?: string
  status: "Success" | "Failure" | "In Progress"
  time?: string
  isLast?: boolean
}

const TimelineItem = ({ title, description, status, time, isLast }: TimelineItemProps) => {
  const statusColor = {
    "Success": "bg-green-500",
    "Failure": "bg-red-500",
    "In Progress": "bg-blue-500 animate-pulse"
  }[status]

  return (
    <div className="flex gap-4 mb-8 relative">
      {!isLast && (
        <div className="absolute left-[11px] top-6 w-[2px] h-full bg-slate-200 dark:bg-slate-800" />
      )}
      <div className={cn("mt-1 w-6 h-6 rounded-full border-4 border-white dark:border-slate-950 z-10 shrink-0", statusColor)} />
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-sm">{title}</h4>
          {time && <span className="text-xs text-slate-500">{time}</span>}
        </div>
        {description && <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>}
      </div>
    </div>
  )
}

export const Timeline = ({ items }: { items: TimelineItemProps[] }) => {
  return (
    <div className="py-4">
      {items.map((item, index) => (
        <TimelineItem key={index} {...item} isLast={index === items.length - 1} />
      ))}
    </div>
  )
}
