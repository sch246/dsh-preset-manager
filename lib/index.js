//#region src/index.ts
/**
* dsh-preset-manager 节点半身：装配锚点，无宿主逻辑。
*
* 本包的功能全部在浏览器半身（src/client/）。这条身份行让
* `dsh plugin add` 把包登记为 profile bundle 层，并让 client-modules
* 扫描到本条目、把 lib/client.js 加进浏览器插件清单。
* @module dsh-preset-manager
*/
/** Cordis 插件名，loader 诊断用。 */
const name = "dsh-preset-manager";
/**
* 空 apply：节点侧无行为。保留此入口是装配契约的一部分，
* 未来宿主侧能力（如 preset.yml 元数据写入路由）挂在这里。
* @param _ctx - Cordis 上下文（未使用）。
*/
function apply(_ctx) {}
//#endregion
export { apply, name };

//# sourceMappingURL=index.js.map