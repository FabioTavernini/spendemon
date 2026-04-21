import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import CodeBlock from '@theme/CodeBlock';

import styles from './styles.module.css';

type RepoFileEntry = {
  content: string;
  description?: string;
  language?: string;
  path: string;
  sourceUrl: string;
  title?: string;
};

type CustomFields = {
  repoFiles?: Record<string, RepoFileEntry>;
};

type RepoFileCodeBlockProps = {
  description?: string;
  file: string;
  language?: string;
  title?: string;
};

export default function RepoFileCodeBlock({
  description,
  file,
  language,
  title,
}: RepoFileCodeBlockProps) {
  const {siteConfig} = useDocusaurusContext();
  const customFields = siteConfig.customFields as CustomFields;
  const repoFile = customFields.repoFiles?.[file];

  if (!repoFile) {
    return (
      <div className={styles.missing}>
        <strong>Missing repo file:</strong> <code>{file}</code>
      </div>
    );
  }

  const lines = repoFile.content.trimEnd().split('\n').length;

  return (
    <section className={styles.shell}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Synced from the repo</p>
          <h3 className={styles.title}>{title ?? repoFile.title ?? repoFile.path}</h3>
          <p className={styles.description}>
            {description ??
              repoFile.description ??
              `Rendered from ${repoFile.path} during the docs build.`}
          </p>
        </div>
        <Link className={styles.link} href={repoFile.sourceUrl}>
          Open on GitHub
        </Link>
      </div>
      <div className={styles.meta}>
        <span>{repoFile.path}</span>
        <span>{lines} lines</span>
      </div>
      <CodeBlock
        language={language ?? repoFile.language ?? 'text'}
        title={repoFile.path}>
        {repoFile.content.trimEnd()}
      </CodeBlock>
    </section>
  );
}
