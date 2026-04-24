import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './pricing.module.css';

const STRIPE_PRO = 'https://buy.stripe.com/test_4gM7sMcR5bvCdjUaC85Rm06';
const STRIPE_UNLIMITED = 'https://buy.stripe.com/test_3cIbJ2g3h57e4No25C5Rm07';

const freeFeatures = [
  'Cluster cost visibility',
  'Namespace and pod-level breakdowns',
  'Personal, learning, and evaluation use',
  '1 cluster',
];

const proFeatures = [
  'Commercial production use',
  'Up to 5 Prometheus endpoints',
  'Namespace and pod-level breakdowns',
  'Email support',
];

const unlimitedFeatures = [
  'Everything in Pro',
  'Unlimited Prometheus endpoints',
  'Priority support',
];

const comparisonRows = [
  ['Usage', 'Personal and evaluation', 'Commercial and production', 'Commercial and production'],
  ['Clusters', '1', 'Up to 5', 'Unlimited'],
  ['Support', 'Self-serve', 'Email', 'Priority'],
  ['Pricing', 'Free', '$29/mo', '$59/mo'],
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
              Spendemon is free for personal use and evaluation. Commercial use
              with multiple clusters starts at $29/mo — subscribe instantly, no
              sales call needed.
            </p>
            {/* <div className={styles.actions}>
              <Link className="button button--primary" href={STRIPE_PRO} target="_blank" rel="noreferrer">
                Subscribe now
              </Link>
              <Link className="button button--secondary" to="/docs/intro">
                Read the docs
              </Link>
            </div> */}
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
                <Heading as="h2">Pro</Heading>
                <p className={styles.cardText}>
                  For companies running Spendemon in production across a handful
                  of clusters.
                </p>
                <div className={styles.price}>
                  $29<span className={styles.pricePer}>/mo</span>
                </div>
                <ul className={styles.featureList}>
                  {proFeatures.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <Link className="button button--primary" href={STRIPE_PRO} target="_blank" rel="noreferrer">
                  Subscribe
                </Link>
              </article>

              <article className={styles.card}>
                <span className={styles.planLabel}>Commercial</span>
                <Heading as="h2">Unlimited</Heading>
                <p className={styles.cardText}>
                  For larger platform teams monitoring many clusters without
                  worrying about hitting a limit.
                </p>
                <div className={styles.price}>
                  $59<span className={styles.pricePer}>/mo</span>
                </div>
                <ul className={styles.featureList}>
                  {unlimitedFeatures.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <Link className="button button--primary" href={STRIPE_UNLIMITED} target="_blank" rel="noreferrer">
                  Subscribe
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
              {comparisonRows.map(([label, free, pro, unlimited]) => (
                <div key={label} className={styles.row}>
                  <div className={styles.label}>{label}</div>
                  <div>{free}</div>
                  <div>{pro}</div>
                  <div>{unlimited}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
