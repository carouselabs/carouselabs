"use client"

// /admin/tasks — predefined task roster for the intern points "Quick Task"
// picker. Points/active/role are editable in place; names are fixed at
// creation (see PredefinedTask schema comment) so historical entries stay
// matched. Tasks are grouped by role for display: "All Roles" tasks (role is
// null, shown to every intern) first, then one group per specific role.
import { useEffect, useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { AdminButton, AdminInput, Modal, Spinner, fmtDate, tableCls } from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"

type Task = {
  id: string
  name: string
  points: number
  active: boolean
  role: string | null
  createdAt: string
}

export function TasksTable() {
  const { toast } = useToast()
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [internRoles, setInternRoles] = useState<string[]>([])

  const [addOpen, setAddOpen] = useState(false)
  const [name, setName] = useState("")
  const [points, setPoints] = useState("")
  const [scope, setScope] = useState<"all" | "specific">("all")
  const [role, setRole] = useState("")
  const [addBusy, setAddBusy] = useState(false)

  const [editing, setEditing] = useState<Task | null>(null)
  const [editPoints, setEditPoints] = useState("")
  const [editScope, setEditScope] = useState<"all" | "specific">("all")
  const [editRole, setEditRole] = useState("")
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

  // Role suggestions for the datalist — pulled from existing interns' role
  // field so the free-text input stays consistent with what's actually used.
  useEffect(() => {
    fetch("/api/admin/interns")
      .then((r) => (r.ok ? r.json() : { interns: [] }))
      .then((d: { interns?: { role: string | null }[] }) => {
        const roles = [...new Set((d.interns ?? []).map((i) => i.role).filter((r): r is string => !!r))].sort()
        setInternRoles(roles)
      })
      .catch(() => setInternRoles([]))
  }, [])

  const groups = useMemo(() => {
    if (!tasks) return []
    const allRoleTasks = tasks.filter((t) => !t.role)
    const byRole = new Map<string, Task[]>()
    for (const t of tasks) {
      if (!t.role) continue
      byRole.set(t.role, [...(byRole.get(t.role) ?? []), t])
    }
    const specificGroups = [...byRole.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    return [
      { label: "All Roles", tasks: allRoleTasks },
      ...specificGroups.map(([label, groupTasks]) => ({ label, tasks: groupTasks })),
    ].filter((g) => g.tasks.length > 0)
  }, [tasks])

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
    if (scope === "specific" && !role.trim()) {
      toast("Enter a role, or switch back to All Roles", "error")
      return
    }
    setAddBusy(true)
    try {
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), points: n, role: scope === "specific" ? role.trim() : null }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error)
      toast("Task added", "success")
      setAddOpen(false)
      setName("")
      setPoints("")
      setScope("all")
      setRole("")
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
    setEditScope(task.role ? "specific" : "all")
    setEditRole(task.role ?? "")
  }

  const saveEdit = async () => {
    if (!editing) return
    const n = Number(editPoints)
    if (!Number.isInteger(n)) {
      toast("Points must be a whole number", "error")
      return
    }
    if (editScope === "specific" && !editRole.trim()) {
      toast("Enter a role, or switch back to All Roles", "error")
      return
    }
    setEditBusy(true)
    try {
      const res = await fetch(`/api/admin/tasks/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          points: n,
          role: editScope === "specific" ? editRole.trim() : null,
        }),
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

  const roleRow = (
    scopeVal: "all" | "specific",
    setScopeVal: (v: "all" | "specific") => void,
    roleVal: string,
    setRoleVal: (v: string) => void,
  ) => (
    <div className="space-y-2">
      <div className="flex rounded-lg border border-[#2A2A2A] bg-[#141414] p-1">
        {(
          [
            { key: "all", label: "All Roles" },
            { key: "specific", label: "Specific Role" },
          ] as const
        ).map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => setScopeVal(o.key)}
            className={`flex-1 rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors ${
              scopeVal === o.key ? "bg-[#7C3AED] text-white" : "text-[#8A8A8A] hover:text-white"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {scopeVal === "specific" && (
        <>
          <AdminInput
            list="intern-role-suggestions"
            placeholder="Role (e.g. Marketing Intern)"
            value={roleVal}
            onChange={(e) => setRoleVal(e.target.value)}
            className="w-full"
          />
          <datalist id="intern-role-suggestions">
            {internRoles.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </>
      )}
    </div>
  )

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

      {tasks.length === 0 ? (
        <div className={tableCls.wrap}>
          <table className={tableCls.table}>
            <tbody>
              <tr>
                <td className={tableCls.td}>No tasks yet</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.label} className="space-y-2">
              <h3 className="text-[11.5px] font-semibold uppercase tracking-wide text-[#8A8A8A]">
                {g.label} <span className="text-[#5A5A5A]">({g.tasks.length})</span>
              </h3>
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
                    {g.tasks.map((t) => (
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
                              Edit
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
            </div>
          ))}
        </div>
      )}

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
          {roleRow(scope, setScope, role, setRole)}
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
          {roleRow(editScope, setEditScope, editRole, setEditRole)}
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
