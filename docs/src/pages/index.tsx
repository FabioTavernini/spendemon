import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/intro">
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title="Spendemon — Kubernetes cost reporting"
      description="Spendemon documentation for Kubernetes cost monitoring, namespace chargeback, and pod-level cost reporting.">
      <HomepageHeader />
      <main>
        <section className={styles.screenshotSection}>
          <div className="container">
            <Heading as="h2">Spendemon in action</Heading>
            <p className={styles.screenshotText}>
              Track cluster spend, compare namespaces, and drill into pod-level costs with the Spendemon cost reporting UI.
            </p>
            <div className={styles.screenshotWrapper}>
              <img
                src="/img/CostReportingSC.png"
                alt="Spendemon cost reporting UI screenshot"
                className={styles.screenshot}
              />
            </div>
          </div>
        </section>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
