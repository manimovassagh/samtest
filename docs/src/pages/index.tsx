import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary')}>
      <div className="container">
        <h1 className="hero__title" style={{ fontSize: '3rem' }}>
          {siteConfig.title}
        </h1>
        <p className="hero__subtitle" style={{ maxWidth: 720, margin: '0 auto' }}>
          {siteConfig.tagline}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/intro">
            Get started →
          </Link>
          <Link
            className="button button--outline button--lg"
            style={{ color: 'white', borderColor: 'white' }}
            to="/docs/cookbooks">
            Browse cookbooks
          </Link>
          <Link
            className="button button--outline button--lg"
            style={{ color: 'white', borderColor: 'white' }}
            to="/test-report/">
            Latest test report
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
      title={siteConfig.title}
      description="A production-ready Playwright boilerplate with runnable cookbook examples.">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
