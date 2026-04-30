---
layout: home

hero:
  name: Viewfly
  text: 简单直观的前端框架
  tagline: 组件式 UI、响应式数据、TypeScript 与 JSX 友好，按需选用路由与构建工具。
  image:
    src: /logo.svg
    alt: Viewfly
  actions:
    - theme: brand
      text: 快速上手
      link: /guide/quick-start
    - theme: alt
      text: 阅读指南
      link: /guide/introduction

features:
  - icon: 🧩
    title: 函数组件
    details: 使用 JSX / TSX 编写视图，心智模型清晰，无类组件与模板两套语法。
  - icon: ⚡
    title: 响应式核心
    details: reactive、signal、computed、watch 等能力，数据变化驱动视图更新。
  - icon: 🔌
    title: 可扩展
    details: createApp、依赖注入与路由（如 RouterModule）可按需组合，渐进式接入。

---

## 使用

推荐使用脚手架一键创建 `Vite` + `TypeScript` 项目；也可手动安装 `@viewfly/core` 与 `@viewfly/platform-browser`，配置 `jsxImportSource` 后即可开始。

详见 [安装与配置](./guide/installation.md) 与 [快速上手](./guide/quick-start.md)。
