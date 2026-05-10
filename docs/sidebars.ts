import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'getting-started/installation',
        'getting-started/running-tests',
        'getting-started/profiles',
      ],
    },
    {
      type: 'category',
      label: 'Cookbooks',
      link: { type: 'doc', id: 'cookbooks/index' },
      collapsed: false,
      items: [
        'cookbooks/inline-config',
        'cookbooks/fixtures',
        'cookbooks/network',
        'cookbooks/assertions',
        'cookbooks/auth',
        'cookbooks/page-objects',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      link: { type: 'doc', id: 'reference/index' },
      collapsed: false,
      items: [
        'reference/writing-tests',
        'reference/advanced-config',
        'reference/cli',
        'reference/mcp',
        'reference/fixtures',
        'reference/network',
        'reference/auth',
        'reference/debugging',
        'reference/ci',
        'reference/reporters',
      ],
    },
  ],
};

export default sidebars;
