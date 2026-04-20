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
            Read the docs
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
              Compare clusters, inspect namespace chargeback, and drill into
              pod-level cost estimates from the cost reporting view.
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
