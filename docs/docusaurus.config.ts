import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'samtest — Playwright Cookbook',
  tagline: 'A production-ready Playwright boilerplate with runnable cookbook examples',
  favicon: 'img/favicon.ico',

  // GitHub Pages URL config — https://manimovassagh.github.io/samtest/
  url: 'https://manimovassagh.github.io',
  baseUrl: '/samtest/',

  organizationName: 'manimovassagh',
  projectName: 'samtest',
  trailingSlash: false,

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/manimovassagh/samtest/tree/main/docs/',
          routeBasePath: 'docs',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/social-card.png',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'samtest',
      logo: {
        alt: 'samtest logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/docs/cookbooks',
          label: 'Cookbooks',
          position: 'left',
        },
        {
          to: '/docs/reference',
          label: 'Reference',
          position: 'left',
        },
        {
          to: '/test-report/',
          label: 'Test Report',
          position: 'right',
        },
        {
          href: 'https://github.com/manimovassagh/samtest',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Getting Started', to: '/docs/intro' },
            { label: 'Cookbooks',       to: '/docs/cookbooks' },
            { label: 'Reference',       to: '/docs/reference' },
          ],
        },
        {
          title: 'Playwright',
          items: [
            { label: 'Official docs',   href: 'https://playwright.dev' },
            { label: 'Trace Viewer',    href: 'https://trace.playwright.dev' },
            { label: 'Release notes',   href: 'https://github.com/microsoft/playwright/releases' },
          ],
        },
        {
          title: 'Project',
          items: [
            { label: 'GitHub',          href: 'https://github.com/manimovassagh/samtest' },
            { label: 'Latest Test Report', to: '/test-report/' },
            { label: 'CI workflow',     href: 'https://github.com/manimovassagh/samtest/actions' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} samtest. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'typescript', 'yaml', 'diff'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
