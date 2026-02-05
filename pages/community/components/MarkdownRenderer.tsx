import React from 'react';

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
    if (!content) return null;

    // Regex to capture the entire image markdown: ![alt](url)
    // Using a capture group so split() includes the separators (the images) in the result array
    const imageSplitRegex = /(!\[.*?\]\(.*?\))/g;

    const parts = content.split(imageSplitRegex);

    // Helper to render text with newlines
    const renderText = (text: string, keyPrefix: string) => {
        return text.split('\n').map((line, i) => (
            <React.Fragment key={`${keyPrefix}-${i}`}>
                {line}
                {i < text.split('\n').length - 1 && <br />}
            </React.Fragment>
        ));
    };

    return (
        <div className={`markdown-content ${className}`}>
            {parts.map((part, index) => {
                // Check if this part matches strict image syntax
                const imageMatch = part.match(/^!\[(.*?)\]\((.*?)\)$/);

                if (imageMatch) {
                    return (
                        <img
                            key={index}
                            src={imageMatch[2]}
                            alt={imageMatch[1]}
                            className="max-w-full h-auto rounded-lg my-4 border border-gray-200 shadow-sm block"
                            loading="lazy"
                        />
                    );
                } else if (part) {
                    // Regular text
                    return (
                        <span key={index} className="whitespace-pre-wrap">
                            {renderText(part, `text-${index}`)}
                        </span>
                    );
                }
                return null;
            })}
        </div>
    );
};

export default MarkdownRenderer;
