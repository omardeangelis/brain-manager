/**
 * Uniform report shape across commands. Default rendering is plain text for
 * humans; `--json` emits the raw structure for agents/LLMs to consume.
 */

export interface ReportLine {
  readonly path: string
  readonly status: string
  readonly note?: string
}

export interface Report {
  readonly command: string
  readonly lines: ReadonlyArray<ReportLine>
  readonly notes: ReadonlyArray<string>
  readonly ok: boolean
}

const groupByStatus = (lines: ReadonlyArray<ReportLine>): Map<string, Array<ReportLine>> => {
  const groups = new Map<string, Array<ReportLine>>()
  for (const line of lines) {
    const bucket = groups.get(line.status) ?? []
    bucket.push(line)
    groups.set(line.status, bucket)
  }
  return groups
}

export const renderReport = (report: Report): string => {
  const out: Array<string> = [`brain ${report.command}`]
  for (const [status, lines] of groupByStatus(report.lines)) {
    out.push(`\n${status} (${lines.length}):`)
    for (const line of lines) {
      out.push(`  ${line.path}${line.note ? `  — ${line.note}` : ""}`)
    }
  }
  if (report.notes.length > 0) {
    out.push("")
    for (const note of report.notes) out.push(`note: ${note}`)
  }
  out.push("", report.ok ? "ok" : "completed with problems — see above")
  return out.join("\n")
}

export const renderReportJson = (report: Report): string =>
  JSON.stringify(report, null, 2)
