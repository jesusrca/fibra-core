import type { ReactNode } from 'react'
import Link from 'next/link'

type RichTextMessageProps = {
    content: string
    className?: string
}

function renderInline(text: string, keyPrefix: string) {
    const parts: ReactNode[] = []
    const pattern = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g
    let last = 0
    let match: RegExpExecArray | null
    let idx = 0

    while ((match = pattern.exec(text)) !== null) {
        if (match.index > last) {
            parts.push(<span key={`${keyPrefix}-t-${idx++}`}>{text.slice(last, match.index)}</span>)
        }

        const token = match[0]
        if (token.startsWith('**') && token.endsWith('**')) {
            parts.push(<strong key={`${keyPrefix}-b-${idx++}`}>{token.slice(2, -2)}</strong>)
        } else {
            const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
            if (linkMatch) {
                const [, label, href] = linkMatch
                const isInternal = href.startsWith('/')
                parts.push(
                    isInternal ? (
                        <Link
                            key={`${keyPrefix}-l-${idx++}`}
                            href={href}
                            className="text-primary underline underline-offset-2 hover:text-primary/80"
                        >
                            {label}
                        </Link>
                    ) : (
                        <a
                            key={`${keyPrefix}-l-${idx++}`}
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline underline-offset-2 hover:text-primary/80"
                        >
                            {label}
                        </a>
                    )
                )
            } else {
                parts.push(<span key={`${keyPrefix}-t-${idx++}`}>{token}</span>)
            }
        }
        last = pattern.lastIndex
    }

    if (last < text.length) {
        parts.push(<span key={`${keyPrefix}-t-${idx++}`}>{text.slice(last)}</span>)
    }

    return parts
}

export function RichTextMessage({ content, className }: RichTextMessageProps) {
    const lines = content
        .split('\n')
        .map((line) => line.trim())
    const nodes: ReactNode[] = []
    let listItems: string[] = []
    let tableBuffer: string[] = []

    const flushList = (key: string) => {
        if (!listItems.length) return
        nodes.push(
            <ul key={`ul-${key}`} className="my-2 list-disc space-y-1 pl-5">
                {listItems.map((item, i) => (
                    <li key={`li-${key}-${i}`} className="leading-relaxed">
                        {renderInline(item, `li-${key}-${i}`)}
                    </li>
                ))}
            </ul>
        )
        listItems = []
    }

    const flushTable = (key: string) => {
        if (tableBuffer.length < 2) {
            tableBuffer = []
            return
        }

        const rows = tableBuffer
            .map((line) =>
                line
                    .split('|')
                    .map((cell) => cell.trim())
                    .filter(Boolean)
            )
            .filter((cells) => cells.length > 0)

        if (rows.length < 2) {
            tableBuffer = []
            return
        }

        const separator = rows[1]
        const isSeparator = separator.every((cell) => /^:?-{3,}:?$/.test(cell))
        if (!isSeparator) {
            tableBuffer = []
            return
        }

        const headers = rows[0]
        const body = rows.slice(2)
        nodes.push(
            <div key={`table-wrap-${key}`} className="my-3 overflow-x-auto rounded-lg border border-border/70">
                <table className="w-full min-w-[360px] border-collapse text-sm">
                    <thead className="bg-muted/40">
                        <tr>
                            {headers.map((header, idx) => (
                                <th key={`th-${key}-${idx}`} className="border-b border-border/70 px-3 py-2 text-left font-semibold">
                                    {renderInline(header, `th-${key}-${idx}`)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {body.map((row, rIdx) => (
                            <tr key={`tr-${key}-${rIdx}`} className="odd:bg-background even:bg-muted/10">
                                {headers.map((_, cIdx) => (
                                    <td key={`td-${key}-${rIdx}-${cIdx}`} className="border-b border-border/50 px-3 py-2 align-top">
                                        {renderInline(row[cIdx] || '', `td-${key}-${rIdx}-${cIdx}`)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )
        tableBuffer = []
    }

    lines.forEach((line, i) => {
        if (!line) {
            flushList(String(i))
            flushTable(String(i))
            return
        }

        if (line.includes('|')) {
            flushList(String(i))
            tableBuffer.push(line)
            return
        }

        if (line.startsWith('- ')) {
            flushTable(String(i))
            listItems.push(line.slice(2).trim())
            return
        }

        flushList(String(i))
        flushTable(String(i))

        if (line.startsWith('### ')) {
            nodes.push(
                <h4 key={`h4-${i}`} className="pt-1 text-sm font-semibold">
                    {renderInline(line.slice(4), `h4-${i}`)}
                </h4>
            )
            return
        }
        if (line.startsWith('## ')) {
            nodes.push(
                <h3 key={`h3-${i}`} className="pt-1 text-base font-semibold">
                    {renderInline(line.slice(3), `h3-${i}`)}
                </h3>
            )
            return
        }
        if (line.startsWith('# ')) {
            nodes.push(
                <h2 key={`h2-${i}`} className="pt-1 text-lg font-bold">
                    {renderInline(line.slice(2), `h2-${i}`)}
                </h2>
            )
            return
        }

        nodes.push(<p key={`p-${i}`} className="leading-relaxed">{renderInline(line, `p-${i}`)}</p>)
    })

    flushList('end')
    flushTable('end')

    return <div className={className || 'space-y-2'}>{nodes}</div>
}
