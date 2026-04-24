import fs from 'node:fs';
import path from 'node:path';
import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const repoRoot = path.resolve(__dirname, '..');
const githubBlobBase =
  'https://github.com/FabioTavernini/spendemon/blob/main';

function readRepoFile(relativePath: string) {
  return {
    path: relativePath,
    sourceUrl: `${githubBlobBase}/${relativePath}`,
    content: fs
      .readFileSync(path.join(repoRoot, relativePath), 'utf8')
      .replace(/\r\n/g, '\n'),
  };
}

const config: Config = {
  title: 'Spendemon',
  tagline: 'Prometheus-powered Kubernetes cost reporting',
  favicon: 'img/spendemon.svg',

  onBrokenLinks: 'ignore', // or 'warn' to just warn

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://spendemon.netlify.app', // Url to your site with no trailing slash
  baseUrl: '/', // Base directory of your site relative to your repo

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'fabiotavernini', // Usually your GitHub org/user name.
  projectName: 'Spendemon', // Usually your repo name.

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  customFields: {
    repoFiles: {
      helmValues: {
        ...readRepoFile('charts/spendemon/values.yaml'),
        language: 'yaml',
        title: 'Current chart values.yaml',
        description:
          'Rendered from the Helm chart in this repository at docs build time.',
      },
      settingsExample: {
        ...readRepoFile('settings-example.yaml'),
        language: 'yaml',
        title: 'Starter settings-example.yaml',
        description:
          'Rendered from the root starter config in this repository at docs build time.',
      },
    },
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/FabioTavernini/spendemon/tree/main/docs',
        },
        // blog: {
        //   showReadingTime: true,
        //   feedOptions: {
        //     type: ['rss', 'atom'],
        //     xslt: true,
        //   },
        //   // Please change this to your repo.
        //   // Remove this to remove the "edit this page" links.
        //   editUrl:
        //     'https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/',
        //   // Useful options to enforce blogging best practices
        //   onInlineTags: 'warn',
        //   onInlineAuthors: 'warn',
        //   onUntruncatedBlogPosts: 'warn',
        // },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Spendemon',
      logo: {
        alt: 'Spendemon Logo',
        src: 'img/spendemon.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'spendemonSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/pricing',
          label: 'Pricing',
          position: 'left',
        },
        {
          to: '/contact',
          label: 'Contact',
          position: 'left',
        },
        // {to: '/blog', label: 'Blog', position: 'left'},
        {
          href: 'https://github.com/FabioTavernini/spendemon',
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
            {
              label: 'Docs',
              to: '/docs/intro',
            },
          ],
        },
        // {
        //   title: 'Community',
        //   items: [
        //     {
        //       label: 'Stack Overflow',
        //       href: 'https://stackoverflow.com/questions/tagged/docusaurus',
        //     },
        //     {
        //       label: 'Discord',
        //       href: 'https://discordapp.com/invite/docusaurus',
        //     },
        //     {
        //       label: 'X',
        //       href: 'https://x.com/docusaurus',
        //     },
        //   ],
        // },
        {
          title: 'More',
          items: [
            {
              label: 'Contact',
              to: '/contact',
            },
            // {
            //   label: 'Blog',
            //   to: '/blog',
            // },
            {
              label: 'GitHub',
              href: 'https://github.com/FabioTavernini/spendemon',
            },
          ],
        },
        {
          title: 'Legal',
          items: [
            {
              label: 'Impressum',
              to: '/impressum',
            },
            {
              label: 'Privacy Policy',
              to: '/privacy-policy',
            },
            {
              label: 'Terms of Service',
              to: '/terms',
            },
            {
              label: 'Refund Policy',
              to: '/refund-policy',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Spendemon, Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
