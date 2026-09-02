# Agent Note: Workspace 备选分组的行归属

Status: implemented

[English](2026-08-24-workspace-alternate-group-row-ownership.md) | 中文

## 问题

侧边栏的备选分组需要加入自己的分组身份、元数据和操作，同时保留 Workspace 浏览器的 Session 状态、折叠、溢出和拖拽行为。导出 React 行供另一个客户端插件直接导入，会把两个独立加载的运行时模块耦合起来；由占用方重新实现这些行，则会产生第二套视觉与行为权威，并逐渐偏离官方 Workspace 树。

## 决定

`@deepseek-ai/dsh-client-ui-workspace` 继续唯一持有 `ProjectGroupItem`、`ProjectRowItem`、`SessionNodeItem`、`SessionOverflowButton` 和 `deriveFlat` Session 投影。`sidebar.workspaces.presetGroups` slot 的 owner 传入带类型的 `PresetRowsOwner` 席位，其中包含官方 Session 投影器、Workspace 标签辅助函数，以及闭包了 Workspace locale 的渲染回调。占用方只提供分组事实和可选的前导标识、元数据、操作装饰，再调用 owner 回调；它既不导入运行时行值，也不复制行 CSS 与状态规则。

完整项目区段的包装器负责跨组头和所有可见 Session 子项的拖拽命中与插入标记。分组展开与五行溢出状态相互独立：关闭分组时不渲染任何 Session 预览，并清除溢出展开。Session 行始终接收官方投影，因此待处理交互与运行活动沿用官方带动画的 `StateDot` 优先级。分组特有的 Session 上下文使用行的元数据席位，而不是拼接进标题文本。

本决定扩展[会话列表浏览与手动排序](../feature/2026-07-25-session-list-browsing-and-manual-order.zh.md)确立的 Workspace 区域归属，遵循 [Slot 声明注入](2026-08-05-slot-declaration-injection.zh.md)的生命周期，并采用与[客户端工具呈现归属](2026-08-08-client-tool-presentation-ownership.zh.md)和[客户端渲染与附件呈现的动态归属](2026-08-17-dynamic-client-render-and-attachment-ownership.zh.md)相同的跨插件呈现边界。

## 验证

Workspace 行测试固定共享装饰席位、官方运行态圆点、完整区段拖拽目标与标记，以及共享溢出控件。Workspace 浏览器测试固定原生分组路径使用同一项目包装器。备选分组的纯函数测试消费已完成投影的 Session 节点，证明它不再导入或重建 `deriveFlat`。

## 备选方案

**导出行组件并由占用插件直接导入。** 否决：即使类型正确，导入仍会执行另一个插件的运行时入口及其 store／模块加载器依赖，绕过 slot 生命周期归属。

**在占用方保留外观相似的行。** 否决：折叠、活动动画、操作菜单、间距和拖拽插入都会拥有独立实现，并继续漂移。

**把所有行移入通用 primitive 包。** 否决：这些行编码了 Workspace 领域的投影、locale、操作和拖拽语义；将其泛化会扩散这些知识，而不是建立唯一 owner。

## 结果

备选分组插件可以扩展官方树，而不持有其行为。Workspace 行的动画、间距、溢出或拖拽语义变化会通过唯一实现到达所有分组。slot owner 契约更宽并包含渲染回调，但不会导出跨插件 React 组件运行时值。占用方仍负责自己的分组模型和装饰；Workspace owner 缺席时，占用方无法渲染。
