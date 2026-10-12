"use client"

// Tab — Certificates: upload a certificate file (PDF/image) for this intern,
// which generates a unique verification code and creates the InternCertificate
// row the public /verify-certificate page looks up. Also lists everything
// issued so far, with view/delete actions.
import { useRef, useState } from "react"
import { Award, Copy, Check, ExternalLink, Trash2, UploadCloud } from "lucide-react"
import { AdminButton, AdminCard, AdminInput, ConfirmModal, Modal, fmtDate, tableCls } from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"
import type { InternCertificateT } from "@/components/admin/intern/types"

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10)
}

const ALLOWED_ACCEPT = ".pdf,image/png,image/jpeg,image/webp"
const MAX_BYTES = 10 * 1024 * 1024

function fileToBase64(file: File): Promise<{ base64: string; contentType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(",")[1] ?? ""
      resolve({ base64, contentType: file.type })
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function CertificatesTab({
  internId,
  certificates,
  onRefresh,
}: {
  internId: string
  certificates: InternCertificateT[]
  onRefresh: () => void
}) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [uploadOpen, setUploadOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [issuedFor, setIssuedFor] = useState("")
  const [issuedDate, setIssuedDate] = useState(todayInputValue())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdCode, setCreatedCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<InternCertificateT | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  function resetUploadForm() {
    setFile(null)
    setIssuedFor("")
    setIssuedDate(todayInputValue())
    setError(null)
    setCreatedCode(null)
    setCopied(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function closeUpload() {
    setUploadOpen(false)
    resetUploadForm()
  }

  async function submitUpload() {
    if (!file) {
      setError("Choose a certificate file")
      return
    }
    if (file.size > MAX_BYTES) {
      setError("File too large (max 10MB)")
      return
    }
    if (!issuedFor.trim()) {
      setError("Enter what this certificate was issued for")
      return
    }
    setBusy(true)
    setError(null)
    try {
      const { base64, contentType } = await fileToBase64(file)
      const res = await fetch(`/api/admin/interns/${internId}/certificates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileBase64: base64,
          contentType,
          issuedFor: issuedFor.trim(),
          issuedDate,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to upload certificate")
      setCreatedCode(data.certificate.verificationCode)
      onRefresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to upload certificate")
    } finally {
      setBusy(false)
    }
  }

  async function copyCode() {
    if (!createdCode) return
    await navigator.clipboard.writeText(createdCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleteBusy(true)
    try {
      const res = await fetch(`/api/admin/interns/${internId}/certificates/${deleteTarget.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error()
      toast("Certificate deleted", "success")
      setDeleteTarget(null)
      onRefresh()
    } catch {
      toast("Failed to delete certificate", "error")
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <AdminCard
        title={`Certificates (${certificates.length})`}
        actions={
          <AdminButton onClick={() => setUploadOpen(true)}>
            <UploadCloud className="h-3.5 w-3.5" />
            Upload Certificate
          </AdminButton>
        }
      >
        {certificates.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-[#8A8A8A]">No certificates issued yet.</p>
        ) : (
          <div className={tableCls.wrap}>
            <table className={tableCls.table}>
              <thead>
                <tr>
                  <th className={tableCls.th}>Code</th>
                  <th className={tableCls.th}>Issued For</th>
                  <th className={tableCls.th}>Issued Date</th>
                  <th className={tableCls.th} />
                </tr>
              </thead>
              <tbody>
                {certificates.map((c) => (
                  <tr key={c.id} className={tableCls.row}>
                    <td className={`${tableCls.td} font-mono text-white`}>{c.verificationCode}</td>
                    <td className={tableCls.td}>{c.issuedFor}</td>
                    <td className={tableCls.td}>{fmtDate(c.issuedDate)}</td>
                    <td className={`${tableCls.td} text-right`}>
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={c.certificateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg p-1.5 text-[#8A8A8A] transition-colors hover:bg-[#232323] hover:text-white"
                          title="View certificate"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        <button
                          onClick={() => setDeleteTarget(c)}
                          className="rounded-lg p-1.5 text-[#8A8A8A] transition-colors hover:bg-[#3A1520] hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      <Modal
        open={uploadOpen}
        onClose={closeUpload}
        title={createdCode ? "Certificate Issued" : "Upload Certificate"}
      >
        {createdCode ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2 rounded-xl border border-[#2A2A2A] bg-[#141414] py-6">
              <Award className="h-8 w-8 text-[#7C3AED]" />
              <span className="font-mono text-[20px] font-bold tracking-wide text-white">{createdCode}</span>
            </div>
            <AdminButton variant="secondary" className="w-full" onClick={() => void copyCode()}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy Code"}
            </AdminButton>
            <p className="text-[12.5px] leading-relaxed text-[#8A8A8A]">
              Add this code to the certificate before giving it to the intern — it&apos;s what they (or
              anyone) can use to verify it&apos;s genuine at{" "}
              <span className="text-white">carouselabs.com/verify-certificate</span>.
            </p>
            <div className="flex justify-end">
              <AdminButton onClick={closeUpload}>Done</AdminButton>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-[#8A8A8A]">
                Certificate file (PDF or image)
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_ACCEPT}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-[12.5px] text-[#B0B0B0] file:mr-3 file:rounded-lg file:border-0 file:bg-[#232323] file:px-3 file:py-2 file:text-[12px] file:font-semibold file:text-white hover:file:bg-[#2E2E2E]"
              />
              {file && (
                <p className="mt-1 text-[11px] text-[#6A6A6A]">
                  {file.name} ({(file.size / 1024).toFixed(0)} KB)
                </p>
              )}
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-[#8A8A8A]">Issued for</span>
              <AdminInput
                value={issuedFor}
                onChange={(e) => setIssuedFor(e.target.value)}
                placeholder="e.g. 3-Month Marketing Internship Completion"
                className="w-full"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-[#8A8A8A]">Issued date</span>
              <AdminInput
                type="date"
                value={issuedDate}
                onChange={(e) => setIssuedDate(e.target.value)}
                className="w-full"
              />
            </label>
            {error && (
              <div className="rounded-lg border border-[#5A2030] bg-[#3A1520] px-3 py-2 text-[12px] text-red-400">
                {error}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <AdminButton variant="secondary" onClick={closeUpload}>
                Cancel
              </AdminButton>
              <AdminButton loading={busy} onClick={() => void submitUpload()}>
                Upload &amp; Generate Code
              </AdminButton>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
        loading={deleteBusy}
        title="Delete this certificate?"
        body={`This removes ${deleteTarget?.verificationCode ?? "this certificate"} from the record — the code will no longer verify. This can't be undone.`}
        confirmLabel="Delete"
      />
    </div>
  )
}
