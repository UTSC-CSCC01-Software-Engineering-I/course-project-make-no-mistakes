import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDate, toTitleCase } from './format'
import { getRidingName } from './ridings'

// Standardizes raw proposal data vs. mapped dashboard data securely
function standardizeData(data) {
  return data.map((item) => ({
    reference: item.public_reference_number || item.referenceNumber || item.id || '',
    status: item.status ? toTitleCase(item.status) : 'Unknown',
    submittedBy: item.user_id || item.submittedBy || 'Unknown',
    date: item.date || (item.created_at ? formatDate(item.created_at) : (item.createdAt ? formatDate(item.createdAt) : '')),
    type: item.submission_type ? toTitleCase(item.submission_type) : (item.submissionType || 'Counter Proposal'),
    riding: item.riding || (Array.isArray(item.related_ridings) && item.related_ridings.length ? item.related_ridings.map(getRidingName).join(', ') : 'Unassigned riding'),
    rationale: item.body || ''
  }))
}

export function exportToCSV(data, filename = 'submissions.csv') {
  if (!data || !data.length) return
  
  const standardized = standardizeData(data)
  const headers = ['Reference', 'Status', 'Submitted By', 'Date', 'Type', 'Riding', 'Rationale']
  
  const rows = standardized.map(item => [
    item.reference,
    item.status,
    item.submittedBy,
    item.date,
    item.type,
    item.riding,
    item.rationale
  ])

  // Escape quotes and wrap every cell in quotes for clean formatting
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function exportToPDF(data, filename = 'submissions.pdf') {
  if (!data || !data.length) return
  
  const standardized = standardizeData(data)
  // Generating in Landscape to account for large text blocks (Rationale)
  const doc = new jsPDF('l', 'pt', 'a4') 
  
  const tableColumn = ['Reference', 'Status', 'Submitted By', 'Date', 'Type', 'Riding', 'Rationale']
  const tableRows = standardized.map(item => [
    item.reference,
    item.status,
    item.submittedBy,
    item.date,
    item.type,
    item.riding,
    item.rationale
  ])

  doc.text('Submissions Export', 40, 40)
  
  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 50,
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [255, 42, 95] }, // Matches Dashboard branding
    columnStyles: {
      6: { cellWidth: 320 } // Gives the rationale column extra width to wrap naturally
    }
  })

  doc.save(filename)
}