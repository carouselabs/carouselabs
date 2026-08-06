"use client"

// /admin/tasks — predefined task roster for the intern points "Quick Task"
// picker. Points/active are editable in place; names are fixed at creation
// (see PredefinedTask schema comment) so historical entries stay matched.
import { useEffect, useState } from "react"
import { Plus } from "lucide-react"
import { AdminButton, AdminInput, Modal, Spinner, fmtDate, tableCls } from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"

type Task = {
  id: string
  name: string
  points: number
  active: boolean
  createdAt: string
}

export function TasksTable() {
  const { toast } = useToast()
  const [tasks, setTasks] = useState<Task[] | null>(null)

  const [addOpen, setAddOpen] = useState(false)
  const [name, setName] = useState("")
  const [points, setPoints] = useState("")
  const [addBusy, setAddBusy] = useState(false)

  const [editing, setEditing] = useState<Task | null>(null)
  const [editPoints, setEditPoints] = useState("")
  const [editBusy, setEditBusy] = useState(false)

  const [toggleBusy, setToggleBusy] = useState<string | null>(null)

  const load = async () => {
    try {
      const res = await fetch("/api/admin/tasks")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setTasks(data.tasks)
    } catch {
      toast("Failed to load tasks", "error")
      setTasks([])
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => void load(), [])

  const addTask = async () => {
    const n = Number(points)
    if (!name.trim()) {
      toast("Task name is required", "error")
      return
    }
    if (!Number.isInteger(n)) {
      toast("Points must be a whole number", "error")
      return
    }
    setAddBusy(true)
    try {
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), points: n }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error)
      toast("Task added", "success")
      setAddOpen(false)
      setName("")
      setPoints("")
      await load()
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Failed to add task", "error")
    } finally {
      setAddBusy(false)
    }
  }

  const openEdit = (task: Task) => {
    setEditing(task)
    setEditPoints(String(task.points))
  }

  const saveEdit = async () => {
    if (!editing) return
    const n = Number(editPoints)
    if (!Number.isInteger(n)) {
      toast("Points must be a whole number", "error")
      return
    }
    setEditBusy(true)
    try {
      const res = await fetch(`/api/admin/tasks/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points: n }),
      })
      if (!res.ok) throw new Error()
      toast("Task updated", "success")
      setEditing(null)
      await load()
    } catch {
      toast("Failed to update task", "error")
    } finally {
      setEditBusy(false)
    }
  }

  const toggleActive = async (task: Task) => {
    setToggleBusy(task.id)
    try {
      const res = await fetch(`/api/admin/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !task.active }),
      })
      if (!res.ok) throw new Error()
      toast(task.active ? "Task deactivated" : "Task activated", "success")
      await load()
    } catch {
      toast("Failed to update task", "error")
    } finally {
      setToggleBusy(null)
    }
  }

  if (tasks === null) return <Spinner label="Loading tasks…" />

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-[12px] text-[#6A6A6A]">
          {tasks.length} task{tasks.length === 1 ? "" : "s"}
        </span>
        <div className="ml-auto">
          <AdminButton onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add Task
          </AdminButton>
        </div>
      </div>

      <div className={tableCls.wrap}>
        <table className={tableCls.table}>
          <thead>
            <tr>
              <th className={tableCls.th}>Name</th>
              <th className={tableCls.th}>Points</th>
              <th className={tableCls.th}>Status</th>
              <th className={tableCls.th}>Created</th>
              <th className={tableCls.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 && (
              <tr>
                <td className={tableCls.td} colSpan={5}>
                  No tasks yet
                </td>
              </tr>
            )}
            {tasks.map((t) => (
              <tr key={t.id} className={tableCls.row}>
                <td className={`${tableCls.td} text-white`}>{t.name}</td>
                <td className={`${tableCls.td} tabular-nums`}>{t.points}</td>
                <td className={tableCls.td}>
                  {t.active ? (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                      ACTIVE
                    </span>
                  ) : (
                    <span className="rounded-full bg-[#2A2A2A] px-2 py-0.5 text-[11px] font-medium text-[#8A8A8A]">
                      INACTIVE
                    </span>
                  )}
                </td>
                <td className={tableCls.td}>{fmtDate(t.createdAt)}</td>
                <td className={tableCls.td}>
                  <div className="flex items-center gap-2">
                    <AdminButton variant="secondary" onClick={() => openEdit(t)}>
                      Edit Points
                    </AdminButton>
                    <AdminButton
                      variant={t.active ? "danger" : "secondary"}
                      loading={toggleBusy === t.id}
                      onClick={() => toggleActive(t)}
                    >
                      {t.active ? "Deactivate" : "Activate"}
                    </AdminButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Task">
        <div className="space-y-3">
          <AdminInput
            placeholder="Task name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full"
          />
          <AdminInput
            type="number"
            placeholder="Points"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            className="w-full"
          />
          <div className="flex justify-end gap-2">
            <AdminButton variant="secondary" onClick={() => setAddOpen(false)}>
              Cancel
            </AdminButton>
            <AdminButton loading={addBusy} onClick={addTask}>
              Add Task
            </AdminButton>
          </div>
        </div>
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit "${editing?.name ?? ""}"`}>
        <div className="space-y-3">
          <AdminInput
            type="number"
            value={editPoints}
            onChange={(e) => setEditPoints(e.target.value)}
            className="w-full"
          />
          <div className="flex justify-end gap-2">
            <AdminButton variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </AdminButton>
            <AdminButton loading={editBusy} onClick={saveEdit}>
              Save
            </AdminButton>
          </div>
        </div>
      </Modal>
    </div>
  )
}
