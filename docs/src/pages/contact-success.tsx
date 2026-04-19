import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './contact.module.css';

export default function ContactSuccess(): ReactNode {
  return (
    <Layout
      title="Message sent"
      description="Thanks for contacting Spendemon.">
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className="container">
            <span className={styles.eyebrow}>Contact</span>
            <Heading as="h1" className={styles.title}>
              Thanks, your message has been sent.
            </Heading>
            <p className={styles.lead}>
              We&apos;ll review it and follow up as soon as we can.
            </p>
            <div>
              <Link className="button button--primary" to="/pricing">
                Back to pricing
              </Link>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
