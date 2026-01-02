import React from 'react'

interface TableProps {
  children: React.ReactNode
  className?: string
}

interface TableHeaderProps {
  children: React.ReactNode
}

interface TableBodyProps {
  children: React.ReactNode
}

interface TableRowProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}

interface TableHeaderCellProps {
  children: React.ReactNode
  align?: 'left' | 'right' | 'center'
  className?: string
  onClick?: () => void
}

interface TableCellProps {
  children: React.ReactNode
  align?: 'left' | 'right' | 'center'
  className?: string
  colSpan?: number
}

interface TableEmptyProps {
  colSpan: number
  children: React.ReactNode
}

// Main Table container
function Table({ children, className = '' }: TableProps) {
  return (
    <div
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
      className={`border rounded-lg overflow-hidden ${className}`}
    >
      <table className="w-full">{children}</table>
    </div>
  )
}

// Table Header (thead)
function TableHeader({ children }: TableHeaderProps) {
  return (
    <thead
      style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
      className="border-b"
    >
      {children}
    </thead>
  )
}

// Table Body (tbody)
function TableBody({ children }: TableBodyProps) {
  return (
    <tbody style={{ borderColor: 'var(--border-color)' }} className="divide-y">
      {children}
    </tbody>
  )
}

// Table Row (tr)
function TableRow({ children, onClick, className = '' }: TableRowProps) {
  return (
    <tr
      onClick={onClick}
      className={`hover:opacity-90 transition-opacity ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </tr>
  )
}

// Table Header Cell (th)
function TableHeaderCell({ children, align = 'left', className = '', onClick }: TableHeaderCellProps) {
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'

  return (
    <th
      style={{ color: 'var(--text-muted)' }}
      className={`px-6 py-3 ${alignClass} text-xs font-medium uppercase tracking-wider ${onClick ? 'cursor-pointer hover:opacity-70' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </th>
  )
}

// Table Cell (td)
function TableCell({ children, align = 'left', className = '', colSpan }: TableCellProps) {
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'

  return (
    <td className={`px-6 py-4 ${alignClass} ${className}`} colSpan={colSpan}>
      {children}
    </td>
  )
}

// Table Empty State
function TableEmpty({ colSpan, children }: TableEmptyProps) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        style={{ color: 'var(--text-muted)' }}
        className="px-6 py-12 text-center"
      >
        {children}
      </td>
    </tr>
  )
}

// Attach sub-components
Table.Header = TableHeader
Table.Body = TableBody
Table.Row = TableRow
Table.HeaderCell = TableHeaderCell
Table.Cell = TableCell
Table.Empty = TableEmpty

export default Table
