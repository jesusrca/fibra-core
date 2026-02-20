export function parseCsvText(csvText: string): string[][] {
    const rows: string[][] = []
    let currentField = ''
    let currentRow: string[] = []
    let inQuotes = false

    for (let i = 0; i < csvText.length; i += 1) {
        const char = csvText[i]
        const nextChar = csvText[i + 1]

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                currentField += '"'
                i += 1
            } else {
                inQuotes = !inQuotes
            }
            continue
        }

        if (char === ',' && !inQuotes) {
            currentRow.push(currentField.trim())
            currentField = ''
            continue
        }

        if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') i += 1
            currentRow.push(currentField.trim())
            currentField = ''
            if (currentRow.some((cell) => cell.length > 0)) rows.push(currentRow)
            currentRow = []
            continue
        }

        currentField += char
    }

    currentRow.push(currentField.trim())
    if (currentRow.some((cell) => cell.length > 0)) rows.push(currentRow)
    return rows
}

