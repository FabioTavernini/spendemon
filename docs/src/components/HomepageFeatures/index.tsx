import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import MountainSvg from '@site/static/img/undraw_docusaurus_mountain.svg';
import TreeSvg from '@site/static/img/undraw_docusaurus_tree.svg';
import ReactSvg from '@site/static/img/undraw_docusaurus_react.svg';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Multi-cluster inventory',
    Svg: MountainSvg,
    description: (
      <>
        Connect multiple Prometheus endpoints and browse clusters, namespaces,
        and pods from one focused dashboard.
      </>
    ),
  },
  {
    title: 'Request-based cost estimates',
    Svg: TreeSvg,
    description: (
      <>
        Turn CPU, memory, and ephemeral storage requests into namespace and
        pod-level cost rollups, with fallback estimates when requests are
        missing.
      </>
    ),
  },
  {
    title: 'Config, auth, and chargeback controls',
    Svg: ReactSvg,
    description: (
      <>
        Manage pricing, shared namespaces, and optional local credentials or
        OIDC access control from the same deployment.
      </>
    ),
  },
];

function Feature({title, Svg, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
