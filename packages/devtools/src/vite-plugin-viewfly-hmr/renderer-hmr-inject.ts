/**
 * 替换 `__viewflyHmrRegisterSlotMarker()` 的片段（纯 JS，便于注入到 core 源码或已打包的 `dist/index.esm.js`）。
 * 与 `@viewfly/core` 中 `createRenderer` 闭包内的 `nativeRenderer`、`rerunComponentRender`、`ComponentAtomType` 同域。
 */
export const RENDERER_HMR_REGISTER_REPLACEMENT = `;(globalThis).__VF_HMR__?.captureRerender?.((c) => {
    const atom = c.viewMetadata?.atom
    if (!atom || atom.type !== ComponentAtomType) {
      return
    }
    rerunComponentRender(nativeRenderer, c, atom, {
      anchorNode: c.viewMetadata.anchorNode,
      isParent: c.viewMetadata.isParent,
      contextContainer: c.viewMetadata.contextContainer,
      computedContainer: c.viewMetadata.computedContainer
    })
  })`
