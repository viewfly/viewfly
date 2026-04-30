import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: 'Viewfly',
  description: 'Viewfly 一个简单、易上手的前端框架。性能出色，使用灵活，拥有极其精简并符合直觉的 API，可以帮助你更高效的构建富交互的用户界面。',
  head: [
    ['title', {}, 'Viewfly—简单易用高性能的 JavScript 库'],
    ['meta', { name: 'keywords', content: 'Viewfly, library, JavaScript Framework, TypeScript Framework, 前端框架' }],
    ['meta', { name: 'description', content: 'Viewfly 一个简单、易上手的前端框架。性能出色，使用灵活，拥有极其精简并符合直觉的 API，可以帮助你更高效的构建富交互的用户界面。' }],
    ['script', {}, `var _hmt = _hmt || [];
(function() {
  var hm = document.createElement("script");
  hm.src = "https://hm.baidu.com/hm.js?b62d8fff9908e4e2adbd45c530403b34";
  var s = document.getElementsByTagName("script")[0];
  s.parentNode.insertBefore(hm, s);
})();`],
    ['link', { rel: 'icon', href: '/logo.svg', type: 'image/svg+xml' }],
    ['meta', { name: 'theme-color', content: '#79b30f' }],
  ],
  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: '指南', link: '/guide/introduction', activeMatch: '/guide/' },
      { text: '生态包', link: '/guide/packages' },
      {
        text: '相关链接',
        items: [
          { text: 'npm @viewfly/core', link: 'https://www.npmjs.com/package/@viewfly/core' },
          { text: 'GitHub', link: 'https://github.com/viewfly/viewfly' },
        ],
      },
    ],
    sidebar: {
      '/guide/': [
        {
          text: '入门',
          items: [
            { text: '简介', link: '/guide/introduction' },
            { text: '安装与配置', link: '/guide/installation' },
            { text: '快速上手', link: '/guide/quick-start' },
          ],
        },
        {
          text: '基础',
          items: [
            { text: '创建应用', link: '/guide/essentials-application' },
            { text: 'JSX 与组件', link: '/guide/essentials-components' },
            { text: '响应式', link: '/guide/essentials-reactivity' },
            { text: '生命周期', link: '/guide/lifecycle' },
            { text: '依赖注入', link: '/guide/dependency-injection' },
            { text: '路由', link: '/guide/router' },
            { text: '作用域样式', link: '/guide/styling/scoped-css' },
          ],
        },
        {
          text: '进阶',
          items: [
            { text: '应用深入', link: '/guide/application-in-depth' },
            { text: '深入依赖注入', link: '/guide/dependency-injection-in-depth' },
          ],
        },
        {
          text: '规模化',
          items: [
            { text: '脚手架与工具链', link: '/guide/cli' },
            { text: '了解 @viewfly/*', link: '/guide/packages' },
          ],
        },
        {
          text: '附录',
          items: [
            { text: '常见问题', link: '/guide/faq' },
            { text: '术语表', link: '/guide/glossary' },
          ],
        },
      ],
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/viewfly/viewfly' }],
    footer: {
      message: 'MIT License',
      copyright: 'Copyright © Viewfly',
    },
    search: {
      provider: 'local',
    },
    outline: {
      label: '本页目录',
      level: [2, 3],
    },
    docFooter: {
      prev: '上一页',
      next: '下一页',
    },
    lastUpdated: {
      text: '更新于',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'medium',
      },
    },
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',
  },
})
