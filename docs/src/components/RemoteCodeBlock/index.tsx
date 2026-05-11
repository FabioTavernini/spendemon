import { useEffect, useState } from 'react';
import Link from '@docusaurus/Link';
import CodeBlock from '@theme/CodeBlock';

import styles from '../RepoFileCodeBlock/styles.module.css';

type RemoteCodeBlockProps = Readonly<{
  url: string;
  language?: string;
  title?: string;
  description?: string;
  sourceUrl?: string;
}>;

export default function RemoteCodeBlock({
  url,
  language = 'yaml',
  title,
  description,
  sourceUrl,
}: RemoteCodeBlockProps) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.text();
      })
      .then(setContent)
      .catch(e => setError(e.message));
  }, [url]);

  const href = sourceUrl ?? url;
  const lines = content ? content.trimEnd().split('\n').length : null;

  return (
    <section className={styles.shell}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Live from the repo</p>
          <h3 className={styles.title}>{title ?? url}</h3>
          {description && <p className={styles.description}>{description}</p>}
        </div>
        <Link className={styles.link} href={href}>
          Open on GitHub
        </Link>
      </div>
      {lines !== null && (
        <div className={styles.meta}>
          <span>{url.split('/').pop()}</span>
          <span>{lines} lines</span>
        </div>
      )}
      {error && (
        <div className={styles.missing}>
          <strong>Failed to load:</strong> {error}
        </div>
      )}
      {!error && content === null && (
        <div className={styles.meta}><span>Loading…</span></div>
      )}
      {!error && content !== null && (
        <CodeBlock language={language} title={title ?? url.split('/').pop()}>
          {content.trimEnd()}
        </CodeBlock>
      )}
    </section>
  );
}
