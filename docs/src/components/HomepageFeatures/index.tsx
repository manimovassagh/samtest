import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

type Feature = {
  title: string;
  description: ReactNode;
  href: string;
};

const Features: Feature[] = [
  {
    title: 'Inline test config',
    href: '/docs/cookbooks/inline-config',
    description: 'Every option you can pass directly to test() and test.describe() — tags, annotations, mode, retries, timeouts.',
  },
  {
    title: 'Fixtures done right',
    href: '/docs/cookbooks/fixtures',
    description: 'Custom fixtures, worker-scoped resources, auto-use, composition. The dependency-injection system that replaces beforeEach.',
  },
  {
    title: 'Network mocking',
    href: '/docs/cookbooks/network',
    description: 'Route interception, response mocking, request inspection, HAR replay. Test error states without a real backend.',
  },
  {
    title: 'Web-first assertions',
    href: '/docs/cookbooks/assertions',
    description: 'Auto-retrying assertions, soft assertions, expect.poll, custom matchers, ARIA snapshots.',
  },
  {
    title: 'Authentication patterns',
    href: '/docs/cookbooks/auth',
    description: 'storageState, worker-scoped login, multi-user contexts. Skip the UI login on every test — 3-5× faster suites.',
  },
  {
    title: 'Page Object Model',
    href: '/docs/cookbooks/page-objects',
    description: 'Classic POM, component objects, fixture-powered page objects. Scale your tests as the app grows.',
  },
];

function FeatureCard({ title, description, href }: Feature) {
  return (
    <div className={clsx('col col--4')} style={{ marginBottom: '2rem' }}>
      <Link to={href} style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}>
        <div className="cb-card">
          <h3>{title}</h3>
          <p style={{ flex: 1 }}>{description}</p>
          <span style={{ color: 'var(--ifm-color-primary)', fontWeight: 600 }}>Read cookbook →</span>
        </div>
      </Link>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2>Cookbook patterns</h2>
          <p style={{ fontSize: '1.1rem', opacity: 0.8 }}>
            Six runnable <code>.cookbook.ts</code> files covering the patterns every real Playwright suite needs.
          </p>
        </div>
        <div className="row">
          {Features.map((props, idx) => (
            <FeatureCard key={idx} {...props} />
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: '4rem', padding: '3rem 1rem', background: 'var(--ifm-background-surface-color)', borderRadius: 12 }}>
          <h2>Deep-dive reference</h2>
          <p style={{ fontSize: '1.05rem', maxWidth: 720, margin: '0 auto 1.5rem' }}>
            Ten reference docs covering writing tests, advanced config, CLI flags,
            MCP integration, fixtures, network, auth, debugging, CI, and reporters.
          </p>
          <Link className="button button--primary button--lg" to="/docs/reference">
            Open the reference →
          </Link>
        </div>
      </div>
    </section>
  );
}
