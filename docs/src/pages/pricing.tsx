import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './pricing.module.css';

const freeFeatures = [
  'Cluster cost visibility',
  'Namespace and pod-level breakdowns',
  'Personal, learning, and evaluation use',
];

const commercialFeatures = [
  'Commercial licensing for teams and production usage',
  'Help with rollout, setup, and support expectations',
  'Flexible pricing based on your usage and needs',
];

const comparisonRows = [
  ['Usage', 'Personal and evaluation', 'Commercial and production'],
  ['Scale', 'Smaller setups and pilots', 'Teams and multi-cluster usage'],
  ['Support', 'Self-serve', 'Direct contact and guidance'],
  ['Pricing', 'Free', 'Custom quote'],
];

export default function Pricing(): ReactNode {
  return (
    <Layout
      title="Pricing"
      description="Spendemon pricing for personal use and commercial Kubernetes cost reporting deployments.">
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className="container">
            <span className={styles.eyebrow}>Pricing</span>
            <Heading as="h1" className={styles.title}>
              Simple pricing for getting started and growing into production use.
            </Heading>
            <p className={styles.lead}>
              Spendemon is free for personal use and evaluation. If you want to
              use it commercially, get in touch and we can work out the right
              setup and pricing for your team.
            </p>
            <div className={styles.actions}>
              <Link className="button button--primary" to="/contact">
                Contact us
              </Link>
              <Link className="button button--secondary" to="/docs/intro">
                Read the docs
              </Link>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className="container">
            <div className={styles.cardGrid}>
              <article className={styles.card}>
                <span className={styles.planLabel}>Free</span>
                <Heading as="h2">Personal use</Heading>
                <p className={styles.cardText}>
                  Ideal for learning, testing, and understanding your cluster
                  costs before rolling Spendemon out more broadly.
                </p>
                <div className={styles.price}>Free</div>
                <ul className={styles.featureList}>
                  {freeFeatures.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <Link className="button button--outline button--primary" to="/docs/intro">
                  Get started
                </Link>
              </article>

              <article className={styles.card}>
                <span className={styles.planLabel}>Commercial</span>
                <Heading as="h2">Team use</Heading>
                <p className={styles.cardText}>
                  For companies running Spendemon as part of their ongoing cost
                  reporting and platform workflow.
                </p>
                <div className={styles.price}>Custom</div>
                <ul className={styles.featureList}>
                  {commercialFeatures.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <Link className="button button--primary" to="/contact">
                  Request pricing
                </Link>
              </article>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className="container">
            <Heading as="h2" className={styles.sectionTitle}>
              Compare options
            </Heading>
            <div className={styles.table}>
              {comparisonRows.map(([label, free, commercial]) => (
                <div key={label} className={styles.row}>
                  <div className={styles.label}>{label}</div>
                  <div>{free}</div>
                  <div>{commercial}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
