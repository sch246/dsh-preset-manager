# User original intent

Record ID: `SRC-2026-08-26-PRESET-MANAGER-USER-ORIGINAL`

Status: verbatim user authority supplied after the repository-local source audit. It closes the missing-source question without rewriting the earlier fact that the repository itself contained no verbatim record.

## Verbatim source

> 我有个想法，写一个deepseek-harness插件，叫预设管理器
> 因为我现在的预设太多了，而且在会话开始时选择很多很杂，还不能随便删，因为删了会影响旧会话，还不能设置默认
> 我希望可以在侧边栏按预设过滤会话，这样能方便去查看有哪些预设实现方式
> 我期望是，目前不是有一个搜索，视图选项，添加工作区嘛，加一个分组方式是“按预设”，形式类似于“按工作区”，应该尽可能复用样式
>
> 这个也能用来管理预设显示和顺序(影响新会话开始时的顺序)，拖动可以改变预设显示的顺序，点击预设的加号就是以对应预设开始，点击`...`可以重命名，隐藏或者删除预设，重命名可以重命名其名字和说明，隐藏意味着新会话开始时不会出现在列表中，删除预设将附带删除下面所有会话，且需要二次确认
>
> 如果没有删除就算了，不需要删除功能了
>
> 哦对，还有一件事，它应该要可以设置默认预设！这也是很重要的功能，可以在预设上用星标点击切换
>
> 预设在列表显示的时候，如果隐藏就变灰并且移动到显示的末尾，这没问题吧
>
> 于是我想要的样式大概就和按工作区一样，只是预设栏多了星标，会话项多了工作区名
>
> 我建议点击时允许选择工作区，然后跳转到默认创建会话的界面并选好工作区和预设，这样兼容性也更好
>
> （后注：我发现实际实现时会话项的`...`没了不能重命名，分叉，归档了）

## Decision extraction

The following continuing authority is explicit in the source:

- create a DeepSeek Harness plugin named preset manager because a large preset roster makes the new-session choice noisy;
- add an “按预设” grouping mode to the existing sidebar view options, shaped like “按工作区” and reusing its styling and behavior as far as practical;
- manage preset display order, visibility, display name and description; that order also governs new-session preset ordering;
- hidden presets disappear from new-session choice, render grey at the end of the management list, and remain available to unhide;
- allow changing the default preset through a star on the preset row;
- show the workspace name on session rows;
- starting from a preset should allow workspace choice and then use the ordinary create-conversation flow with workspace and preset preselected for compatibility;
- preserve the ordinary session-row overflow actions, including rename, fork and archive.

Deletion was proposed and then explicitly withdrawn. The current intent therefore does not include deleting presets or cascading deletion of their sessions. The withdrawal is the later decision and governs state.

## Reality tension exposed by the postscript

The user observed that the actual implementation removed the session row `...` surface, making rename, fork and archive unavailable. This is evidence of an implementation mismatch against the desired “按工作区”-like reuse, not a revision removing those actions from intent.
