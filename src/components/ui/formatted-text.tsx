'use client'

interface FormattedTextProps {
  text: string
  className?: string
}

export function FormattedText({ text, className = '' }: FormattedTextProps) {
  const formatText = (rawText: string) => {
    // Split by lines for processing
    const lines = rawText.split('\n')
    const formatted: JSX.Element[] = []

    lines.forEach((line, index) => {
      // Headers (##, ###)
      if (line.startsWith('### ')) {
        formatted.push(
          <h3 key={index} className="text-lg font-bold text-gray-800 mt-4 mb-2">
            {line.replace('### ', '')}
          </h3>
        )
      } else if (line.startsWith('## ')) {
        formatted.push(
          <h2 key={index} className="text-xl font-bold text-gray-800 mt-5 mb-3">
            {line.replace('## ', '')}
          </h2>
        )
      } else if (line.startsWith('# ')) {
        formatted.push(
          <h1 key={index} className="text-2xl font-bold text-gray-800 mt-6 mb-4">
            {line.replace('# ', '')}
          </h1>
        )
      }
      // Bullet points
      else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const content = line.trim().replace(/^[-*]\s/, '')
        formatted.push(
          <li key={index} className="ml-6 mb-1">
            {formatInlineMarkdown(content)}
          </li>
        )
      }
      // Numbered lists
      else if (/^\d+\.\s/.test(line.trim())) {
        const content = line.trim().replace(/^\d+\.\s/, '')
        formatted.push(
          <li key={index} className="ml-6 mb-1 list-decimal">
            {formatInlineMarkdown(content)}
          </li>
        )
      }
      // Empty lines
      else if (line.trim() === '') {
        formatted.push(<div key={index} className="h-2" />)
      }
      // Regular paragraphs
      else {
        formatted.push(
          <p key={index} className="mb-3 leading-relaxed">
            {formatInlineMarkdown(line)}
          </p>
        )
      }
    })

    return formatted
  }

  const formatInlineMarkdown = (text: string) => {
    // Split text by markdown patterns while preserving them
    const parts: (string | JSX.Element)[] = []
    let currentText = text
    let key = 0

    // Process bold (**text** or __text__)
    const boldRegex = /(\*\*|__)(.*?)\1/g
    let lastIndex = 0
    let match

    while ((match = boldRegex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index))
      }
      // Add bold text
      parts.push(
        <strong key={`bold-${key++}`} className="font-semibold text-gray-900">
          {match[2]}
        </strong>
      )
      lastIndex = match.index + match[0].length
    }
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex))
    }

    // If no bold was found, process italic
    if (parts.length === 0) {
      const italicRegex = /(\*|_)(.*?)\1/g
      lastIndex = 0
      
      while ((match = italicRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          parts.push(text.substring(lastIndex, match.index))
        }
        parts.push(
          <em key={`italic-${key++}`} className="italic">
            {match[2]}
          </em>
        )
        lastIndex = match.index + match[0].length
      }
      if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex))
      }
    }

    return parts.length > 0 ? parts : text
  }

  return (
    <div className={`formatted-text ${className}`}>
      {formatText(text)}
    </div>
  )
}
