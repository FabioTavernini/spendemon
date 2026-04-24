import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './contact.module.css';

const STRIPE_PRO = 'https://buy.stripe.com/test_4gM7sMcR5bvCdjUaC85Rm06';

const infoItems = [
  // {
  //   title: 'Ready to subscribe?',
  //   description:
  //     'Subscribe directly — $29/mo for up to 5 clusters, $59/mo for unlimited. No sales call needed.',
  //   actionLabel: 'Subscribe now',
  //   actionHref: STRIPE_TEAMS,
  // },
  {
    title: 'Commercial inquiries',
    description:
      'Use the form to ask about licensing, production usage, or rollout support.',
  },
  {
    title: 'Bug reports',
    description:
      'For product issues or unexpected behavior, you can also file an issue on GitHub.',
    actionLabel: 'Open GitHub issues',
    actionHref: 'https://github.com/FabioTavernini/spendemon/issues',
  },
  {
    title: 'Docs and setup help',
    description:
      'If you are still evaluating, the docs are the fastest place to get implementation details.',
    actionLabel: 'Read the docs',
    actionHref: '/docs/intro',
    internal: true,
  },
];

export default function Contact(): ReactNode {
  return (
    <Layout
      title="Contact"
      description="Contact Spendemon for licensing, commercial usage, and setup questions.">
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className="container">
            <span className={styles.eyebrow}>Contact</span>
            <Heading as="h1" className={styles.title}>
              Get in touch about commercial usage or rollout questions.
            </Heading>
            <p className={styles.lead}>
              Share a few details below and we can follow up with the right next
              step. If you are reporting a bug or just looking for setup help,
              those paths are here too.
            </p>
          </div>
        </section>

        <section className={styles.section}>
          <div className="container">
            <div className={styles.layout}>
              <div className={styles.formCard}>
                <Heading as="h2">Contact form</Heading>
                <form
                  className={styles.form}
                  name="contact"
                  method="POST"
                  action="/contact-success"
                  data-netlify="true"
                  netlify-honeypot="bot-field">
                  <input type="hidden" name="form-name" value="contact" />
                  <p className={styles.hiddenField}>
                    <label>
                      Don&apos;t fill this out if you&apos;re human:
                      <input name="bot-field" />
                    </label>
                  </p>

                  <label className={styles.field}>
                    <span>Name</span>
                    <input type="text" name="name" required />
                  </label>

                  <label className={styles.field}>
                    <span>Email</span>
                    <input type="email" name="email" required />
                  </label>

                  <label className={styles.field}>
                    <span>Company</span>
                    <input type="text" name="company" />
                  </label>

                  <label className={styles.field}>
                    <span>Topic</span>
                    <select name="topic" defaultValue="commercial">
                      <option value="commercial">Commercial inquiry</option>
                      <option value="support">Support question</option>
                      <option value="evaluation">Evaluation</option>
                      <option value="other">Other</option>
                    </select>
                  </label>

                  <label className={styles.field}>
                    <span>Message</span>
                    <textarea
                      name="message"
                      rows={6}
                      required
                      placeholder="Tell us a bit about your use case, cluster size, or what you need help with."
                    />
                  </label>

                  <button type="submit" className="button button--primary">
                    Send message
                  </button>
                </form>
              </div>

              <aside className={styles.infoPanel}>
                {/* <Heading as="h2">Other ways to reach the right place</Heading> */}
                <div className={styles.infoList}>
                  {infoItems.map((item) => (
                    <article key={item.title} className={styles.infoCard}>
                      <Heading as="h3" className={styles.infoTitle}>
                        {item.title}
                      </Heading>
                      <p className={styles.infoText}>{item.description}</p>
                      {item.actionHref ? (
                        <Link
                          className="button button--outline button--primary"
                          {...(item.internal
                            ? {to: item.actionHref}
                            : {href: item.actionHref})}>
                          {item.actionLabel}
                        </Link>
                      ) : null}
                    </article>
                  ))}
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
