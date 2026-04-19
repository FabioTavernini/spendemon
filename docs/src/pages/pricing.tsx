import type {ReactNode} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Link from '@docusaurus/Link';

export default function Pricing(): ReactNode {
  return (
    <Layout
      title="Pricing"
      description="Spendemon pricing tiers for personal and commercial Kubernetes cost monitoring usage.">
      <main className="container margin-vert--lg">
        <Heading as="h1">Pricing</Heading>
        <p className="margin-vert--md">
          Spendemon is free for personal use. For commercial usage, please contact us for pricing and enterprise licensing.
        </p>

        <div className="row">
          <div className="col col--6">
            <div className="card padding--lg">
              <h2>Free</h2>
              <p className="margin-vert--sm">
                Ideal for personal projects, learning Kubernetes cost reporting, or single-user monitoring.
              </p>
              <ul>
                <li>Cluster cost visibility</li>
                <li>Namespace & pod cost breakdown</li>
                <li>Single-user, non-commercial use</li>
              </ul>
              <div className="margin-vert--md">
                <strong>Free</strong>
              </div>
            </div>
          </div>
          <div className="col col--6">
            <div className="card padding--lg">
              <h2>Commercial</h2>
              <p className="margin-vert--sm">
                For companies and production environments that require commercial licensing and support.
              </p>
              <ul>
                <li>Unlimited users and clusters</li>
                <li>Commercial support and deployment guidance</li>
                <li>Custom pricing and licensing terms</li>
              </ul>
              <div className="margin-vert--md">
                <strong>Contact us for pricing</strong>
              </div>
              <Link className="button button--primary" to="/docs/intro">
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}
