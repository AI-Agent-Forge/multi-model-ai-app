import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownRendererProps {
    content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
    return (
        <ReactMarkdown
            components={{
                code({ node, className, children, ref, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const isInline = !match;

                    if (isInline) {
                        return (
                            <code className="bg-zinc-800 px-1 py-0.5 rounded text-sm text-red-400" {...props}>
                                {children}
                            </code>
                        );
                    }

                    return (
                        <div className="rounded-lg overflow-hidden my-2 border border-zinc-700">
                            <div className="bg-zinc-800 px-3 py-1 text-xs text-zinc-400 border-b border-zinc-700 flex justify-between items-center">
                                <span>{match[1]}</span>
                                <span className="text-[10px] uppercase tracking-wider">Code</span>
                            </div>
                            <SyntaxHighlighter
                                style={vscDarkPlus as any}
                                language={match[1]}
                                PreTag="div"
                                {...props}
                            >
                                {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                        </div>
                    );
                },
                p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed text-sm md:text-base">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
                h1: ({ children }) => <h1 className="text-xl font-bold mb-2 mt-4">{children}</h1>,
                h2: ({ children }) => <h2 className="text-lg font-bold mb-2 mt-3">{children}</h2>,
            }}
        >
            {content}
        </ReactMarkdown>
    );
};
