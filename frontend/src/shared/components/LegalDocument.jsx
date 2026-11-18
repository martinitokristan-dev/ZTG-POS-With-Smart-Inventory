import React from 'react';
import { LEGAL_DOCUMENTS, TERMS_VERSION, LEGAL_LAST_UPDATED } from '../../config/legal';
import './LegalDocument.css';

/**
 * The text of one legal document (Privacy Policy or Terms and Conditions): numbered
 * section headings followed by paragraphs, lists, a quotation or a small table.
 *
 * @param {{ doc: object }} props One entry of LEGAL_DOCUMENTS.
 */
export function LegalArticle({ doc }) {
    return (
        <article className="legal-article">
            {doc.sections.map((section, index) => (
                <section key={section.id} className="legal-article-section">
                    <h3>{index + 1}. {section.title}</h3>
                    {section.blocks.map((block, i) => <LegalBlock key={i} block={block} />)}
                </section>
            ))}
        </article>
    );
}

/**
 * Read-only reader used in Settings > Privacy and Terms: a tab for each document and the
 * selected document in a scrolling area. The parent sets the height.
 *
 * @param {{ initialDoc?: 'privacy'|'terms' }} props
 */
export default function LegalDocument({ initialDoc = 'privacy' }) {
    const [docId, setDocId] = React.useState(initialDoc);
    const bodyRef = React.useRef(null);
    const doc = LEGAL_DOCUMENTS.find(d => d.id === docId) || LEGAL_DOCUMENTS[0];

    React.useEffect(() => {
        if (bodyRef.current) bodyRef.current.scrollTop = 0;
    }, [doc]);

    return (
        <div className="legal-reader">
            <div className="legal-reader-tabs" role="tablist" aria-label="Legal documents">
                {LEGAL_DOCUMENTS.map(d => (
                    <button
                        key={d.id}
                        type="button"
                        role="tab"
                        id={`legal-tab-${d.id}`}
                        aria-selected={d.id === doc.id}
                        aria-controls="legal-reader-panel"
                        className={`tab-btn ${d.id === doc.id ? 'active' : ''}`}
                        onClick={() => setDocId(d.id)}
                    >
                        {d.title}
                    </button>
                ))}
            </div>

            <div
                id="legal-reader-panel"
                role="tabpanel"
                aria-labelledby={`legal-tab-${doc.id}`}
                className="legal-reader-body"
                ref={bodyRef}
                tabIndex={0}
            >
                <h2 className="legal-heading">{doc.title}</h2>
                <p className="legal-updated">Last updated {LEGAL_LAST_UPDATED} · Version {TERMS_VERSION}</p>
                <LegalArticle doc={doc} />
            </div>
        </div>
    );
}

/**
 * One content block of a section.
 *
 * @param {{ block: object }} props
 */
function LegalBlock({ block }) {
    if (block.type === 'list') {
        return (
            <ul>
                {block.items.map((item, i) => (
                    <li key={i}>
                        {typeof item === 'string' ? item : <><strong>{item.label}:</strong> {item.text}</>}
                    </li>
                ))}
            </ul>
        );
    }

    if (block.type === 'quote') {
        return (
            <blockquote>
                <p>{block.text}</p>
                <cite>{block.cite}</cite>
            </blockquote>
        );
    }

    if (block.type === 'table') {
        return (
            <div className="legal-table-wrap">
                <table>
                    <thead>
                        <tr>{block.head.map(h => <th key={h} scope="col">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                        {block.rows.map(row => (
                            <tr key={row[0]}>{row.map((cell, i) => <td key={i}>{cell}</td>)}</tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    return <p>{block.text}</p>;
}
